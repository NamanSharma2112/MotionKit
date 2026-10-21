"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, PointerEvent as RPointerEvent, ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Box,
  Check,
  Copy,
  Download,
  Eraser,
  FileBraces,
  FolderOpen,
  Hammer,
  Hand,
  ImageDown,
  Keyboard,
  Maximize,
  PaintBucket,
  Redo2,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  GROUND_DEPTH,
  MAX_Z,
  SHAPES,
  SHAPE_HEIGHT,
  blockPrims,
  cellPath,
  emptyBounds,
  groundPrims,
  isDirectional,
  newId,
  normalizeHex,
  parseScene,
  project,
  rotPoint,
  sceneToSvg,
  serializeScene,
  sortBlocks,
} from "./iso";
import type { Block, Bounds, Dir, Hit, Prim, ShapeType } from "./iso";
import { DEFAULT_EXAMPLE, EXAMPLES } from "./scenes";
import type { Example } from "./scenes";

/* ─── Types & constants ─── */

type Tool = "build" | "paint" | "erase" | "pan";
interface SceneState {
  blocks: Block[];
  grid: number;
  ground: boolean;
}
interface Hist {
  past: SceneState[];
  present: SceneState;
  future: SceneState[];
}
interface View {
  x: number;
  y: number;
  zoom: number;
}
type Target = { kind: "cell"; x: number; y: number } | { kind: "face"; id: string; hit: Hit };
interface Stroke {
  pushed: boolean;
  z0: number | null;
  last: string;
}

const STORAGE_KEY = "motionkit-isometric";
const MAX_HISTORY = 120;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;
const GRID_MIN = 6;
const GRID_MAX = 24;

const TOOLS: { id: Tool; label: string; key: string; Icon: typeof Hammer }[] = [
  { id: "build", label: "Build", key: "B", Icon: Hammer },
  { id: "paint", label: "Paint", key: "P", Icon: PaintBucket },
  { id: "erase", label: "Erase", key: "E", Icon: Eraser },
  { id: "pan", label: "Pan", key: "H", Icon: Hand },
];

const HINTS: Record<Tool, string> = {
  build: "Click to place · drag for a row · Alt-click picks colour",
  paint: "Click or drag over blocks to paint",
  erase: "Click to remove · drag along one level",
  pan: "Drag to move · scroll or pinch to zoom",
};

const SWATCHES = [
  "#1f6bff",
  "#7aa7ff",
  "#38bdf8",
  "#22c55e",
  "#86c95f",
  "#facc15",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#f4ead8",
  "#9ca3af",
  "#2a2d34",
];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const heightOf = (b: Block) => SHAPE_HEIGHT[b.shape];

/* ─── Scene helpers ─── */

function fits(blocks: Block[], x: number, y: number, z: number, h: number) {
  return !blocks.some((b) => b.x === x && b.y === y && b.z < z + h - 1e-6 && z < b.z + heightOf(b) - 1e-6);
}

function columnTop(blocks: Block[], x: number, y: number) {
  let t = 0;
  for (const b of blocks) if (b.x === x && b.y === y) t = Math.max(t, b.z + heightOf(b));
  return t;
}

/** Where a new block of height h goes when the pointer is over target t. */
function buildTarget(t: Target, blocks: Block[], n: number, h: number) {
  let x: number;
  let y: number;
  let z: number;
  if (t.kind === "cell") {
    x = t.x;
    y = t.y;
    z = fits(blocks, x, y, 0, h) ? 0 : columnTop(blocks, x, y);
  } else {
    const b = blocks.find((k) => k.id === t.id);
    if (!b) return null;
    if (t.hit.kind === "top") {
      x = b.x;
      y = b.y;
      z = b.z + heightOf(b);
      if (!fits(blocks, x, y, z, h)) z = columnTop(blocks, x, y);
    } else {
      x = b.x + t.hit.dx;
      y = b.y + t.hit.dy;
      z = b.z;
      if (!fits(blocks, x, y, z, h)) return null;
    }
  }
  if (x < 0 || y < 0 || x >= n || y >= n || z + h > MAX_Z) return null;
  return { x, y, z };
}

const targetKey = (t: Target | null) =>
  !t ? "" : t.kind === "cell" ? `c${t.x},${t.y}` : `f${t.id}:${t.hit.kind === "top" ? "t" : `${t.hit.dx},${t.hit.dy}`}`;

function targetFromElement(node: EventTarget | null): Target | null {
  const el = (node as Element | null)?.closest?.("[data-c],[data-h]");
  if (!el) return null;
  const c = el.getAttribute("data-c");
  if (c) {
    const [x, y] = c.split(",").map(Number);
    return { kind: "cell", x, y };
  }
  const id = el.closest("[data-b]")?.getAttribute("data-b");
  const h = el.getAttribute("data-h");
  if (!id || !h) return null;
  if (h === "t") return { kind: "face", id, hit: { kind: "top" } };
  const [dx, dy] = h.split(",").map(Number);
  return { kind: "face", id, hit: { kind: "side", dx, dy } };
}

/* Per-block primitives are cached on the (immutable) block object. */
const primCache = new WeakMap<Block, { rot: number; n: number; prims: Prim[]; bounds: Bounds }>();
function primsFor(b: Block, rot: number, n: number) {
  const c = primCache.get(b);
  if (c && c.rot === rot && c.n === n) return c;
  const bounds = emptyBounds();
  const prims = blockPrims(b, rot, n, bounds);
  const e = { rot, n, prims, bounds };
  primCache.set(b, e);
  return e;
}

function fitView(blocks: Block[], n: number, rot: number, size: { w: number; h: number }): View {
  const b = emptyBounds();
  const add = (x: number, y: number) => {
    b.minX = Math.min(b.minX, x);
    b.maxX = Math.max(b.maxX, x);
    b.minY = Math.min(b.minY, y);
    b.maxY = Math.max(b.maxY, y);
  };
  for (const [x, y] of [
    [0, 0],
    [n, 0],
    [n, n],
    [0, n],
  ]) {
    const [px, py] = project(x, y, 0, n);
    add(px, py);
  }
  const [, low] = project(n, n, -GROUND_DEPTH, n);
  add(0, low);
  for (const blk of blocks) {
    const e = primsFor(blk, rot, n).bounds;
    add(e.minX, e.minY);
    add(e.maxX, e.maxY);
  }
  const padX = 28;
  const padTop = 56;
  const padBottom = 48;
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxY - b.minY);
  const zoom = clamp(Math.min((size.w - padX * 2) / bw, (size.h - padTop - padBottom) / bh), MIN_ZOOM, 2.4);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return { x: -cx * zoom, y: -cy * zoom + (padTop - padBottom) / 2, zoom };
}

function loadInitial(): { scene: SceneState; example: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const json = JSON.parse(raw);
      const s = parseScene(json);
      // The old editor wrote "[]" on every visit; only treat it as a choice in the new format.
      if (s && (s.blocks.length || !Array.isArray(json))) {
        const ex = typeof json?.example === "string" && EXAMPLES.some((e) => e.id === json.example) ? json.example : null;
        return { scene: { blocks: s.blocks, grid: s.grid, ground: s.ground }, example: ex };
      }
    }
  } catch {
    /* fall through to the default scene */
  }
  const ex = EXAMPLES.find((e) => e.id === DEFAULT_EXAMPLE) ?? EXAMPLES[0];
  const s = ex.make();
  return { scene: { blocks: s.blocks, grid: s.grid, ground: s.ground }, example: ex.id };
}

let thumbCache: Record<string, string> | null = null;
function exampleThumbs() {
  if (!thumbCache) {
    thumbCache = {};
    for (const ex of EXAMPLES) {
      const s = ex.make();
      const { svg } = sceneToSvg(s.blocks, 0, s.grid, false, 4);
      thumbCache[ex.id] = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
    }
  }
  return thumbCache;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─── Small views ─── */

const BlockView = memo(function BlockView({
  id,
  prims,
  state,
  anim,
}: {
  id: string;
  prims: Prim[];
  state?: "erase" | "paint";
  anim?: "drop" | "fade";
}) {
  return (
    <g data-b={id} data-state={state} className={anim ? `iso-block iso-${anim}` : "iso-block"}>
      {prims.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill}
          stroke={p.fill}
          strokeWidth={0.6}
          strokeLinejoin="round"
          data-h={p.hit.kind === "top" ? "t" : `${p.hit.dx},${p.hit.dy}`}
        />
      ))}
    </g>
  );
});

const CellsLayer = memo(function CellsLayer({ n, rot }: { n: number; rot: number }) {
  const cells: ReactNode[] = [];
  for (let x = 0; x < n; x++)
    for (let y = 0; y < n; y++) cells.push(<path key={`${x},${y}`} d={cellPath(x, y, rot, n)} className="iso-cell" data-c={`${x},${y}`} />);
  return <g>{cells}</g>;
});

function SwapIcon({ on, icon }: { on: boolean; icon: ReactNode }) {
  return (
    <span className="mk-swap" data-state={on ? "b" : "a"}>
      <span className="mk-swap-a grid place-items-center">{icon}</span>
      <Check size={14} className="mk-swap-b" />
    </span>
  );
}

function ToolButton({
  label,
  tip,
  onClick,
  disabled,
  active,
  children,
  align,
  className = "",
}: {
  label: string;
  tip: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  align?: "end";
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`mk-tool iso-tip ${className}`}
      data-tip={tip}
      data-tip-align={align}
      data-active={active}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* ─── Editor ─── */

export default function Editor() {
  const reduced = useReducedMotion();
  const [init] = useState(loadInitial);
  const [hist, setHistState] = useState<Hist>(() => ({ past: [], present: init.scene, future: [] }));
  const histRef = useRef(hist);
  const [exampleId, setExampleId] = useState<string | null>(init.example);

  const [tool, setTool] = useState<Tool>("build");
  const [shape, setShape] = useState<ShapeType>("cube");
  const [dir, setDir] = useState<Dir>(0);
  const [color, setColor] = useState("#1f6bff");
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [rot, setRot] = useState(0);
  const [view, setView] = useState<View | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<Target | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const [fading, setFading] = useState<Block[]>([]);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isMac] = useState(() => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));

  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const strokeRef = useRef<Stroke | null>(null);
  const panRef = useRef<{ last: { x: number; y: number }; pinch: { mid: { x: number; y: number }; dist: number } | null } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const tapRef = useRef<{ id: number; x: number; y: number; target: Target | null } | null>(null);
  const coalesceRef = useRef<{ key: string; t: number } | null>(null);
  const overStageRef = useRef(false);
  const timersRef = useRef<Record<string, number>>({});

  const { blocks, grid, ground } = hist.present;
  const mod = isMac ? "⌘" : "Ctrl+";

  /* ─── Derived ─── */
  const autoView = useMemo(() => (size.w ? fitView(blocks, grid, rot, size) : null), [blocks, grid, rot, size]);
  const v: View = view ?? autoView ?? { x: 0, y: 0, zoom: 1 };

  const live = useRef({ v, size });
  useLayoutEffect(() => {
    live.current = { v, size };
  });

  const fadingIds = useMemo(() => new Set(fading.map((b) => b.id)), [fading]);
  const drawList = useMemo(() => {
    const ids = new Set(blocks.map((b) => b.id));
    return sortBlocks([...blocks, ...fading.filter((b) => !ids.has(b.id))], rot, grid);
  }, [blocks, fading, rot, grid]);

  const groundP = useMemo(
    () => groundPrims(grid, emptyBounds(), { top: "var(--iso-ground-top)", left: "var(--iso-ground-left)", right: "var(--iso-ground-right)" }),
    [grid],
  );

  const interacting = panning || spaceHeld || tool === "pan";
  const hoverBlock = hover?.kind === "face" ? blocks.find((b) => b.id === hover.id) : undefined;

  const ghost = useMemo(() => {
    if (tool !== "build" || !hover || interacting) return null;
    const tg = buildTarget(hover, blocks, grid, SHAPE_HEIGHT[shape]);
    if (!tg) return null;
    const blk: Block = { id: "ghost", ...tg, color, shape };
    if (isDirectional(shape)) blk.dir = dir;
    const prims = blockPrims(blk, rot, grid, emptyBounds());
    const foot = [
      [tg.x, tg.y],
      [tg.x + 1, tg.y],
      [tg.x + 1, tg.y + 1],
      [tg.x, tg.y + 1],
    ]
      .map(([x, y], i) => {
        const [X, Y] = rotPoint(x, y, rot, grid);
        const [px, py] = project(X, Y, tg.z, grid);
        return `${i ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`;
      })
      .join("");
    return { prims, foot: foot + "Z" };
  }, [tool, hover, interacting, blocks, grid, shape, color, dir, rot]);

  const paintPrims = useMemo(
    () => (tool === "paint" && hoverBlock && !interacting ? blockPrims({ ...hoverBlock, color }, rot, grid, emptyBounds()) : null),
    [tool, hoverBlock, interacting, color, rot, grid],
  );

  const shapeIcons = useMemo(() => {
    const vb = emptyBounds();
    blockPrims({ id: "i", x: 0, y: 0, z: 0, color, shape: "cube" }, 0, 1, vb);
    const viewBox = `${vb.minX - 2} ${vb.minY - 2} ${vb.maxX - vb.minX + 4} ${vb.maxY - vb.minY + 4}`;
    return SHAPES.map((s) => ({
      ...s,
      viewBox,
      prims: blockPrims({ id: "i", x: 0, y: 0, z: 0, color, shape: s.id, dir: s.directional ? dir : undefined }, rot, 1, emptyBounds()),
    }));
  }, [color, dir, rot]);

  const [thumbs] = useState(exampleThumbs);

  /* ─── History ─── */
  const commit = useCallback((fn: (s: SceneState) => SceneState, opts: { coalesce?: string; example?: string } = {}) => {
    const h = histRef.current;
    const next = fn(h.present);
    if (next === h.present) return false;
    let push = true;
    const st = strokeRef.current;
    if (st) {
      if (st.pushed) push = false;
      else st.pushed = true;
    }
    const now = performance.now();
    if (opts.coalesce) {
      const c = coalesceRef.current;
      if (c && c.key === opts.coalesce && now - c.t < 1000) push = false;
      coalesceRef.current = { key: opts.coalesce, t: now };
    } else coalesceRef.current = null;
    const nh: Hist = { past: push ? [...h.past, h.present].slice(-MAX_HISTORY) : h.past, present: next, future: [] };
    histRef.current = nh;
    setHistState(nh);
    setExampleId(opts.example ?? null);
    return true;
  }, []);

  const undo = useCallback(() => {
    const h = histRef.current;
    if (!h.past.length) return;
    const nh: Hist = { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
    histRef.current = nh;
    coalesceRef.current = null;
    setHistState(nh);
    setExampleId(null);
    setFresh(new Set());
    setFading([]);
  }, []);

  const redo = useCallback(() => {
    const h = histRef.current;
    if (!h.future.length) return;
    const nh: Hist = { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
    histRef.current = nh;
    coalesceRef.current = null;
    setHistState(nh);
    setExampleId(null);
    setFresh(new Set());
    setFading([]);
  }, []);

  /* ─── View ─── */
  const updateView = useCallback((fn: (v: View) => View) => setView((prev) => fn(prev ?? live.current.v)), []);

  const zoomAt = useCallback(
    (factor: number, px?: number, py?: number) =>
      updateView((cur) => {
        const { w, h } = live.current.size;
        const ax = px ?? w / 2;
        const ay = py ?? h / 2;
        const z = clamp(cur.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        const wx = (ax - w / 2 - cur.x) / cur.zoom;
        const wy = (ay - h / 2 - cur.y) / cur.zoom;
        return { zoom: z, x: ax - w / 2 - wx * z, y: ay - h / 2 - wy * z };
      }),
    [updateView],
  );

  const freezeView = useCallback(() => setView((prev) => prev ?? live.current.v), []);

  /* ─── Editing ─── */
  const later = (key: string, fn: () => void, ms: number) => {
    window.clearTimeout(timersRef.current[key]);
    timersRef.current[key] = window.setTimeout(fn, ms);
  };

  const pick = (t: Target) => {
    if (t.kind !== "face") return;
    const b = histRef.current.present.blocks.find((k) => k.id === t.id);
    if (!b) return;
    setColor(b.color);
    setShape(b.shape);
    if (isDirectional(b.shape)) setDir((b.dir ?? 0) as Dir);
  };

  const applyAt = (t: Target) => {
    const s = histRef.current.present;
    const st = strokeRef.current;
    if (tool === "build") {
      const tg = buildTarget(t, s.blocks, s.grid, SHAPE_HEIGHT[shape]);
      if (!tg) return;
      if (st) {
        if (st.z0 !== null && st.z0 !== tg.z) return;
        st.z0 = tg.z;
      }
      const b: Block = { id: newId(), ...tg, color, shape };
      if (isDirectional(shape)) b.dir = dir;
      commit((sc) => ({ ...sc, blocks: [...sc.blocks, b] }));
      if (!reduced) {
        setFresh((prev) => new Set(prev).add(b.id));
        window.setTimeout(
          () =>
            setFresh((prev) => {
              const n = new Set(prev);
              n.delete(b.id);
              return n;
            }),
          240,
        );
      }
    } else if (t.kind === "face") {
      const b = s.blocks.find((k) => k.id === t.id);
      if (!b) return;
      if (tool === "paint") {
        if (b.color === color) return;
        commit((sc) => ({ ...sc, blocks: sc.blocks.map((k) => (k.id === b.id ? { ...k, color } : k)) }));
      } else if (tool === "erase") {
        if (st) {
          if (st.z0 !== null && st.z0 !== b.z) return;
          st.z0 = b.z;
        }
        commit((sc) => ({ ...sc, blocks: sc.blocks.filter((k) => k.id !== b.id) }));
        if (!reduced) {
          setFading((f) => [...f, b]);
          window.setTimeout(() => setFading((f) => f.filter((k) => k !== b)), 150);
        }
      }
    }
  };

  const rel = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    const p = rel(e);
    pointersRef.current.set(e.pointerId, p);
    const wantsPan = tool === "pan" || spaceHeld || e.button === 1 || e.button === 2;
    if (wantsPan || panRef.current) {
      e.preventDefault();
      freezeView();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (!panRef.current) panRef.current = { last: p, pinch: null };
      else panRef.current.pinch = null;
      tapRef.current = null;
      setPanning(true);
      setHover(null);
      return;
    }
    if (e.button !== 0) return;
    const t = targetFromElement(e.target);
    if (e.pointerType === "touch") {
      tapRef.current = { id: e.pointerId, x: p.x, y: p.y, target: t };
      return;
    }
    e.preventDefault();
    if (!t) return;
    if (e.altKey) {
      pick(t);
      return;
    }
    freezeView();
    strokeRef.current = { pushed: false, z0: null, last: targetKey(t) };
    applyAt(t);
  };

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    const p = rel(e);
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, p);
    const pan = panRef.current;
    if (pan) {
      const pts = [...pointersRef.current.values()];
      if (pts.length >= 2) {
        const [a, b] = pts;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        const pr = pan.pinch;
        if (pr) {
          updateView((cur) => {
            const { w, h } = live.current.size;
            const x = cur.x + mid.x - pr.mid.x;
            const y = cur.y + mid.y - pr.mid.y;
            const z = clamp(cur.zoom * (dist / pr.dist), MIN_ZOOM, MAX_ZOOM);
            const wx = (mid.x - w / 2 - x) / cur.zoom;
            const wy = (mid.y - h / 2 - y) / cur.zoom;
            return { zoom: z, x: mid.x - w / 2 - wx * z, y: mid.y - h / 2 - wy * z };
          });
        }
        pan.pinch = { mid, dist };
      } else {
        const dx = p.x - pan.last.x;
        const dy = p.y - pan.last.y;
        updateView((cur) => ({ ...cur, x: cur.x + dx, y: cur.y + dy }));
      }
      pan.last = p;
      return;
    }
    const tap = tapRef.current;
    if (tap && tap.id === e.pointerId && Math.hypot(p.x - tap.x, p.y - tap.y) > 10) tapRef.current = null;
    if (e.pointerType === "touch") return;
    const t = targetFromElement(e.target);
    setHover((prev) => (targetKey(prev) === targetKey(t) ? prev : t));
    const st = strokeRef.current;
    if (st && e.buttons & 1 && t) {
      const k = targetKey(t);
      if (k !== st.last) {
        st.last = k;
        applyAt(t);
      }
    }
  };

  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    const tap = tapRef.current;
    tapRef.current = null;
    if (tap && tap.id === e.pointerId && tap.target && !panRef.current) {
      freezeView();
      applyAt(tap.target);
    }
  };

  // End strokes / pans wherever the pointer is released.
  useEffect(() => {
    const end = (e: PointerEvent) => {
      const ptrs = pointersRef.current;
      ptrs.delete(e.pointerId);
      if (e.type === "pointercancel") tapRef.current = null;
      strokeRef.current = null;
      const pan = panRef.current;
      if (!pan) return;
      if (ptrs.size === 0) {
        panRef.current = null;
        setPanning(false);
      } else {
        pan.pinch = null;
        pan.last = [...ptrs.values()][0];
      }
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  // Measure the stage.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize((s) => (s.w === r.width && s.h === r.height ? s : { w: r.width, h: r.height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Zoom toward the cursor on pinch (browsers report it as ctrl+wheel),
  // Ctrl/⌘+wheel, or any wheel while the Pan tool is active. A plain wheel
  // otherwise scrolls the page, so the canvas never traps scrolling.
  const toolRef = useRef(tool);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && toolRef.current !== "pan") return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= 400;
      zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Persist (debounced).
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, serializeScene(hist.present, exampleId ? { example: exampleId } : undefined));
      } catch {
        /* storage full or blocked */
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [hist.present, exampleId]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => Object.values(timers).forEach((t) => window.clearTimeout(t));
  }, []);

  /* ─── Actions ─── */
  const turn = () => setDir((d) => ((d + 1) & 3) as Dir);
  const rotate = (delta: number) => setRot((r) => (r + delta + 4) & 3);

  const loadExample = (ex: Example) => {
    if (ex.id === exampleId) return;
    const s = ex.make();
    commit(() => ({ blocks: s.blocks, grid: s.grid, ground: s.ground }), { example: ex.id });
    setRot(0);
    setView(null);
  };

  const onClear = () => {
    if (!blocks.length) return;
    if (!confirmClear) {
      setConfirmClear(true);
      later("clear", () => setConfirmClear(false), 3000);
      return;
    }
    window.clearTimeout(timersRef.current.clear);
    setConfirmClear(false);
    commit((s) => ({ ...s, blocks: [] }));
  };

  const minGrid = useMemo(() => blocks.reduce((m, b) => Math.max(m, b.x + 1, b.y + 1), GRID_MIN), [blocks]);
  const setGrid = (n: number) => {
    const g = clamp(Math.round(n), minGrid, GRID_MAX);
    if (commit((s) => (s.grid === g ? s : { ...s, grid: g }), { coalesce: "grid" })) setView(null);
  };

  const flash = (key: string) => {
    setDone(key);
    later("done", () => setDone(null), 1500);
  };

  const exportSvg = () => {
    const { svg } = sceneToSvg(blocks, rot, grid, ground);
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "motionkit-isometric.svg");
    flash("svg");
  };

  const exportPng = async () => {
    const { svg, width, height } = sceneToSvg(blocks, rot, grid, ground);
    const scale = Math.max(1, Math.min(3, 4096 / Math.max(width, height)));
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => {
      if (b) {
        downloadBlob(b, "motionkit-isometric.png");
        flash("png");
      }
    }, "image/png");
  };

  const copySvg = async () => {
    await copyText(sceneToSvg(blocks, rot, grid, ground).svg);
    flash("copy-svg");
  };

  const copyJson = async () => {
    await copyText(serializeScene(hist.present));
    flash("json");
  };

  const importScene = (text: string) => {
    let s = null;
    try {
      s = parseScene(JSON.parse(text));
    } catch {
      s = null;
    }
    if (!s) {
      setImportError("That isn't a scene. Paste JSON from “Copy scene JSON”.");
      return;
    }
    const scene = s;
    commit(() => ({ blocks: scene.blocks, grid: scene.grid, ground: scene.ground }));
    setView(null);
    setImportError(null);
    setImportText("");
    setImportOpen(false);
    flash("import");
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) importScene(await f.text());
  };

  /* ─── Keyboard ─── */
  const onKey = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
      if (k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (k === "y") {
        e.preventDefault();
        redo();
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === " ") {
      if (overStageRef.current) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      return;
    }
    const shapeIdx = "123456".indexOf(k);
    if (shapeIdx >= 0 && k.length === 1) setShape(SHAPES[shapeIdx].id);
    else if (k === "b") setTool("build");
    else if (k === "p") setTool("paint");
    else if (k === "e") setTool("erase");
    else if (k === "h") setTool("pan");
    else if (k === "r") rotate(e.shiftKey ? -1 : 1);
    else if (k === "f") turn();
    else if (k === "g") setShowGrid((g) => !g);
    else if (k === "=" || k === "+") zoomAt(1.2);
    else if (k === "-" || k === "_") zoomAt(1 / 1.2);
    else if (k === "0") setView(null);
    else if (k === "escape") {
      setConfirmClear(false);
      setHover(null);
    } else return;
    e.preventDefault();
  };
  const keyRef = useRef(onKey);
  useLayoutEffect(() => {
    keyRef.current = onKey;
  });
  useEffect(() => {
    const down = (e: KeyboardEvent) => keyRef.current(e);
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") setSpaceHeld(false);
    };
    const blur = () => setSpaceHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  /* ─── Render ─── */
  const canUndo = hist.past.length > 0;
  const canRedo = hist.future.length > 0;
  const directional = isDirectional(shape);
  const cursor = panning ? "grabbing" : interacting ? "grab" : "crosshair";
  const hexShown = hexDraft ?? color;
  const pct = ((grid - GRID_MIN) / (GRID_MAX - GRID_MIN)) * 100;

  return (
    <div className="mk-workspace">
      {/* Work area */}
      <div className="mk-stack-col iso-sticky">
        <div className="mk-toolbar" role="toolbar" aria-label="Editor tools">
          {TOOLS.map((t) => (
            <ToolButton key={t.id} label={`${t.label} (${t.key})`} tip={`${t.label}  ${t.key}`} active={tool === t.id} onClick={() => setTool(t.id)}>
              <t.Icon size={15} />
              <span className="hidden sm:inline">{t.label}</span>
            </ToolButton>
          ))}
          <span className="mk-toolbar-sep" />
          <ToolButton label="Undo" tip={`Undo  ${mod}Z`} onClick={undo} disabled={!canUndo}>
            <Undo2 size={15} />
          </ToolButton>
          <ToolButton label="Redo" tip={`Redo  ${isMac ? "⇧⌘Z" : "Ctrl+Shift+Z"}`} onClick={redo} disabled={!canRedo}>
            <Redo2 size={15} />
          </ToolButton>
          <span className="mk-toolbar-sep" />
          <ToolButton label="Rotate view left" tip="Rotate left  ⇧R" onClick={() => rotate(-1)}>
            <RotateCcw size={15} />
          </ToolButton>
          <ToolButton label="Rotate view right" tip="Rotate right  R" onClick={() => rotate(1)}>
            <RotateCw size={15} />
          </ToolButton>
          <div className="ml-auto flex items-center gap-1">
            <ToolButton label="Zoom out" tip="Zoom out  −" onClick={() => zoomAt(1 / 1.25)} align="end">
              <ZoomOut size={15} />
            </ToolButton>
            <ToolButton label="Zoom in" tip="Zoom in  +" onClick={() => zoomAt(1.25)} align="end">
              <ZoomIn size={15} />
            </ToolButton>
            <ToolButton label="Fit scene" tip="Fit scene  0" onClick={() => setView(null)} align="end">
              <Maximize size={15} />
            </ToolButton>
            <span className="mk-toolbar-sep" />
            <button
              type="button"
              className="mk-tool iso-danger"
              data-confirm={confirmClear}
              aria-label={confirmClear ? "Confirm clear scene" : "Clear scene"}
              disabled={!blocks.length}
              onClick={onClear}
            >
              <Trash2 size={15} />
              <span className={confirmClear ? "" : "hidden sm:inline"}>{confirmClear ? "Confirm" : "Clear"}</span>
            </button>
          </div>
        </div>

        <div
          ref={stageRef}
          className="mk-canvas iso-stage"
          data-grid={showGrid}
          data-pan={tool === "pan"}
          style={{ cursor }}
          onPointerEnter={() => (overStageRef.current = true)}
          onPointerLeave={() => {
            overStageRef.current = false;
            setHover(null);
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg
            className="iso-svg"
            role="img"
            aria-label={`Isometric scene with ${blocks.length} blocks`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {size.w > 0 && (
              <g transform={`translate(${size.w / 2 + v.x} ${size.h / 2 + v.y}) scale(${v.zoom})`}>
                {ground && (
                  <g>
                    {groundP.map((p, i) => (
                      <path key={i} d={p.d} style={{ fill: p.fill }} />
                    ))}
                  </g>
                )}
                <CellsLayer n={grid} rot={rot} />
                <g>
                  {drawList.map((b) => {
                    const isFading = fadingIds.has(b.id);
                    const hovered = !isFading && hoverBlock?.id === b.id && !interacting;
                    const state = hovered && tool === "erase" ? "erase" : hovered && tool === "paint" ? "paint" : undefined;
                    return (
                      <BlockView
                        key={b.id}
                        id={b.id}
                        prims={state === "paint" && paintPrims ? paintPrims : primsFor(b, rot, grid).prims}
                        state={state}
                        anim={isFading ? "fade" : fresh.has(b.id) ? "drop" : undefined}
                      />
                    );
                  })}
                </g>
                {ghost && (
                  <g className="iso-ghost-wrap" style={{ pointerEvents: "none" }}>
                    <path d={ghost.foot} className="iso-ghost-outline" />
                    <g className="iso-ghost">
                      {ghost.prims.map((p, i) => (
                        <path key={i} d={p.d} fill={p.fill} stroke={p.fill} strokeWidth={0.6} strokeLinejoin="round" />
                      ))}
                    </g>
                  </g>
                )}
              </g>
            )}
          </svg>

          <div className="iso-badges left-3 top-3">
            <span className="mk-badge">
              <Box size={12} />
              {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
            </span>
            <span className="mk-badge">
              {grid}×{grid}
            </span>
          </div>
          <div className="iso-badges right-3 top-3">
            <span className="mk-badge">{rot * 90}°</span>
            <span className="mk-badge">{Math.round(v.zoom * 100)}%</span>
          </div>
          <div className="iso-badges iso-hint bottom-3 left-3">
            <span className="mk-badge">{HINTS[tool]}</span>
          </div>

          {blocks.length === 0 && (
            <div className="iso-empty">
              <p className="m-0 max-w-[240px] rounded-xl border border-mk-border bg-mk-surface px-4 py-3 text-center text-[13px] text-mk-muted shadow-mk-sm">
                Empty scene. Tap a tile to place a block, or load an example.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      <aside className="mk-stack-col" aria-label="Scene settings">
        <section className="mk-panel">
          <div className="mk-panel-head">
            <h2 className="mk-panel-title">Examples</h2>
            <span className="text-[12px] text-mk-faint">Undo to go back</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex.id} type="button" className="mk-option" data-active={exampleId === ex.id} onClick={() => loadExample(ex)}>
                <span className="iso-thumb" style={{ backgroundImage: thumbs[ex.id] } as CSSProperties} aria-hidden />
                <span className="mk-option-title">{ex.title}</span>
                <span className="mk-option-desc">{ex.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mk-panel flex flex-col gap-5">
          <div className="mk-field">
            <div className="mk-field-row">
              <h2 className="mk-panel-title">Shape</h2>
              <button
                type="button"
                className="mk-btn mk-btn-ghost mk-btn-sm"
                onClick={turn}
                disabled={!directional}
                aria-label="Turn shape (F)"
                title="Turn shape (F)"
              >
                <RotateCw size={13} /> Turn
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {shapeIcons.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className="mk-option iso-shape"
                  data-active={shape === s.id}
                  onClick={() => setShape(s.id)}
                  title={`${s.label} (${i + 1})`}
                >
                  <svg viewBox={s.viewBox} aria-hidden>
                    {s.prims.map((p, j) => (
                      <path key={j} d={p.d} fill={p.fill} stroke={p.fill} strokeWidth={0.6} strokeLinejoin="round" />
                    ))}
                  </svg>
                  <span className="text-[12px] font-medium text-mk-text">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mk-field">
            <div className="mk-field-row">
              <h2 className="mk-panel-title">Colour</h2>
              <span className="mk-value uppercase">{color}</span>
            </div>
            <div className="iso-swatches flex flex-wrap gap-2" role="radiogroup" aria-label="Block colour">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={c}
                  className="mk-swatch"
                  data-active={color === c}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              <label className="mk-swatch iso-custom" data-active={!SWATCHES.includes(color)} title="Custom colour">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Custom colour" />
              </label>
            </div>
            <input
              className="mk-input font-mono"
              value={hexShown}
              spellCheck={false}
              aria-label="Hex colour"
              onChange={(e) => {
                const s = e.target.value;
                setHexDraft(s);
                if (/^#?[0-9a-f]{6}$/i.test(s.trim())) setColor(normalizeHex(s));
              }}
              onBlur={() => setHexDraft(null)}
            />
          </div>
        </section>

        <section className="mk-panel flex flex-col gap-4">
          <h2 className="mk-panel-title">Environment</h2>
          <label className="mk-field-row cursor-pointer">
            <span>Show grid</span>
            <input type="checkbox" className="mk-check" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          </label>
          <label className="mk-field-row cursor-pointer">
            <span>Ground plate</span>
            <input
              type="checkbox"
              className="mk-check"
              checked={ground}
              onChange={(e) => {
                const on = e.target.checked;
                commit((s) => ({ ...s, ground: on }));
              }}
            />
          </label>
          <div className="mk-field">
            <div className="mk-field-row">
              <span>Grid size</span>
              <span className="mk-value">
                {grid}×{grid}
              </span>
            </div>
            <input
              type="range"
              className="mk-range"
              min={GRID_MIN}
              max={GRID_MAX}
              value={grid}
              style={{ "--p": `${pct}%` } as CSSProperties}
              onChange={(e) => setGrid(Number(e.target.value))}
              aria-label="Grid size"
            />
          </div>
        </section>

        <section className="mk-panel flex flex-col gap-3">
          <h2 className="mk-panel-title">Export</h2>
          <button type="button" className="mk-btn mk-btn-primary w-full justify-center" onClick={exportSvg} disabled={!blocks.length}>
            <SwapIcon on={done === "svg"} icon={<Download size={14} />} /> Download SVG
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm justify-center" onClick={exportPng} disabled={!blocks.length}>
              <SwapIcon on={done === "png"} icon={<ImageDown size={14} />} /> PNG
            </button>
            <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm justify-center" onClick={copySvg} disabled={!blocks.length}>
              <SwapIcon on={done === "copy-svg"} icon={<Copy size={14} />} /> Copy SVG
            </button>
          </div>
          <p className="mk-section-label mt-2 mb-0">Share scene</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm justify-center" onClick={copyJson}>
              <SwapIcon on={done === "json"} icon={<FileBraces size={14} />} /> Copy JSON
            </button>
            <button
              type="button"
              className="mk-btn mk-btn-ghost mk-btn-sm justify-center"
              aria-expanded={importOpen}
              onClick={() => {
                setImportOpen((o) => !o);
                setImportError(null);
              }}
            >
              <SwapIcon on={done === "import"} icon={<Upload size={14} />} /> Import
            </button>
          </div>
          {importOpen && (
            <div className="mk-field">
              <textarea
                className="mk-input iso-textarea"
                placeholder='Paste scene JSON, e.g. {"version":2,"blocks":[…]}'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                aria-label="Scene JSON"
                autoFocus
              />
              {importError && <p className="m-0 text-[12px] text-[#e5484d]">{importError}</p>}
              <div className="flex gap-2">
                <button type="button" className="mk-btn mk-btn-primary mk-btn-sm flex-1 justify-center" onClick={() => importScene(importText)} disabled={!importText.trim()}>
                  Load scene
                </button>
                <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => fileRef.current?.click()}>
                  <FolderOpen size={14} /> File
                </button>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
              </div>
            </div>
          )}
        </section>

        <div className="mk-tip">
          <Keyboard size={16} className="mt-0.5 shrink-0 text-mk-accent" />
          <div>
            <strong>Shortcuts.</strong> <Kbd>B</Kbd> <Kbd>P</Kbd> <Kbd>E</Kbd> <Kbd>H</Kbd> tools, <Kbd>1</Kbd>–<Kbd>6</Kbd> shapes, <Kbd>F</Kbd> turn,{" "}
            <Kbd>R</Kbd> rotate view, <Kbd>{mod}Z</Kbd> undo. Hold <Kbd>Space</Kbd> and drag to pan, <Kbd>{mod.replace("+", "")}</Kbd> + scroll or pinch to zoom, Alt-click a block to pick its colour.
            Your scene saves in this browser.
          </div>
        </div>
      </aside>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="iso-kbd">{children}</kbd>;
}
