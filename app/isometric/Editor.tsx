"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, PointerEvent as RPointerEvent, ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Box,
  BoxSelect,
  Check,
  Copy,
  CopyPlus,
  Download,
  Eraser,
  FileBraces,
  FlipHorizontal2,
  FlipVertical2,
  FolderOpen,
  Hammer,
  Hand,
  ImageDown,
  Keyboard,
  Layers,
  Maximize,
  Minus,
  MousePointer2,
  PaintBucket,
  PanelRightClose,
  PanelRightOpen,
  Plus,
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
  NO_CTX,
  SHAPES,
  SHAPE_HEIGHT,
  blockCtx,
  blockPrims,
  cellPath,
  defsFor,
  defsMarkup,
  emptyBounds,
  groundPrims,
  groundShades,
  indexBlocks,
  isDirectional,
  newId,
  normalizeHex,
  parseScene,
  project,
  rotPoint,
  sceneToSvg,
  serializeScene,
  sortBlocks,
  unproject,
} from "./iso";
import type { Block, Bounds, Dir, Hit, Prim, ShapeType } from "./iso";
import { DEFAULT_EXAMPLE, EXAMPLES } from "./scenes";
import type { Example } from "./scenes";

/* ─── Types & constants ─── */

type Tool = "select" | "build" | "box" | "paint" | "erase" | "pan";
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
interface Pos {
  x: number;
  y: number;
  z: number;
}
interface Mirror {
  x: boolean;
  y: boolean;
}
type Bg = "none" | "light" | "dark";

const STORAGE_KEY = "motionkit-isometric";
const RECENT_KEY = "motionkit-isometric-recent";
const MAX_HISTORY = 120;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;
const GRID_MIN = 6;
const GRID_MAX = 24;
const BOX_MAX = 3000;
const EPS = 1e-6;

const TOOLS: { id: Tool; label: string; key: string; Icon: typeof Hammer }[] = [
  { id: "select", label: "Select", key: "V", Icon: MousePointer2 },
  { id: "build", label: "Build", key: "B", Icon: Hammer },
  { id: "box", label: "Box", key: "X", Icon: BoxSelect },
  { id: "paint", label: "Paint", key: "P", Icon: PaintBucket },
  { id: "erase", label: "Erase", key: "E", Icon: Eraser },
  { id: "pan", label: "Pan", key: "H", Icon: Hand },
];

const HINTS: Record<Tool, string> = {
  select: "Click or drag a box to select · shift adds · drag a selected block to move",
  build: "Click to place · drag for a row · Alt-click picks colour",
  box: "Drag out a rectangle to fill it",
  paint: "Click or drag over blocks to paint",
  erase: "Click to remove · drag along one level",
  pan: "Drag to move · scroll or pinch to zoom",
};

const PALETTES: { id: string; label: string; colors: string[] }[] = [
  {
    id: "kit",
    label: "Kit",
    colors: ["#1f6bff", "#7aa7ff", "#38bdf8", "#22c55e", "#86c95f", "#facc15", "#f97316", "#ef4444", "#ec4899", "#f4ead8", "#9ca3af", "#2a2d34"],
  },
  {
    id: "earth",
    label: "Earth",
    colors: ["#f4ead8", "#e8c98f", "#d8ad6a", "#c99b6a", "#c2672e", "#8a5a3b", "#6b4a33", "#86c95f", "#5aa84f", "#3f8f4a", "#7cc8ef", "#a8a8b0"],
  },
  {
    id: "pastel",
    label: "Pastel",
    colors: ["#ffd6c9", "#ffe4a8", "#fff3b0", "#d6f5c4", "#b8ecd7", "#bde3f7", "#c7d7ff", "#f6cfe4", "#f2e8dc", "#e3e3e8", "#c9ccd6", "#8e94a3"],
  },
  {
    id: "city",
    label: "City",
    colors: ["#e6ecff", "#8fb3ff", "#3b82f6", "#ffcf7d", "#f4a3a3", "#e5484d", "#ffd23f", "#d4d6dc", "#9aa3b5", "#5b5f6a", "#3e4049", "#22252b"],
  },
  {
    id: "mono",
    label: "Mono",
    colors: ["#ffffff", "#ececef", "#d4d4d8", "#b4b4bb", "#8e8e96", "#6b6b73", "#4b4b52", "#33333a", "#232328", "#141417", "#1f6bff", "#ef4444"],
  },
];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const heightOf = (b: Block) => SHAPE_HEIGHT[b.shape];

/* ─── Scene helpers ─── */

function fits(blocks: Block[], x: number, y: number, z: number, h: number) {
  return !blocks.some((b) => b.x === x && b.y === y && b.z < z + h - EPS && z < b.z + heightOf(b) - EPS);
}

function columnTop(blocks: Block[], x: number, y: number) {
  let t = 0;
  for (const b of blocks) if (b.x === x && b.y === y) t = Math.max(t, b.z + heightOf(b));
  return t;
}

/** Where a new block of height h goes when the pointer is over target t. */
function buildTarget(t: Target, blocks: Block[], n: number, h: number, level: number | null): Pos | null {
  let x: number;
  let y: number;
  let z: number;
  if (t.kind === "cell") {
    x = t.x;
    y = t.y;
    if (level !== null) z = level;
    else z = fits(blocks, x, y, 0, h) ? 0 : columnTop(blocks, x, y);
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
    }
  }
  if (level !== null && Math.abs(z - level) > EPS) return null;
  if (!fits(blocks, x, y, z, h)) return null;
  if (x < 0 || y < 0 || x >= n || y >= n || z + h > MAX_Z) return null;
  return { x, y, z };
}

/** Facing after a mirror: flipping x swaps the ±x facings, flipping y the ±y ones. */
function mirrorDir(d: Dir, fx: boolean, fy: boolean): Dir {
  let r = d;
  if (fx && (r === 1 || r === 3)) r = (4 - r) as Dir;
  if (fy && (r === 0 || r === 2)) r = ((r + 2) & 3) as Dir;
  return r;
}

/** A position plus its mirror images. */
function mirrored(x: number, y: number, dir: Dir, n: number, m: Mirror) {
  const out: { x: number; y: number; dir: Dir }[] = [{ x, y, dir }];
  const add = (fx: boolean, fy: boolean) => {
    const p = { x: fx ? n - 1 - x : x, y: fy ? n - 1 - y : y, dir: mirrorDir(dir, fx, fy) };
    if (!out.some((o) => o.x === p.x && o.y === p.y)) out.push(p);
  };
  if (m.x) add(true, false);
  if (m.y) add(false, true);
  if (m.x && m.y) add(true, true);
  return out;
}

/** Keep the candidates that are in bounds and free, against the scene and each other. */
function acceptNew(scene: Block[], cands: Block[], n: number) {
  const placed: Block[] = [];
  const all = [...scene];
  for (const c of cands) {
    const h = heightOf(c);
    if (c.x < 0 || c.y < 0 || c.x >= n || c.y >= n || c.z < 0 || c.z + h > MAX_Z) continue;
    if (!fits(all, c.x, c.y, c.z, h)) continue;
    all.push(c);
    placed.push(c);
  }
  return placed;
}

function makeBlock(p: Pos, shape: ShapeType, color: string, dir: Dir): Block {
  const b: Block = { id: newId(), x: p.x, y: p.y, z: p.z, color, shape };
  if (isDirectional(shape) && dir) b.dir = dir;
  return b;
}

/** Blocks for a box drag from `a` to cell `c`, `height` layers tall, optionally hollow, mirrored. */
function boxBlocks(a: Pos, c: { x: number; y: number }, height: number, hollow: boolean, shape: ShapeType, color: string, dir: Dir, n: number, m: Mirror) {
  const x0 = Math.min(a.x, c.x);
  const x1 = Math.max(a.x, c.x);
  const y0 = Math.min(a.y, c.y);
  const y1 = Math.max(a.y, c.y);
  const H = SHAPE_HEIGHT[shape];
  const shell = hollow && x1 - x0 >= 2 && y1 - y0 >= 2;
  const out: Block[] = [];
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++) {
      if (shell && x > x0 && x < x1 && y > y0 && y < y1) continue;
      for (let k = 0; k < height; k++) {
        const z = a.z + k * H;
        if (z + H > MAX_Z + EPS) break;
        for (const p of mirrored(x, y, dir, n, m)) out.push(makeBlock({ x: p.x, y: p.y, z }, shape, color, p.dir));
        if (out.length >= BOX_MAX) return out;
      }
    }
  return out;
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

/* Per-block primitives are cached on the (immutable) block object, keyed by view and neighbourhood. */
const primCache = new WeakMap<Block, { rot: number; n: number; ctx: number; prims: Prim[] }>();
function primsFor(b: Block, rot: number, n: number, ctx: number) {
  const c = primCache.get(b);
  if (c && c.rot === rot && c.n === n && c.ctx === ctx) return c.prims;
  const prims = blockPrims(b, rot, n, emptyBounds(), ctx);
  primCache.set(b, { rot, n, ctx, prims });
  return prims;
}

function blockBounds(b: Block, rot: number, n: number, out: Bounds) {
  for (const [u, v] of [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ]) {
    const [X, Y] = rotPoint(b.x + u, b.y + v, rot, n);
    for (const z of [b.z, b.z + heightOf(b)]) {
      const [px, py] = project(X, Y, z, n);
      out.minX = Math.min(out.minX, px);
      out.maxX = Math.max(out.maxX, px);
      out.minY = Math.min(out.minY, py);
      out.maxY = Math.max(out.maxY, py);
    }
  }
}

function fitView(blocks: Block[], n: number, rot: number, size: { w: number; h: number }): View {
  const b = emptyBounds();
  for (const [x, y] of [
    [0, 0],
    [n, 0],
    [n, n],
    [0, n],
  ]) {
    const [px, py] = project(x, y, 0, n);
    b.minX = Math.min(b.minX, px);
    b.maxX = Math.max(b.maxX, px);
    b.minY = Math.min(b.minY, py);
    b.maxY = Math.max(b.maxY, py);
  }
  b.maxY = Math.max(b.maxY, project(n, n, -GROUND_DEPTH, n)[1]);
  for (const blk of blocks) blockBounds(blk, rot, n, b);
  const padX = 32;
  const padTop = 64;
  const padBottom = 64;
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

function loadRecent(): string[] {
  try {
    const r = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(r) ? r.filter((c) => typeof c === "string" && /^#[0-9a-f]{6}$/.test(c)).slice(0, 8) : [];
  } catch {
    return [];
  }
}

let thumbCache: Record<string, string> | null = null;
function exampleThumbs() {
  if (!thumbCache) {
    thumbCache = {};
    for (const ex of EXAMPLES) {
      const s = ex.make();
      const { svg } = sceneToSvg(s.blocks, 0, s.grid, { ground: false, pad: 4 });
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

function FacePath({ p }: { p: Prim }) {
  if (p.hit === null) return <path d={p.d} fill={p.fill} transform={p.tf} pointerEvents="none" />;
  return <path d={p.d} fill={p.fill} stroke={p.fill} className="iso-face" data-h={p.hit.kind === "top" ? "t" : `${p.hit.dx},${p.hit.dy}`} />;
}

const BlockView = memo(function BlockView({
  id,
  prims,
  state,
  anim,
  selected,
}: {
  id: string;
  prims: Prim[];
  state?: "erase" | "paint" | "above";
  anim?: "drop" | "fade";
  selected?: boolean;
}) {
  return (
    <g data-b={state === "above" ? undefined : id} data-state={state} className={anim ? `iso-block iso-${anim}` : "iso-block"}>
      {prims.map((p, i) => (
        <FacePath key={i} p={p} />
      ))}
      {selected &&
        prims.map((p, i) => (p.hit ? <path key={`s${i}`} d={p.d} className="iso-sel" /> : null))}
    </g>
  );
});

/** Plain shapes (ghosts, previews): faces only, nothing clickable. */
function Shapes({ prims }: { prims: Prim[] }) {
  return (
    <>
      {prims.map((p, i) =>
        p.hit === null ? (
          <path key={i} d={p.d} fill={p.fill} transform={p.tf} />
        ) : (
          <path key={i} d={p.d} fill={p.fill} stroke={p.fill} className="iso-face" />
        ),
      )}
    </>
  );
}

const CellsLayer = memo(function CellsLayer({ n, rot, z }: { n: number; rot: number; z: number }) {
  const cells: ReactNode[] = [];
  for (let x = 0; x < n; x++)
    for (let y = 0; y < n; y++) cells.push(<path key={`${x},${y}`} d={cellPath(x, y, rot, n, z)} className="iso-cell" data-c={`${x},${y}`} />);
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

function Stepper({ label, value, onDec, onInc, decDisabled, incDisabled }: { label: string; value: ReactNode; onDec: () => void; onInc: () => void; decDisabled?: boolean; incDisabled?: boolean }) {
  return (
    <span className="iso-stepper">
      <button type="button" className="iso-mini" aria-label={`Lower ${label.toLowerCase()}`} onClick={onDec} disabled={decDisabled}>
        <Minus size={13} />
      </button>
      <span className="iso-stepper-value">
        <span className="text-mk-muted">{label}</span> <span className="tabular-nums text-mk-text">{value}</span>
      </span>
      <button type="button" className="iso-mini" aria-label={`Raise ${label.toLowerCase()}`} onClick={onInc} disabled={incDisabled}>
        <Plus size={13} />
      </button>
    </span>
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
  const [paletteId, setPaletteId] = useState(PALETTES[0].id);
  const [recent, setRecent] = useState<string[]>(loadRecent);
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
  const [note, setNote] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isMac] = useState(() => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  const [panelOpen, setPanelOpen] = useState(true);

  // Advanced editing
  const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set());
  const [level, setLevel] = useState<number | null>(null);
  const [mirror, setMirror] = useState<Mirror>({ x: false, y: false });
  const [boxHeight, setBoxHeight] = useState(1);
  const [boxHollow, setBoxHollow] = useState(false);
  const [boxDrag, setBoxDrag] = useState<{ a: Pos; c: { x: number; y: number } } | null>(null);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [moveDelta, setMoveDelta] = useState<[number, number] | null>(null);

  // Export options
  const [expGround, setExpGround] = useState<boolean | null>(null);
  const [expGrid, setExpGrid] = useState(false);
  const [expBg, setExpBg] = useState<Bg>("none");
  const [pngScale, setPngScale] = useState(2);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const strokeRef = useRef<Stroke | null>(null);
  const panRef = useRef<{ last: { x: number; y: number }; pinch: { mid: { x: number; y: number }; dist: number } | null } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const tapRef = useRef<{ id: number; x: number; y: number; target: Target | null } | null>(null);
  const coalesceRef = useRef<{ key: string; t: number } | null>(null);
  const overStageRef = useRef(false);
  const timersRef = useRef<Record<string, number>>({});
  const boxRef = useRef<{ pid: number; a: Pos; c: { x: number; y: number } } | null>(null);
  const marqueeRef = useRef<{ pid: number; x0: number; y0: number; additive: boolean; base: ReadonlySet<string>; clickId: string | null } | null>(null);
  const moveRef = useRef<{ pid: number; p0: { x: number; y: number }; z: number; w0: [number, number]; active: boolean; delta: [number, number]; clickId: string | null } | null>(null);
  const clipRef = useRef<Block[]>([]);

  const { blocks, grid, ground } = hist.present;
  const mod = isMac ? "⌘" : "Ctrl+";
  const exportGround = expGround ?? ground;

  /* ─── Derived ─── */
  const autoView = useMemo(() => (size.w ? fitView(blocks, grid, rot, size) : null), [blocks, grid, rot, size]);
  const v: View = view ?? autoView ?? { x: 0, y: 0, zoom: 1 };

  const live = useRef({ v, size });
  useLayoutEffect(() => {
    live.current = { v, size };
  });

  // Blocks as shown: a selection being dragged is drawn at its new place.
  const shown = useMemo(() => {
    if (!moveDelta || (moveDelta[0] === 0 && moveDelta[1] === 0)) return blocks;
    const [dx, dy] = moveDelta;
    return blocks.map((b) => (selection.has(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b));
  }, [blocks, moveDelta, selection]);

  const isAbove = useCallback((b: Block) => level !== null && b.z > level + EPS, [level]);
  const planeZ = level ?? 0;

  // Neighbourhood shading uses only settled, visible blocks.
  const solidIdx = useMemo(() => indexBlocks(shown.filter((b) => !fresh.has(b.id) && !isAbove(b))), [shown, fresh, isAbove]);

  const fadingIds = useMemo(() => new Set(fading.map((b) => b.id)), [fading]);
  const drawList = useMemo(() => {
    const ids = new Set(shown.map((b) => b.id));
    return sortBlocks([...shown, ...fading.filter((b) => !ids.has(b.id))], rot, grid);
  }, [shown, fading, rot, grid]);

  const groundP = useMemo(
    () => groundPrims(grid, emptyBounds(), { top: "var(--iso-ground-top)", left: "var(--iso-ground-left)", right: "var(--iso-ground-right)" }),
    [grid],
  );
  const groundShadeP = useMemo(() => (ground ? groundShades(solidIdx, rot, grid) : []), [ground, solidIdx, rot, grid]);

  const interacting = panning || spaceHeld || tool === "pan";
  const visibleBlocks = useMemo(() => (level === null ? blocks : blocks.filter((b) => b.z <= level + EPS)), [blocks, level]);
  const hoverBlock = hover?.kind === "face" ? blocks.find((b) => b.id === hover.id) : undefined;

  const ghost = useMemo(() => {
    if (!hover || interacting || boxDrag) return null;
    if (tool !== "build" && tool !== "box") return null;
    const tg = buildTarget(hover, blocks, grid, SHAPE_HEIGHT[shape], level);
    if (!tg) return null;
    const cands = mirrored(tg.x, tg.y, dir, grid, mirror).map((p) => makeBlock({ x: p.x, y: p.y, z: tg.z }, shape, color, p.dir));
    const placed = acceptNew(blocks, cands, grid);
    const prims = sortBlocks(placed, rot, grid).flatMap((b) => blockPrims(b, rot, grid, emptyBounds(), NO_CTX));
    const foot = placed
      .map((b) =>
        [
          [b.x, b.y],
          [b.x + 1, b.y],
          [b.x + 1, b.y + 1],
          [b.x, b.y + 1],
        ]
          .map(([x, y], i) => {
            const [X, Y] = rotPoint(x, y, rot, grid);
            const [px, py] = project(X, Y, b.z, grid);
            return `${i ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`;
          })
          .join("") + "Z",
      )
      .join("");
    return { prims, foot };
  }, [tool, hover, interacting, boxDrag, blocks, grid, shape, color, dir, rot, level, mirror]);

  const boxPreview = useMemo(() => {
    if (!boxDrag) return null;
    const cands = boxBlocks(boxDrag.a, boxDrag.c, boxHeight, boxHollow, shape, color, dir, grid, mirror);
    const placed = acceptNew(blocks, cands, grid);
    return { blocks: placed, prims: sortBlocks(placed, rot, grid).flatMap((b) => blockPrims(b, rot, grid, emptyBounds(), NO_CTX)) };
  }, [boxDrag, boxHeight, boxHollow, shape, color, dir, grid, mirror, blocks, rot]);

  const paintPrims = useMemo(() => {
    if (tool !== "paint" || !hoverBlock || interacting) return null;
    return blockPrims({ ...hoverBlock, color }, rot, grid, emptyBounds(), blockCtx(hoverBlock, solidIdx, ground));
  }, [tool, hoverBlock, interacting, color, rot, grid, solidIdx, ground]);

  // Gradients: occlusion plus one body gradient per cylinder colour on screen.
  const defs = useMemo(() => {
    const ids = new Set(["iso-ao", "iso-ao-r"]);
    const cyl = (c: string) => {
      const h = normalizeHex(c).slice(1);
      ids.add(`iso-cyl-${h}-l`);
      ids.add(`iso-cyl-${h}-r`);
    };
    for (const b of drawList) if (b.shape === "cylinder") cyl(b.color);
    cyl(color);
    return defsMarkup(ids);
  }, [drawList, color]);

  const shapeIcons = useMemo(() => {
    const vb = emptyBounds();
    blockPrims({ id: "i", x: 0, y: 0, z: 0, color, shape: "cube" }, 0, 1, vb);
    const viewBox = `${vb.minX - 2} ${vb.minY - 2} ${vb.maxX - vb.minX + 4} ${vb.maxY - vb.minY + 4}`;
    return SHAPES.map((s) => {
      const prims = blockPrims({ id: "i", x: 0, y: 0, z: 0, color, shape: s.id, dir: s.directional ? dir : undefined }, rot, 1, emptyBounds());
      return { ...s, viewBox, prims, defs: defsFor(prims) };
    });
  }, [color, dir, rot]);

  const [thumbs] = useState(exampleThumbs);

  // Mirror axes drawn on the working plane.
  const mirrorLines = useMemo(() => {
    const seg = (a: [number, number], b: [number, number]) => {
      const [ax, ay] = project(...rotPoint(a[0], a[1], rot, grid), planeZ, grid);
      const [bx, by] = project(...rotPoint(b[0], b[1], rot, grid), planeZ, grid);
      return `M${ax.toFixed(2)},${ay.toFixed(2)}L${bx.toFixed(2)},${by.toFixed(2)}`;
    };
    let d = "";
    if (mirror.x) d += seg([grid / 2, 0], [grid / 2, grid]);
    if (mirror.y) d += seg([0, grid / 2], [grid, grid / 2]);
    return d;
  }, [mirror, rot, grid, planeZ]);

  const maxZ = useMemo(() => blocks.reduce((m, b) => Math.max(m, b.z), 0), [blocks]);

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

  const keepSelection = (s: SceneState) =>
    setSelection((prev) => {
      if (!prev.size) return prev;
      const ids = new Set(s.blocks.map((b) => b.id));
      return new Set([...prev].filter((id) => ids.has(id)));
    });

  const undo = () => {
    const h = histRef.current;
    if (!h.past.length) return;
    const nh: Hist = { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
    histRef.current = nh;
    coalesceRef.current = null;
    setHistState(nh);
    setExampleId(null);
    setFresh(new Set());
    setFading([]);
    keepSelection(nh.present);
  };

  const redo = () => {
    const h = histRef.current;
    if (!h.future.length) return;
    const nh: Hist = { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
    histRef.current = nh;
    coalesceRef.current = null;
    setHistState(nh);
    setExampleId(null);
    setFresh(new Set());
    setFading([]);
    keepSelection(nh.present);
  };

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

  /** Stage pixel → world grid point on the plane at height z. */
  const toWorld = (p: { x: number; y: number }, z: number) => {
    const { v: cv, size: cs } = live.current;
    return unproject((p.x - cs.w / 2 - cv.x) / cv.zoom, (p.y - cs.h / 2 - cv.y) / cv.zoom, z, rot, grid);
  };

  /* ─── Editing ─── */
  const later = (key: string, fn: () => void, ms: number) => {
    window.clearTimeout(timersRef.current[key]);
    timersRef.current[key] = window.setTimeout(fn, ms);
  };

  const say = (msg: string) => {
    setNote(msg);
    later("note", () => setNote(null), 1800);
  };

  const rememberColor = (c: string) =>
    setRecent((prev) => {
      if (prev[0] === c) return prev;
      const next = [c, ...prev.filter((k) => k !== c)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
      return next;
    });

  const markFresh = (ids: string[]) => {
    if (reduced || !ids.length) return;
    setFresh((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => n.add(id));
      return n;
    });
    window.setTimeout(
      () =>
        setFresh((prev) => {
          const n = new Set(prev);
          ids.forEach((id) => n.delete(id));
          return n;
        }),
      240,
    );
  };

  const pick = (t: Target) => {
    if (t.kind !== "face") return;
    const b = histRef.current.present.blocks.find((k) => k.id === t.id);
    if (!b) return;
    setColor(b.color);
    setShape(b.shape);
    if (isDirectional(b.shape)) setDir((b.dir ?? 0) as Dir);
  };

  /** Blocks at the mirror images of b (same height), b included. */
  const mirrorTwins = (all: Block[], b: Block) => {
    const spots = mirrored(b.x, b.y, 0, histRef.current.present.grid, mirror);
    return all.filter((k) => spots.some((p) => p.x === k.x && p.y === k.y) && Math.abs(k.z - b.z) < EPS);
  };

  const applyAt = (t: Target) => {
    const s = histRef.current.present;
    const st = strokeRef.current;
    if (tool === "build") {
      const tg = buildTarget(t, s.blocks, s.grid, SHAPE_HEIGHT[shape], level);
      if (!tg) return;
      if (st) {
        if (st.z0 !== null && st.z0 !== tg.z) return;
        st.z0 = tg.z;
      }
      const cands = mirrored(tg.x, tg.y, dir, s.grid, mirror).map((p) => makeBlock({ x: p.x, y: p.y, z: tg.z }, shape, color, p.dir));
      const placed = acceptNew(s.blocks, cands, s.grid);
      if (!placed.length) return;
      commit((sc) => ({ ...sc, blocks: [...sc.blocks, ...placed] }));
      rememberColor(color);
      markFresh(placed.map((b) => b.id));
    } else if (t.kind === "face") {
      const b = s.blocks.find((k) => k.id === t.id);
      if (!b || isAbove(b)) return;
      const twins = new Set(mirrorTwins(s.blocks, b).map((k) => k.id));
      if (tool === "paint") {
        if (s.blocks.every((k) => !twins.has(k.id) || k.color === color)) return;
        commit((sc) => ({ ...sc, blocks: sc.blocks.map((k) => (twins.has(k.id) ? { ...k, color } : k)) }));
        rememberColor(color);
      } else if (tool === "erase") {
        if (st) {
          if (st.z0 !== null && st.z0 !== b.z) return;
          st.z0 = b.z;
        }
        const gone = s.blocks.filter((k) => twins.has(k.id));
        commit((sc) => ({ ...sc, blocks: sc.blocks.filter((k) => !twins.has(k.id)) }));
        setSelection((prev) => (gone.some((g) => prev.has(g.id)) ? new Set([...prev].filter((id) => !twins.has(id))) : prev));
        if (!reduced) {
          setFading((f) => [...f, ...gone]);
          window.setTimeout(() => setFading((f) => f.filter((k) => !gone.includes(k))), 150);
        }
      }
    }
  };

  /* Selection: move, duplicate, delete, copy, paste. */
  const selectedBlocks = () => histRef.current.present.blocks.filter((b) => selection.has(b.id));

  /** Shift the selection by (dx, dy, dz) if every moved block stays in bounds and free. */
  const canShift = (sel: Block[], others: Block[], n: number, dx: number, dy: number, dz: number) =>
    sel.every((b) => {
      const x = b.x + dx;
      const y = b.y + dy;
      const z = b.z + dz;
      return x >= 0 && y >= 0 && x < n && y < n && z >= -EPS && z + heightOf(b) <= MAX_Z + EPS && fits(others, x, y, z, heightOf(b));
    });

  const moveSelection = (dx: number, dy: number, dz: number, coalesce = "move") => {
    const s = histRef.current.present;
    const sel = s.blocks.filter((b) => selection.has(b.id));
    if (!sel.length) return false;
    const others = s.blocks.filter((b) => !selection.has(b.id));
    if (!canShift(sel, others, s.grid, dx, dy, dz)) {
      say("No room there");
      return false;
    }
    commit((sc) => ({ ...sc, blocks: sc.blocks.map((b) => (selection.has(b.id) ? { ...b, x: b.x + dx, y: b.y + dy, z: b.z + dz } : b)) }), { coalesce });
    return true;
  };

  /** Place copies of `src` at the first free offset among the candidates; selects them. */
  const placeCopies = (src: Block[], offsets: [number, number, number][], verb: string) => {
    const s = histRef.current.present;
    for (const [dx, dy, dz] of offsets) {
      if (!canShift(src, s.blocks, s.grid, dx, dy, dz)) continue;
      const copies = src.map((b) => ({ ...b, id: newId(), x: b.x + dx, y: b.y + dy, z: b.z + dz }));
      commit((sc) => ({ ...sc, blocks: [...sc.blocks, ...copies] }));
      setSelection(new Set(copies.map((b) => b.id)));
      say(`${verb} ${copies.length} ${copies.length === 1 ? "block" : "blocks"}`);
      return true;
    }
    say("No room to place a copy");
    return false;
  };

  const extent = (src: Block[]) => {
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity,
      z0 = Infinity,
      z1 = -Infinity;
    for (const b of src) {
      x0 = Math.min(x0, b.x);
      x1 = Math.max(x1, b.x + 1);
      y0 = Math.min(y0, b.y);
      y1 = Math.max(y1, b.y + 1);
      z0 = Math.min(z0, b.z);
      z1 = Math.max(z1, b.z + heightOf(b));
    }
    return { x0, x1, y0, y1, z0, z1 };
  };

  /** Offsets beside or on top of a group, nearest first, in view-friendly order. */
  const nearbyOffsets = (src: Block[]): [number, number, number][] => {
    const e = extent(src);
    const w = e.x1 - e.x0;
    const d = e.y1 - e.y0;
    const h = e.z1 - e.z0;
    return [
      [w, 0, 0],
      [0, d, 0],
      [-w, 0, 0],
      [0, -d, 0],
      [0, 0, h],
      [1, 1, 0],
    ];
  };

  const duplicateSelection = () => {
    const sel = selectedBlocks();
    if (sel.length) placeCopies(sel, nearbyOffsets(sel), "Duplicated");
  };

  const deleteSelection = () => {
    if (!selection.size) return;
    const count = selection.size;
    commit((sc) => ({ ...sc, blocks: sc.blocks.filter((b) => !selection.has(b.id)) }));
    setSelection(new Set());
    say(`Deleted ${count} ${count === 1 ? "block" : "blocks"}`);
  };

  const copySelection = (cut = false) => {
    const sel = selectedBlocks();
    if (!sel.length) return;
    clipRef.current = sel.map((b) => ({ ...b }));
    if (cut) {
      commit((sc) => ({ ...sc, blocks: sc.blocks.filter((b) => !selection.has(b.id)) }));
      setSelection(new Set());
    }
    say(`${cut ? "Cut" : "Copied"} ${sel.length} ${sel.length === 1 ? "block" : "blocks"}`);
  };

  const paste = () => {
    const src = clipRef.current;
    if (!src.length) return;
    const s = histRef.current.present;
    const e = extent(src);
    const offsets: [number, number, number][] = [];
    const tg = hover ? buildTarget(hover, s.blocks, s.grid, 1, level) : null;
    if (tg) offsets.push([tg.x - e.x0, tg.y - e.y0, tg.z - e.z0]);
    offsets.push([0, 0, 0], ...nearbyOffsets(src));
    setTool("select");
    placeCopies(src, offsets, "Pasted");
  };

  const selectAll = () => {
    setTool("select");
    setSelection(new Set(visibleBlocks.map((b) => b.id)));
  };

  /* Pointer handling */
  const rel = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  const cancelDrags = () => {
    boxRef.current = null;
    marqueeRef.current = null;
    moveRef.current = null;
    strokeRef.current = null;
    tapRef.current = null;
    setBoxDrag(null);
    setMarquee(null);
    setMoveDelta(null);
  };

  const cellOf = (p: { x: number; y: number }, z: number) => {
    const [wx, wy] = toWorld(p, z);
    return { x: clamp(Math.floor(wx), 0, grid - 1), y: clamp(Math.floor(wy), 0, grid - 1) };
  };

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    const p = rel(e);
    pointersRef.current.set(e.pointerId, p);
    const pinch = e.pointerType === "touch" && pointersRef.current.size >= 2;
    const wantsPan = tool === "pan" || spaceHeld || e.button === 1 || e.button === 2 || pinch;
    if (wantsPan || panRef.current) {
      e.preventDefault();
      if (pinch) cancelDrags();
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

    if (tool === "select") {
      e.preventDefault();
      freezeView();
      e.currentTarget.setPointerCapture(e.pointerId);
      const b = t?.kind === "face" ? blocks.find((k) => k.id === t.id) : undefined;
      if (b) {
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          setSelection((prev) => {
            const n = new Set(prev);
            if (n.has(b.id)) n.delete(b.id);
            else n.add(b.id);
            return n;
          });
          return;
        }
        if (selection.has(b.id)) {
          moveRef.current = { pid: e.pointerId, p0: p, z: b.z, w0: toWorld(p, b.z), active: false, delta: [0, 0], clickId: b.id };
          return;
        }
      }
      // Drag from anywhere else draws a selection box; a plain click picks the block under it.
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      marqueeRef.current = { pid: e.pointerId, x0: p.x, y0: p.y, additive, base: additive ? selection : new Set(), clickId: b?.id ?? null };
      return;
    }

    if (tool === "box") {
      e.preventDefault();
      if (!t) return;
      // A side face with no room beside it starts the box on top of that block instead.
      const a =
        buildTarget(t, blocks, grid, SHAPE_HEIGHT[shape], level) ??
        (t.kind === "face" ? buildTarget({ ...t, hit: { kind: "top" } }, blocks, grid, SHAPE_HEIGHT[shape], level) : null);
      if (!a) return;
      freezeView();
      e.currentTarget.setPointerCapture(e.pointerId);
      boxRef.current = { pid: e.pointerId, a, c: { x: a.x, y: a.y } };
      setBoxDrag({ a, c: { x: a.x, y: a.y } });
      return;
    }

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

    const box = boxRef.current;
    if (box && box.pid === e.pointerId) {
      const c = cellOf(p, box.a.z);
      if (c.x !== box.c.x || c.y !== box.c.y) {
        box.c = c;
        setBoxDrag({ a: box.a, c });
      }
      return;
    }
    const mq = marqueeRef.current;
    if (mq && mq.pid === e.pointerId) {
      setMarquee({ x0: mq.x0, y0: mq.y0, x1: p.x, y1: p.y });
      return;
    }
    const mv = moveRef.current;
    if (mv && mv.pid === e.pointerId) {
      if (!mv.active && Math.hypot(p.x - mv.p0.x, p.y - mv.p0.y) > 4) mv.active = true;
      if (!mv.active) return;
      const [wx, wy] = toWorld(p, mv.z);
      const dx = Math.round(wx - mv.w0[0]);
      const dy = Math.round(wy - mv.w0[1]);
      if (dx === mv.delta[0] && dy === mv.delta[1]) return;
      const sel = blocks.filter((b) => selection.has(b.id));
      const others = blocks.filter((b) => !selection.has(b.id));
      if (canShift(sel, others, grid, dx, dy, 0)) {
        mv.delta = [dx, dy];
        setMoveDelta([dx, dy]);
      }
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
    const box = boxRef.current;
    if (box && box.pid === e.pointerId) {
      boxRef.current = null;
      const s = histRef.current.present;
      const placed = acceptNew(s.blocks, boxBlocks(box.a, box.c, boxHeight, boxHollow, shape, color, dir, s.grid, mirror), s.grid);
      setBoxDrag(null);
      if (placed.length) {
        commit((sc) => ({ ...sc, blocks: [...sc.blocks, ...placed] }));
        rememberColor(color);
        if (placed.length > 1) say(`Placed ${placed.length} blocks`);
      }
      return;
    }
    const mq = marqueeRef.current;
    if (mq && mq.pid === e.pointerId) {
      marqueeRef.current = null;
      setMarquee(null);
      const p = rel(e);
      const x0 = Math.min(mq.x0, p.x);
      const x1 = Math.max(mq.x0, p.x);
      const y0 = Math.min(mq.y0, p.y);
      const y1 = Math.max(mq.y0, p.y);
      if (x1 - x0 < 4 && y1 - y0 < 4) {
        setSelection(mq.clickId ? new Set([mq.clickId]) : mq.additive ? mq.base : new Set());
        return;
      }
      const { v: cv, size: cs } = live.current;
      const next = new Set(mq.base);
      for (const b of visibleBlocks) {
        const [X, Y] = rotPoint(b.x + 0.5, b.y + 0.5, rot, grid);
        const [gx, gy] = project(X, Y, b.z + heightOf(b) / 2, grid);
        const sx = gx * cv.zoom + cs.w / 2 + cv.x;
        const sy = gy * cv.zoom + cs.h / 2 + cv.y;
        if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) next.add(b.id);
      }
      setSelection(next);
      return;
    }
    const mv = moveRef.current;
    if (mv && mv.pid === e.pointerId) {
      moveRef.current = null;
      setMoveDelta(null);
      if (mv.active && (mv.delta[0] || mv.delta[1])) moveSelection(mv.delta[0], mv.delta[1], 0, "");
      else if (!mv.active && mv.clickId) setSelection(new Set([mv.clickId]));
      return;
    }
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
      if (e.type === "pointercancel") {
        tapRef.current = null;
        if (boxRef.current?.pid === e.pointerId) {
          boxRef.current = null;
          setBoxDrag(null);
        }
        if (marqueeRef.current?.pid === e.pointerId) {
          marqueeRef.current = null;
          setMarquee(null);
        }
        if (moveRef.current?.pid === e.pointerId) {
          moveRef.current = null;
          setMoveDelta(null);
        }
      }
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
  const chooseTool = (t: Tool) => {
    setTool(t);
    cancelDrags();
  };

  const stepLevel = (delta: number) =>
    setLevel((l) => {
      if (l === null) return delta < 0 ? Math.max(0, Math.floor(maxZ * 2) / 2) : null;
      const n = Math.round((l + delta * 0.5) * 2) / 2;
      if (n < 0) return 0;
      if (n > maxZ + EPS) return null;
      return n;
    });

  const loadExample = (ex: Example) => {
    if (ex.id === exampleId) return;
    const s = ex.make();
    commit(() => ({ blocks: s.blocks, grid: s.grid, ground: s.ground }), { example: ex.id });
    setSelection(new Set());
    setLevel(null);
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
    setSelection(new Set());
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

  const exportOpts = () => ({
    ground: exportGround,
    grid: expGrid,
    background: expBg === "none" ? null : expBg === "light" ? "#f6f6f7" : "#1b1b1e",
    dark: expBg === "dark",
  });

  const exportSvg = () => {
    const { svg } = sceneToSvg(blocks, rot, grid, exportOpts());
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "motionkit-isometric.svg");
    flash("svg");
  };

  const exportPng = async () => {
    const { svg, width, height } = sceneToSvg(blocks, rot, grid, exportOpts());
    const scale = Math.max(0.25, Math.min(pngScale, 8192 / Math.max(width, height)));
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
    await copyText(sceneToSvg(blocks, rot, grid, exportOpts()).svg);
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
      setImportError("That isn't a scene. Paste JSON from “Copy JSON”.");
      return;
    }
    const scene = s;
    commit(() => ({ blocks: scene.blocks, grid: scene.grid, ground: scene.ground }));
    setSelection(new Set());
    setLevel(null);
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
        if (e.shiftKey) redo();
        else undo();
      } else if (k === "y") redo();
      else if (k === "a") selectAll();
      else if (k === "c" && selection.size) copySelection();
      else if (k === "x" && selection.size) copySelection(true);
      else if (k === "v" && clipRef.current.length) paste();
      else if (k === "d" && selection.size) duplicateSelection();
      else return;
      e.preventDefault();
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
    if (selection.size && e.key.startsWith("Arrow")) {
      // Arrows move the selection in screen directions for the current view.
      let vx = 0;
      let vy = 0;
      let dz = 0;
      if (e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) dz = e.key === "ArrowUp" ? 0.5 : -0.5;
      else if (e.key === "ArrowRight") vx = 1;
      else if (e.key === "ArrowLeft") vx = -1;
      else if (e.key === "ArrowUp") vy = -1;
      else if (e.key === "ArrowDown") vy = 1;
      // Screen-ish directions in the current view → world grid axes.
      const [wx, wy] = rotVecInt(vx, vy, (4 - rot) & 3);
      moveSelection(wx, wy, dz);
      e.preventDefault();
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selection.size) {
      deleteSelection();
      e.preventDefault();
      return;
    }
    const shapeIdx = "123456".indexOf(k);
    if (shapeIdx >= 0 && k.length === 1) setShape(SHAPES[shapeIdx].id);
    else if (k === "v") chooseTool("select");
    else if (k === "b") chooseTool("build");
    else if (k === "x") chooseTool("box");
    else if (k === "p") chooseTool("paint");
    else if (k === "e") chooseTool("erase");
    else if (k === "h") chooseTool("pan");
    else if (k === "m") setMirror((m) => (e.shiftKey ? { ...m, y: !m.y } : { ...m, x: !m.x }));
    else if (k === "[") stepLevel(-1);
    else if (k === "]") stepLevel(1);
    else if (k === "l") setLevel((l) => (l === null ? 0 : null));
    else if (k === "\\") setPanelOpen((o) => !o);
    else if (k === "r") rotate(e.shiftKey ? -1 : 1);
    else if (k === "f") turn();
    else if (k === "g") setShowGrid((g) => !g);
    else if (k === "=" || k === "+") zoomAt(1.2);
    else if (k === "-" || k === "_") zoomAt(1 / 1.2);
    else if (k === "0") setView(null);
    else if (k === "escape") {
      setConfirmClear(false);
      setHover(null);
      cancelDrags();
      setSelection(new Set());
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
  const dragging = !!(boxDrag || marquee || moveDelta);
  const cursor = panning ? "grabbing" : interacting ? "grab" : tool === "select" ? (moveDelta ? "grabbing" : "default") : "crosshair";
  const hexShown = hexDraft ?? color;
  const pct = ((grid - GRID_MIN) / (GRID_MAX - GRID_MIN)) * 100;
  const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
  const touchLocked = tool === "pan" || tool === "box" || tool === "select";
  const levelLabel = level === null ? "All" : String(level);

  const renderBlock = (b: Block) => {
    const isFading = fadingIds.has(b.id);
    const above = isAbove(b);
    const hovered = !isFading && !above && hoverBlock?.id === b.id && !interacting;
    const state = above ? "above" : hovered && tool === "erase" ? "erase" : hovered && tool === "paint" ? "paint" : undefined;
    const ctx = above || isFading ? NO_CTX : blockCtx(b, solidIdx, ground);
    return (
      <BlockView
        key={b.id}
        id={b.id}
        prims={state === "paint" && paintPrims ? paintPrims : primsFor(b, rot, grid, ctx)}
        state={state}
        selected={selection.has(b.id) && !above}
        anim={isFading ? "fade" : fresh.has(b.id) ? "drop" : undefined}
      />
    );
  };
  const below = level === null ? [] : drawList.filter((b) => b.z < planeZ - EPS);
  const onPlane = level === null ? drawList : drawList.filter((b) => b.z >= planeZ - EPS);

  const selCount = selection.size;
  const contextBar = (() => {
    if (tool === "select" && selCount)
      return (
        <div className="iso-bar" role="group" aria-label="Selection">
          <span className="iso-bar-label tabular-nums">{selCount} selected</span>
          <button type="button" className="iso-bar-btn" onClick={duplicateSelection} title={`Duplicate (${mod}D)`}>
            <CopyPlus size={14} /> Duplicate
          </button>
          <button type="button" className="iso-bar-btn" onClick={() => copySelection()} title={`Copy (${mod}C)`}>
            <Copy size={14} /> Copy
          </button>
          <button type="button" className="iso-bar-btn" onClick={deleteSelection} title="Delete (Del)">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      );
    if (tool === "box")
      return (
        <div className="iso-bar" role="group" aria-label="Box options">
          <Stepper
            label="Height"
            value={boxHeight}
            onDec={() => setBoxHeight((h) => Math.max(1, h - 1))}
            onInc={() => setBoxHeight((h) => Math.min(12, h + 1))}
            decDisabled={boxHeight <= 1}
            incDisabled={boxHeight >= 12}
          />
          <label className="iso-bar-btn cursor-pointer">
            <input type="checkbox" className="mk-check" checked={boxHollow} onChange={(e) => setBoxHollow(e.target.checked)} /> Hollow walls
          </label>
        </div>
      );
    return (
      <div className="iso-bar iso-hint" aria-hidden>
        <span className="iso-bar-label">{HINTS[tool]}</span>
      </div>
    );
  })();

  return (
    <div className="iso-workspace" data-panel={panelOpen ? "open" : "closed"}>
      {/* Work area */}
      <div className="mk-stack-col">
        <div className="mk-toolbar" role="toolbar" aria-label="Editor tools">
          {TOOLS.map((t) => (
            <ToolButton key={t.id} label={`${t.label} (${t.key})`} tip={`${t.label}  ${t.key}`} active={tool === t.id} onClick={() => chooseTool(t.id)}>
              <t.Icon size={15} />
              <span className="hidden xl:inline">{t.label}</span>
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
          <ToolButton label="Mirror across X" tip="Mirror X  M" active={mirror.x} onClick={() => setMirror((m) => ({ ...m, x: !m.x }))}>
            <FlipHorizontal2 size={15} />
          </ToolButton>
          <ToolButton label="Mirror across Y" tip="Mirror Y  ⇧M" active={mirror.y} onClick={() => setMirror((m) => ({ ...m, y: !m.y }))}>
            <FlipVertical2 size={15} />
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
            <ToolButton
              label={panelOpen ? "Hide side panel" : "Show side panel"}
              tip={`${panelOpen ? "Hide" : "Show"} panel  \\`}
              onClick={() => setPanelOpen((o) => !o)}
              align="end"
              className="iso-panel-toggle"
            >
              {panelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </ToolButton>
            <button
              type="button"
              className="mk-tool iso-danger"
              data-confirm={confirmClear}
              aria-label={confirmClear ? "Confirm clear scene" : "Clear scene"}
              disabled={!blocks.length}
              onClick={onClear}
            >
              <Trash2 size={15} />
              <span className={confirmClear ? "" : "hidden xl:inline"}>{confirmClear ? "Confirm" : "Clear"}</span>
            </button>
          </div>
        </div>

        <div
          ref={stageRef}
          className="mk-canvas iso-stage"
          data-grid={showGrid}
          data-pan={touchLocked}
          data-level={level !== null}
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
            <defs dangerouslySetInnerHTML={{ __html: defs }} />
            {size.w > 0 && (
              <g transform={`translate(${size.w / 2 + v.x} ${size.h / 2 + v.y}) scale(${v.zoom})`}>
                {ground && (
                  <g>
                    {groundP.map((p, i) => (
                      <path key={i} d={p.d} className="iso-face" style={{ fill: p.fill, stroke: p.fill }} />
                    ))}
                  </g>
                )}
                {level === null && <CellsLayer n={grid} rot={rot} z={0} />}
                <g pointerEvents="none">
                  {groundShadeP.map((p, i) => (
                    <path key={i} d={p.d} fill={p.fill} transform={p.tf} />
                  ))}
                </g>
                <g>{below.map(renderBlock)}</g>
                {level !== null && <CellsLayer n={grid} rot={rot} z={planeZ} />}
                <g>{onPlane.map(renderBlock)}</g>
                {mirrorLines && <path d={mirrorLines} className="iso-mirror" />}
                {ghost && (
                  <g pointerEvents="none">
                    <path d={ghost.foot} className="iso-ghost-outline" />
                    <g className="iso-ghost">
                      <Shapes prims={ghost.prims} />
                    </g>
                  </g>
                )}
                {boxPreview && (
                  <g pointerEvents="none" className="iso-ghost">
                    <Shapes prims={boxPreview.prims} />
                  </g>
                )}
              </g>
            )}
          </svg>

          {marquee && (
            <div
              className="iso-marquee"
              style={{
                left: Math.min(marquee.x0, marquee.x1),
                top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0),
                height: Math.abs(marquee.y1 - marquee.y0),
              }}
            />
          )}

          <div className="iso-badges left-3 top-3">
            <span className="mk-badge">
              <Box size={12} />
              {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
            </span>
            <span className="mk-badge">
              {grid}×{grid}
            </span>
            {boxPreview && boxPreview.blocks.length > 0 && <span className="mk-badge text-mk-text">+{boxPreview.blocks.length}</span>}
          </div>
          <div className="iso-badges right-3 top-3">
            <span className="mk-badge">{rot * 90}°</span>
            <span className="mk-badge">{Math.round(v.zoom * 100)}%</span>
          </div>
          <div className="iso-note" aria-live="polite">
            {note && <span className="mk-badge text-mk-text">{note}</span>}
          </div>
          <div className="iso-overlay bottom-3 left-3" data-hidden={dragging}>
            {contextBar}
          </div>
          <div className="iso-overlay bottom-3 right-3">
            <div className="iso-bar" role="group" aria-label="Edit level">
              <Layers size={14} className="text-mk-muted" aria-hidden />
              <Stepper
                label="Level"
                value={levelLabel}
                onDec={() => stepLevel(-1)}
                onInc={() => stepLevel(1)}
                decDisabled={level === 0 || (level === null && !blocks.length)}
                incDisabled={level === null}
              />
            </div>
          </div>

          {blocks.length === 0 && (
            <div className="iso-empty">
              <p className="m-0 max-w-[260px] rounded-xl border border-mk-border bg-mk-surface px-4 py-3 text-center text-[13px] text-mk-muted shadow-mk-sm">
                Empty scene. Tap a tile to place a block, drag with Box to fill an area, or load an example.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      <aside className="mk-stack-col iso-side" aria-label="Scene settings" hidden={!panelOpen}>
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
                    {s.defs && <defs dangerouslySetInnerHTML={{ __html: s.defs }} />}
                    <Shapes prims={s.prims} />
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
            <div className="mk-chips" role="tablist" aria-label="Palette">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={p.id === palette.id}
                  className="mk-chip iso-chip"
                  data-active={p.id === palette.id}
                  onClick={() => setPaletteId(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="iso-swatches flex flex-wrap gap-2" role="radiogroup" aria-label={`${palette.label} colours`}>
              {palette.colors.map((c) => (
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
              <label className="mk-swatch iso-custom" data-active={!palette.colors.includes(color) && !recent.includes(color)} title="Custom colour">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Custom colour" />
              </label>
            </div>
            {recent.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-[52px] shrink-0 text-[12px] text-mk-muted">Recent</span>
                <div className="iso-swatches flex flex-wrap gap-1.5" role="radiogroup" aria-label="Recent colours">
                  {recent.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={color === c}
                      aria-label={c}
                      className="mk-swatch iso-swatch-sm"
                      data-active={color === c}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
            )}
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

        <section className="mk-panel">
          <div className="mk-panel-head">
            <h2 className="mk-panel-title">Examples</h2>
            <span className="text-[12px] text-mk-faint">Undo to go back</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex.id} type="button" className="mk-option iso-example" data-active={exampleId === ex.id} onClick={() => loadExample(ex)} title={ex.desc}>
                <span className="iso-thumb" style={{ backgroundImage: thumbs[ex.id] } as CSSProperties} aria-hidden />
                <span className="mk-option-title">{ex.title}</span>
              </button>
            ))}
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
          <div className="flex flex-col gap-3">
            <div className="mk-field-row">
              <span>Background</span>
              <div className="mk-chips" role="radiogroup" aria-label="Export background">
                {(
                  [
                    ["none", "None"],
                    ["light", "Light"],
                    ["dark", "Dark"],
                  ] as [Bg, string][]
                ).map(([id, label]) => (
                  <button key={id} type="button" role="radio" aria-checked={expBg === id} className="mk-chip iso-chip" data-active={expBg === id} onClick={() => setExpBg(id)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mk-field-row">
              <span>PNG size</span>
              <div className="mk-chips" role="radiogroup" aria-label="PNG size">
                {[1, 2, 4].map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={pngScale === s} className="mk-chip iso-chip tabular-nums" data-active={pngScale === s} onClick={() => setPngScale(s)}>
                    {s}×
                  </button>
                ))}
              </div>
            </div>
            <label className="mk-field-row cursor-pointer">
              <span>Include ground plate</span>
              <input type="checkbox" className="mk-check" checked={exportGround} onChange={(e) => setExpGround(e.target.checked)} />
            </label>
            <label className="mk-field-row cursor-pointer">
              <span>Include grid lines</span>
              <input type="checkbox" className="mk-check" checked={expGrid} onChange={(e) => setExpGrid(e.target.checked)} />
            </label>
          </div>
          <button type="button" className="mk-btn mk-btn-primary w-full justify-center" onClick={exportSvg} disabled={!blocks.length}>
            <SwapIcon on={done === "svg"} icon={<Download size={14} />} /> Download SVG
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm justify-center" onClick={exportPng} disabled={!blocks.length}>
              <SwapIcon on={done === "png"} icon={<ImageDown size={14} />} /> PNG {pngScale}×
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
            <strong>Shortcuts.</strong> <Kbd>V</Kbd> <Kbd>B</Kbd> <Kbd>X</Kbd> <Kbd>P</Kbd> <Kbd>E</Kbd> <Kbd>H</Kbd> tools, <Kbd>1</Kbd>–<Kbd>6</Kbd> shapes, <Kbd>F</Kbd> turn,{" "}
            <Kbd>R</Kbd> rotate view, <Kbd>M</Kbd> / <Kbd>⇧M</Kbd> mirror, <Kbd>[</Kbd> <Kbd>]</Kbd> level, <Kbd>{mod}Z</Kbd> undo. With a selection: arrows move,{" "}
            <Kbd>⇧↑</Kbd> <Kbd>⇧↓</Kbd> raise or lower, <Kbd>{mod}D</Kbd> duplicate, <Kbd>{mod}C</Kbd> / <Kbd>{mod}V</Kbd> copy and paste, <Kbd>Del</Kbd> delete. Hold{" "}
            <Kbd>Space</Kbd> and drag to pan, <Kbd>{mod.replace("+", "")}</Kbd> + scroll or pinch to zoom, <Kbd>\</Kbd> hides this panel. Your scene saves in this browser.
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Integer vector rotation (view ↔ world). */
function rotVecInt(x: number, y: number, rot: number): [number, number] {
  switch (rot & 3) {
    case 1:
      return [-y, x];
    case 2:
      return [-x, -y];
    case 3:
      return [y, -x];
    default:
      return [x, y];
  }
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="iso-kbd">{children}</kbd>;
}
