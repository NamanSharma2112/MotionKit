"use client";

/* The canvas editor: a zoomable artboard with selection, transform handles,
   layers, inspector, align/distribute, clipboard and undo for every change. */

import { useMemo, useRef, useState, useEffect, useSyncExternalStore } from "react";
import {
  BringToFront,
  CopyPlus,
  Lightbulb,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Redo2,
  Scan,
  SendToBack,
  Trash2,
  Undo2,
} from "lucide-react";
import CodePanel from "./CodePanel";
import LayersPanel from "./LayersPanel";
import SelectionOverlay from "./SelectionOverlay";
import { ArtboardPanel, SelectionInspector, StylePanel, type DrawStyle, type FrameField } from "./Inspector";
import { DEFAULT_BOARD, SHORTCUTS, TOOLS, modKey } from "./editorConfig";
import { exportCanvas, snippetSvg, type CodeFormat } from "./exportCode";
import { useHistory, type Board, type Doc } from "./history";
import { renderShape } from "./renderShape";
import {
  SHAPE_LABEL,
  boxCenter,
  boxCorners,
  boxesIntersect,
  hitTest,
  isDegenerate,
  newId,
  normalizeAngle,
  rotatePoint,
  translateShape,
  unionBox,
  worldBounds,
  type Box,
  type Pt,
  type Shape,
  type ToolType,
} from "./shapes";
import {
  alignShapes,
  distributeShapes,
  fitToBox,
  resizeBox,
  rotateShapes,
  selectionFrame,
  type AlignKind,
  type Frame,
  type Handle,
} from "./transform";
import { useCamera, type Cam } from "./useCamera";

type Gesture =
  | { kind: "pan"; sx: number; sy: number; cam: Cam }
  | { kind: "pinch"; dist: number; mid: Pt; cam: Cam }
  | { kind: "draw"; start: Pt }
  | { kind: "brush"; last: Pt }
  | { kind: "erase"; before: Doc }
  | {
      kind: "move";
      before: Doc;
      start: Pt;
      startClient: Pt;
      originals: Shape[];
      box: Box;
      moved: boolean;
      duplicated: boolean;
      collapseTo: string | null;
      restoreIds: string[];
    }
  | { kind: "resize"; before: Doc; handle: Handle; originals: Shape[]; frame: Frame; changed: boolean }
  | { kind: "rotate"; before: Doc; originals: Shape[]; center: Pt; startAngle: number; base: number; changed: boolean }
  | { kind: "marquee"; start: Pt; base: string[] };

const INITIAL: Doc = { shapes: [], board: DEFAULT_BOARD };

const DEFAULT_STYLE: DrawStyle = {
  strokeColor: "#1f6bff",
  useFill: false,
  fillColor: "#c7d7fe",
  strokeWidth: 4,
  strokeDash: "none",
  opacity: 100,
  cornerRadius: 0,
  polygonSides: 5,
  textContent: "Text",
  fontSize: 32,
  fontWeight: "normal",
};

/* Keys typed into fields, or arrows used by a tab list, are not canvas shortcuts. */
const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || !!t.closest("[role=tablist]"));

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
const r2 = (n: number) => Math.round(n * 100) / 100;
const noop = () => () => {};

const ALIGN_KEYS: Record<string, AlignKind> = { KeyA: "left", KeyD: "right", KeyW: "top", KeyS: "bottom", KeyH: "hcenter", KeyV: "vcenter" };

export default function CanvasEditor({ active }: { active: boolean }) {
  const { doc, commit, setLive, record, undo, redo, canUndo, canRedo } = useHistory(INITIAL);
  const { shapes, board } = doc;
  const stageRef = useRef<HTMLDivElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const { cam, size, step, setZoom, fit, setCam } = useCamera(stageRef, board);
  const mod = useSyncExternalStore(noop, modKey, () => "Ctrl");

  const [tool, setTool] = useState<ToolType>("brush");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [style, setStyle] = useState<DrawStyle>(DEFAULT_STYLE);
  const [snap, setSnap] = useState(false);
  const [grid, setGrid] = useState(20);
  const [currentPath, setCurrentPath] = useState("");
  const [preview, setPreview] = useState<Shape | null>(null);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [codeFormat, setCodeFormat] = useState<CodeFormat>("jsx");

  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, Pt>());
  const clipboard = useRef<Shape[]>([]);
  const pasteCount = useRef(0);
  const stageHover = useRef(false);

  /* ── Derived ── */
  const byId = useMemo(() => new Map(shapes.map((s) => [s.id, s])), [shapes]);
  const selection = useMemo(() => shapes.filter((s) => selectedIds.includes(s.id)), [shapes, selectedIds]);
  const frame = useMemo(() => selectionFrame(selection), [selection]);
  const hoverShape = hoverId && !selectedIds.includes(hoverId) ? (byId.get(hoverId) ?? null) : null;
  const output = useMemo(() => exportCanvas(shapes, board), [shapes, board]);
  const showSelection = tool === "select" && selection.length > 0;

  /* ── Helpers ── */
  const snapV = (v: number) => (snap ? Math.round(v / grid) * grid : v);
  const snapP = (p: Pt) => ({ x: snapV(p.x), y: snapV(p.y) });
  const precision = cam.z > 3 ? 100 : 10;
  const q = (v: number) => (snap ? snapV(v) : Math.round(v * precision) / precision);
  const stagePoint = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toWorld = (e: { clientX: number; clientY: number }) => {
    const s = stagePoint(e);
    return { x: (s.x - cam.x) / cam.z, y: (s.y - cam.y) / cam.z };
  };
  const pickable = (s: Shape) => !s.hidden && !s.locked;
  const topHit = (p: Pt) => {
    for (let i = shapes.length - 1; i >= 0; i--) if (pickable(shapes[i]) && hitTest(shapes[i], p.x, p.y, 6 / cam.z)) return shapes[i];
    return null;
  };
  const replaceIn = (d: Doc, next: Shape[]): Doc => {
    const m = new Map(next.map((s) => [s.id, s]));
    return { ...d, shapes: d.shapes.map((s) => m.get(s.id) ?? s) };
  };
  const nameFor = (type: Shape["type"]) => `${SHAPE_LABEL[type]} ${shapes.filter((s) => s.type === type).length + 1}`;
  const look = () => ({ color: style.strokeColor, width: style.strokeWidth, opacity: style.opacity / 100 });
  const fillV = () => (style.useFill ? style.fillColor : "none");
  const offset = () => (snap ? grid : Math.max(1, Math.round(Math.min(board.w, board.h) / 32)));
  const clone = (list: Shape[], d: number) =>
    list.map((s) => ({ ...translateShape(s, d, d), id: newId(), name: `${s.name ?? SHAPE_LABEL[s.type]} copy` }));

  /* ── Actions (each is one undo step) ── */
  const pickTool = (t: ToolType) => {
    setTool(t);
    setHoverId(null);
  };
  const clearAll = () => {
    if (!shapes.length) return;
    commit((d) => ({ ...d, shapes: [] }));
    setSelectedIds([]);
  };
  const deleteSelected = () => {
    if (!selection.length) return;
    const ids = new Set(selection.map((s) => s.id));
    commit((d) => ({ ...d, shapes: d.shapes.filter((s) => !ids.has(s.id)) }));
    setSelectedIds([]);
  };
  const insertCopies = (copies: Shape[]) => {
    commit((d) => ({ ...d, shapes: [...d.shapes, ...copies] }));
    setSelectedIds(copies.map((c) => c.id));
    setTool("select");
  };
  const duplicate = () => {
    if (selection.length) insertCopies(clone(selection, offset()));
  };
  const copy = () => {
    if (!selection.length) return;
    clipboard.current = selection;
    pasteCount.current = 0;
    navigator.clipboard?.writeText(snippetSvg(selection, board)).catch(() => {});
  };
  const paste = () => {
    if (!clipboard.current.length) return;
    pasteCount.current += 1;
    insertCopies(clone(clipboard.current, offset() * pasteCount.current));
  };
  const selectAll = () => {
    setSelectedIds(shapes.filter(pickable).map((s) => s.id));
    setTool("select");
  };
  const moveLayer = (dir: 1 | -1) => {
    if (!selection.length) return;
    const sel = new Set(selectedIds);
    const next = [...shapes];
    if (dir > 0) {
      for (let i = next.length - 2; i >= 0; i--)
        if (sel.has(next[i].id) && !sel.has(next[i + 1].id)) [next[i], next[i + 1]] = [next[i + 1], next[i]];
    } else {
      for (let i = 1; i < next.length; i++) if (sel.has(next[i].id) && !sel.has(next[i - 1].id)) [next[i], next[i - 1]] = [next[i - 1], next[i]];
    }
    if (next.some((s, i) => s !== shapes[i])) commit((d) => ({ ...d, shapes: next }));
  };
  const moveToEdge = (dir: 1 | -1) => {
    if (!selection.length) return;
    const sel = new Set(selectedIds);
    const rest = shapes.filter((s) => !sel.has(s.id));
    const picked = shapes.filter((s) => sel.has(s.id));
    const next = dir > 0 ? [...rest, ...picked] : [...picked, ...rest];
    if (next.some((s, i) => s !== shapes[i])) commit((d) => ({ ...d, shapes: next }));
  };
  const nudge = (dx: number, dy: number) => {
    if (!selection.length) return;
    commit((d) => replaceIn(d, selection.map((s) => translateShape(s, dx, dy))), "nudge");
  };
  const align = (kind: AlignKind) => {
    if (!selection.length) return;
    const target = selection.length === 1 ? { x: 0, y: 0, w: board.w, h: board.h } : unionBox(selection.map(worldBounds))!;
    commit((d) => replaceIn(d, alignShapes(selection, kind, target)));
  };
  const distribute = (axis: "h" | "v") => {
    if (selection.length >= 3) commit((d) => replaceIn(d, distributeShapes(selection, axis)));
  };
  const setFlag = (ids: string[], key: "hidden" | "locked", value: boolean) => {
    const set = new Set(ids);
    commit((d) => ({ ...d, shapes: d.shapes.map((s) => (set.has(s.id) ? { ...s, [key]: value || undefined } : s)) }));
    if (key === "locked" && value) setSelectedIds((cur) => cur.filter((id) => !set.has(id)));
  };
  const toggleFlag = (id: string, key: "hidden" | "locked") => setFlag([id], key, !byId.get(id)?.[key]);
  const toggleSelectionFlag = (key: "hidden" | "locked") => {
    if (selection.length) setFlag(selectedIds, key, selection.some((s) => !s[key]));
  };
  const rename = (id: string, name: string) => {
    const s = byId.get(id);
    if (!s || !name || name === s.name) return;
    commit((d) => ({ ...d, shapes: d.shapes.map((x) => (x.id === id ? { ...x, name } : x)) }));
  };
  const reorder = (dragId: string, targetId: string, place: "above" | "below") => {
    const moving = byId.get(dragId);
    if (!moving) return;
    const rest = shapes.filter((s) => s.id !== dragId);
    const ti = rest.findIndex((s) => s.id === targetId);
    if (ti < 0) return;
    rest.splice(place === "above" ? ti + 1 : ti, 0, moving);
    if (rest.some((s, i) => s !== shapes[i])) commit((d) => ({ ...d, shapes: rest }));
  };
  const selectFromLayer = (id: string, additive: boolean) => {
    const s = byId.get(id);
    if (!s || s.locked) return;
    setTool("select");
    setSelectedIds((cur) => (additive ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id]));
  };
  const patchSelection = (fn: (s: Shape) => Shape, key?: string) => {
    if (selection.length) commit((d) => replaceIn(d, selection.map(fn)), key);
  };
  const setFrameField = (field: FrameField, value: number, key?: string) => {
    if (!frame) return;
    const b = frame.box;
    if (field === "x" || field === "y") {
      const dx = field === "x" ? value - b.x : 0;
      const dy = field === "y" ? value - b.y : 0;
      commit((d) => replaceIn(d, selection.map((s) => translateShape(s, dx, dy))), key);
      return;
    }
    const next = { ...b, [field]: Math.max(0.1, value) };
    if (selection.length === 1 && selection[0].type === "text") {
      const f = field === "w" ? next.w / b.w : next.h / b.h;
      next.w = b.w * f;
      next.h = b.h * f;
    }
    commit((d) => replaceIn(d, fitToBox(selection, frame, next, { x: b.x, y: b.y })), key);
  };
  const setRotation = (deg: number, key?: string) => {
    const rotation = normalizeAngle(deg) || undefined;
    patchSelection((s) => ({ ...s, rotation }), key);
  };
  const setBoard = (b: Board, presetGrid?: number) => {
    if (b.w === board.w && b.h === board.h) return fit();
    commit((d) => ({ ...d, board: b }));
    if (presetGrid) setGrid(presetGrid);
    const small = Math.max(b.w, b.h) <= 64;
    const wasSmall = Math.max(board.w, board.h) <= 64;
    if (small && !wasSmall) setStyle((s) => ({ ...s, strokeWidth: Math.min(s.strokeWidth, 2), fontSize: Math.min(s.fontSize, 8) }));
    if (!small && wasSmall) setStyle((s) => ({ ...s, strokeWidth: Math.max(s.strokeWidth, 4), fontSize: Math.max(s.fontSize, 32) }));
    fit();
  };
  const trimToContent = () => {
    const visible = shapes.filter((s) => !s.hidden);
    const u = unionBox(visible.map(worldBounds));
    if (!u) return;
    const pad = Math.max(0, ...visible.map((s) => ("width" in s ? s.width / 2 : 0)));
    const x = Math.floor(u.x - pad);
    const y = Math.floor(u.y - pad);
    const w = Math.max(1, Math.ceil(u.x + u.w + pad) - x);
    const h = Math.max(1, Math.ceil(u.y + u.h + pad) - y);
    commit((d) => ({ board: { w, h }, shapes: d.shapes.map((s) => translateShape(s, -x, -y)) }));
    fit();
  };

  /* ── Pointer handling ── */
  const cancelGesture = () => {
    const g = gesture.current;
    if (g && "before" in g) setLive(g.before);
    gesture.current = null;
    setCurrentPath("");
    setPreview(null);
    setMarquee(null);
    setPanning(false);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse") pointers.current.clear();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && e.pointerType === "touch") {
      cancelGesture();
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: stagePoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }), cam };
      return;
    }
    if (pointers.current.size > 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.button === 1 || (e.button === 0 && (spaceHeld || tool === "hand"))) {
      e.preventDefault();
      gesture.current = { kind: "pan", sx: e.clientX, sy: e.clientY, cam };
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;
    const p = toWorld(e);

    if (tool === "select") {
      const handle = (e.target as Element).closest?.("[data-handle]")?.getAttribute("data-handle");
      if (handle && frame) {
        if (handle === "rotate") {
          const center = boxCenter(selection.length === 1 ? worldBounds(selection[0]) : frame.box);
          gesture.current = {
            kind: "rotate",
            before: doc,
            originals: selection,
            center,
            startAngle: (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI,
            base: selection.length === 1 ? (selection[0].rotation ?? 0) : 0,
            changed: false,
          };
        } else {
          gesture.current = { kind: "resize", before: doc, handle: handle as Handle, originals: selection, frame, changed: false };
        }
        return;
      }

      const hit = topHit(p);
      const insideFrame = !hit && frame && selection.length > 1 && boxesIntersect({ ...p, w: 0, h: 0 }, frame.box);
      if (hit || insideFrame) {
        let ids = selectedIds.filter((id) => byId.has(id));
        let collapseTo: string | null = null;
        if (hit && e.shiftKey) {
          if (ids.includes(hit.id)) {
            setSelectedIds(ids.filter((id) => id !== hit.id));
            return;
          }
          ids = [...ids, hit.id];
        } else if (hit && !ids.includes(hit.id)) {
          ids = [hit.id];
        } else if (hit && ids.length > 1) {
          collapseTo = hit.id; // a click (no drag) on a member narrows the selection to it
        }
        setSelectedIds(ids);
        let originals = shapes.filter((s) => ids.includes(s.id) && !s.locked);
        let before = doc;
        let duplicated = false;
        if (e.altKey && originals.length) {
          const copies = clone(originals, 0);
          setLive((d) => ({ ...d, shapes: [...d.shapes, ...copies] }));
          setSelectedIds(copies.map((c) => c.id));
          before = doc;
          originals = copies;
          duplicated = true;
        }
        gesture.current = {
          kind: "move",
          before,
          start: p,
          startClient: { x: e.clientX, y: e.clientY },
          originals,
          box: unionBox(originals.map(worldBounds)) ?? { x: p.x, y: p.y, w: 0, h: 0 },
          moved: false,
          duplicated,
          collapseTo,
          restoreIds: ids,
        };
        return;
      }

      const base = e.shiftKey ? selectedIds : [];
      if (!e.shiftKey) setSelectedIds([]);
      gesture.current = { kind: "marquee", start: p, base };
      return;
    }

    const sp = snapP(p);
    if (tool === "text") {
      if (!style.textContent.trim()) return;
      const shape: Shape = {
        type: "text",
        id: newId(),
        name: nameFor("text"),
        x: q(sp.x),
        y: q(sp.y),
        content: style.textContent,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.strokeColor,
        opacity: style.opacity / 100,
      };
      commit((d) => ({ ...d, shapes: [...d.shapes, shape] }));
      return;
    }
    if (tool === "eraser") {
      gesture.current = { kind: "erase", before: doc };
      eraseAt(p);
      return;
    }
    if (tool === "brush") {
      gesture.current = { kind: "brush", last: sp };
      setCurrentPath(`M ${q(sp.x)} ${q(sp.y)}`);
      return;
    }
    gesture.current = { kind: "draw", start: { x: q(sp.x), y: q(sp.y) } };
  };

  const eraseAt = (p: Pt) => {
    const pad = 10 / cam.z;
    setLive((d) => {
      const next = d.shapes.filter((s) => !pickable(s) || !hitTest(s, p.x, p.y, pad));
      return next.length === d.shapes.length ? d : { ...d, shapes: next };
    });
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const p = toWorld(e);
    if (coordRef.current) coordRef.current.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;

    if (!g) {
      if (tool === "select" && !spaceHeld) {
        const hit = topHit(p);
        const next = hit ? hit.id : null;
        if (next !== hoverId) setHoverId(next);
      }
      return;
    }

    switch (g.kind) {
      case "pinch": {
        if (pointers.current.size < 2) return;
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mid = stagePoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
        const z = Math.min(100, Math.max(0.02, (g.cam.z * dist) / g.dist));
        const wx = (g.mid.x - g.cam.x) / g.cam.z;
        const wy = (g.mid.y - g.cam.y) / g.cam.z;
        setCam({ z, x: mid.x - wx * z, y: mid.y - wy * z });
        return;
      }
      case "pan":
        setCam({ z: g.cam.z, x: g.cam.x + e.clientX - g.sx, y: g.cam.y + e.clientY - g.sy });
        return;
      case "move": {
        if (!g.moved && Math.hypot(e.clientX - g.startClient.x, e.clientY - g.startClient.y) < 3) return;
        g.moved = true;
        let dx = p.x - g.start.x;
        let dy = p.y - g.start.y;
        if (e.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        if (snap) {
          dx = snapV(g.box.x + dx) - g.box.x;
          dy = snapV(g.box.y + dy) - g.box.y;
        }
        const moved = g.originals.map((s) => translateShape(s, dx, dy));
        setLive((d) => replaceIn(d, moved));
        return;
      }
      case "resize": {
        const { frame: f } = g;
        let local = f.rotation ? rotatePoint(p, boxCenter(f.box), -f.rotation) : p;
        if (snap && !f.rotation) local = snapP(local);
        const textOnly = g.originals.length === 1 && g.originals[0].type === "text";
        const { next, anchor } = resizeBox(f.box, g.handle, local, e.shiftKey || textOnly, 1 / cam.z);
        g.changed = true;
        setLive((d) => replaceIn(d, fitToBox(g.originals, f, next, anchor)));
        return;
      }
      case "rotate": {
        const angle = (Math.atan2(p.y - g.center.y, p.x - g.center.x) * 180) / Math.PI;
        let delta = angle - g.startAngle;
        if (e.shiftKey || snap) delta = Math.round((g.base + delta) / 15) * 15 - g.base;
        g.changed = true;
        setLive((d) => replaceIn(d, rotateShapes(g.originals, g.center, delta)));
        return;
      }
      case "marquee": {
        const box = { x: Math.min(g.start.x, p.x), y: Math.min(g.start.y, p.y), w: Math.abs(p.x - g.start.x), h: Math.abs(p.y - g.start.y) };
        setMarquee(box);
        const hits = shapes.filter((s) => pickable(s) && boxesIntersect(worldBounds(s), box)).map((s) => s.id);
        setSelectedIds([...new Set([...g.base, ...hits])]);
        return;
      }
      case "erase":
        eraseAt(p);
        return;
      case "brush": {
        const sp = snapP(p);
        if (Math.hypot(sp.x - g.last.x, sp.y - g.last.y) < 2 / cam.z) return;
        g.last = sp;
        setCurrentPath((d) => `${d} L ${q(sp.x)} ${q(sp.y)}`);
        return;
      }
      case "draw": {
        const { start } = g;
        const sp = snapP(p);
        let x = q(sp.x);
        let y = q(sp.y);
        const base = { id: "preview", ...look() };
        if (tool === "line") {
          if (e.shiftKey) {
            const a = Math.round(Math.atan2(y - start.y, x - start.x) / (Math.PI / 4)) * (Math.PI / 4);
            const len = Math.hypot(x - start.x, y - start.y);
            x = q(start.x + Math.cos(a) * len);
            y = q(start.y + Math.sin(a) * len);
          }
          setPreview({ type: "line", ...base, x1: start.x, y1: start.y, x2: x, y2: y, dash: style.strokeDash });
          return;
        }
        if (e.shiftKey && (tool === "rect" || tool === "ellipse")) {
          const side = Math.max(Math.abs(x - start.x), Math.abs(y - start.y));
          x = start.x + Math.sign(x - start.x || 1) * side;
          y = start.y + Math.sign(y - start.y || 1) * side;
        }
        const radius = q(Math.hypot(x - start.x, y - start.y));
        if (tool === "rect")
          setPreview({
            type: "rect",
            ...base,
            x: Math.min(start.x, x),
            y: Math.min(start.y, y),
            w: q(Math.abs(x - start.x)),
            h: q(Math.abs(y - start.y)),
            fill: fillV(),
            rx: style.cornerRadius,
          });
        if (tool === "circle") setPreview({ type: "circle", ...base, cx: start.x, cy: start.y, r: radius, fill: fillV() });
        if (tool === "ellipse")
          setPreview({ type: "ellipse", ...base, cx: start.x, cy: start.y, rx: q(Math.abs(x - start.x)), ry: q(Math.abs(y - start.y)), fill: fillV() });
        if (tool === "polygon") setPreview({ type: "polygon", ...base, cx: start.x, cy: start.y, r: radius, sides: style.polygonSides, fill: fillV() });
        return;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      if (pointers.current.size < 2) gesture.current = null;
      return;
    }
    gesture.current = null;
    switch (g.kind) {
      case "pan":
        setPanning(false);
        return;
      case "move":
        if (g.moved) record(g.before);
        else if (g.duplicated) {
          setLive(g.before);
          setSelectedIds(g.restoreIds);
        } else if (g.collapseTo && !e.shiftKey) setSelectedIds([g.collapseTo]);
        return;
      case "resize":
      case "rotate":
        if (g.changed) record(g.before);
        return;
      case "marquee":
        setMarquee(null);
        return;
      case "erase":
        record(g.before);
        return;
      case "brush": {
        if (!currentPath) return;
        // A click without a drag still leaves a dot (round caps on a zero-length segment).
        const d = currentPath.includes("L") ? currentPath : `${currentPath} ${currentPath.replace("M", "L")}`;
        const shape: Shape = { type: "path", id: newId(), name: nameFor("path"), d, dash: style.strokeDash, fill: fillV(), ...look() };
        commit((doc) => ({ ...doc, shapes: [...doc.shapes, shape] }));
        setCurrentPath("");
        return;
      }
      case "draw":
        if (preview && !isDegenerate(preview, 2 / cam.z)) {
          const shape = { ...preview, id: newId(), name: nameFor(preview.type) };
          commit((doc) => ({ ...doc, shapes: [...doc.shapes, shape] }));
        }
        setPreview(null);
        return;
    }
  };

  /* ── Keyboard ── */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (e.code === "Space") {
        if (stageHover.current || gesture.current) {
          e.preventDefault();
          if (!e.repeat) setSpaceHeld(true);
        }
        return;
      }
      if (isMod) {
        if (key === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (key === "y") {
          e.preventDefault();
          redo();
        } else if (e.shiftKey && e.code === "KeyH" && selection.length) {
          e.preventDefault();
          toggleSelectionFlag("hidden");
        } else if (e.shiftKey && e.code === "KeyL" && selection.length) {
          e.preventDefault();
          toggleSelectionFlag("locked");
        } else if (key === "c" && selection.length && !window.getSelection()?.toString()) {
          e.preventDefault();
          copy();
        } else if (key === "x" && selection.length) {
          e.preventDefault();
          copy();
          deleteSelected();
        } else if (key === "v" && clipboard.current.length) {
          e.preventDefault();
          paste();
        } else if (key === "d" && selection.length) {
          e.preventDefault();
          duplicate();
        } else if (key === "a" && shapes.length) {
          e.preventDefault();
          selectAll();
        } else if (e.code === "Backslash") {
          e.preventDefault();
          setPanelOpen((o) => !o);
        }
        return;
      }
      if (e.altKey) {
        const kind = ALIGN_KEYS[e.code];
        if (kind && selection.length) {
          e.preventDefault();
          align(kind);
        }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selection.length) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        if (gesture.current) cancelGesture();
        else setSelectedIds([]);
        return;
      }
      if (e.key.startsWith("Arrow") && selection.length) {
        e.preventDefault();
        const n = e.shiftKey ? 10 : snap ? grid : 1;
        nudge(e.key === "ArrowLeft" ? -n : e.key === "ArrowRight" ? n : 0, e.key === "ArrowUp" ? -n : e.key === "ArrowDown" ? n : 0);
        return;
      }
      if (e.code === "BracketRight") return e.shiftKey ? moveToEdge(1) : moveLayer(1);
      if (e.code === "BracketLeft") return e.shiftKey ? moveToEdge(-1) : moveLayer(-1);
      if (e.shiftKey && e.code === "Digit1") return fit();
      if (e.shiftKey && e.code === "Digit0") return setZoom(1);
      if (key === "=" || key === "+") return step(1);
      if (key === "-" || key === "_") return step(-1);
      if (e.shiftKey) return;
      const t = TOOLS.find((t) => t.shortcut.toLowerCase() === key);
      if (t) pickTool(t.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    const onBlur = () => setSpaceHeld(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  });

  /* ── Render ── */
  const activeTool = TOOLS.find((t) => t.key === tool)!;
  const cursor = panning
    ? "grabbing"
    : spaceHeld || tool === "hand"
      ? "grab"
      : tool === "select"
        ? hoverId && byId.get(hoverId) && !byId.get(hoverId)!.locked
          ? "move"
          : "default"
        : tool === "eraser"
          ? "cell"
          : tool === "text"
            ? "text"
            : "crosshair";

  const gridPath = useMemo(() => {
    if (!snap || grid * cam.z < 6) return "";
    const nx = Math.floor(board.w / grid);
    const ny = Math.floor(board.h / grid);
    if (nx > 400 || ny > 400) return "";
    let d = "";
    for (let i = 1; i <= nx; i++) if (i * grid < board.w) d += `M${i * grid} 0V${board.h}`;
    for (let j = 1; j <= ny; j++) if (j * grid < board.h) d += `M0 ${j * grid}H${board.w}`;
    return d;
  }, [snap, grid, cam.z, board.w, board.h]);

  const art = { x: cam.x, y: cam.y, w: board.w * cam.z, h: board.h * cam.z };
  // The artboard name sits above its top-left corner unless the corner badges are in the way.
  const labelLeft = Math.max(8, art.x);
  const boardLabelVisible = art.y - 20 >= 40 || (art.y - 20 >= 4 && labelLeft > 150 && labelLeft + 170 < size.w - 230);
  const outside = `M0 0H${size.w}V${size.h}H0Z M${art.x} ${art.y}h${art.w}v${art.h}h${-art.w}Z`;

  // Selection size label, under the selection's on-screen bounds.
  let sizeLabel: { x: number; y: number; text: string } | null = null;
  if (showSelection && frame && !marquee) {
    const c = boxCenter(frame.box);
    const pts = boxCorners(frame.box).map((pt) => rotatePoint(pt, c, frame.rotation));
    const bottom = Math.max(...pts.map((pt) => pt.y));
    const cx = (Math.min(...pts.map((pt) => pt.x)) + Math.max(...pts.map((pt) => pt.x))) / 2;
    sizeLabel = { x: cx * cam.z + cam.x, y: bottom * cam.z + cam.y + 8, text: `${r2(frame.box.w)} × ${r2(frame.box.h)}` };
  }

  const tb = (label: string, keys?: string) => (keys ? `${label} (${keys})` : label);
  const selectedIndexes = selection.map((s) => shapes.indexOf(s));

  return (
    <div hidden={!active}>
      <div className="svg-workspace" data-solo={!panelOpen} data-toolbar>
        {/* ── Work area ── */}
        <div className="mk-stack-col gap-3!">
          <div className="mk-toolbar" role="toolbar" aria-label="Drawing tools">
            {TOOLS.map((t) => (
              <button
                key={t.key}
                type="button"
                className="mk-tool"
                data-active={tool === t.key}
                aria-pressed={tool === t.key}
                aria-label={t.label}
                aria-keyshortcuts={t.shortcut}
                title={`${t.label} (${t.shortcut})`}
                onClick={() => pickTool(t.key)}
              >
                {t.icon}
              </button>
            ))}
            <span className="mk-toolbar-sep" />
            <button type="button" className="mk-tool" onClick={undo} disabled={!canUndo} aria-label="Undo" title={tb("Undo", `${mod} Z`)}>
              <Undo2 size={16} />
            </button>
            <button type="button" className="mk-tool" onClick={redo} disabled={!canRedo} aria-label="Redo" title={tb("Redo", `${mod} Shift Z`)}>
              <Redo2 size={16} />
            </button>
            <span className="mk-toolbar-sep" />
            <button type="button" className="mk-tool" onClick={duplicate} disabled={!selection.length} aria-label="Duplicate selection" title={tb("Duplicate", `${mod} D`)}>
              <CopyPlus size={16} />
            </button>
            <button
              type="button"
              className="mk-tool"
              onClick={() => moveLayer(1)}
              disabled={!selection.length || Math.min(...selectedIndexes) === shapes.length - selection.length}
              aria-label="Bring forward"
              title={tb("Bring forward", "], Shift ] to front")}
            >
              <BringToFront size={16} />
            </button>
            <button
              type="button"
              className="mk-tool"
              onClick={() => moveLayer(-1)}
              disabled={!selection.length || Math.max(...selectedIndexes) === selection.length - 1}
              aria-label="Send backward"
              title={tb("Send backward", "[, Shift [ to back")}
            >
              <SendToBack size={16} />
            </button>
            <button type="button" className="mk-tool" onClick={deleteSelected} disabled={!selection.length} aria-label="Delete selection" title={tb("Delete", "Del")}>
              <Trash2 size={16} />
            </button>
            <span className="flex-1" />
            <button type="button" className="mk-tool" onClick={clearAll} disabled={!shapes.length} title="Remove every shape (undoable)">
              Clear
            </button>
            <button
              type="button"
              className="mk-tool max-[959px]:hidden!"
              onClick={() => setPanelOpen((o) => !o)}
              aria-label={panelOpen ? "Hide side panel" : "Show side panel"}
              aria-pressed={!panelOpen}
              title={tb(panelOpen ? "Hide panel" : "Show panel", `${mod} \\`)}
            >
              {panelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>

          <div
            ref={stageRef}
            className="mk-canvas svg-stage w-full select-none"
            onPointerEnter={() => {
              stageHover.current = true;
            }}
            onPointerLeave={() => {
              stageHover.current = false;
              if (coordRef.current) coordRef.current.textContent = "–";
            }}
          >
            <svg
              className="absolute inset-0 block h-full w-full touch-none text-mk-text"
              style={{ cursor }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={() => {
                if (!gesture.current) setHoverId(null);
              }}
              onAuxClick={(e) => e.preventDefault()}
              role="img"
              aria-label={`Drawing canvas, ${board.w} by ${board.h} artboard, ${plural(shapes.length, "shape")}`}
            >
              <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.z})`}>
                <rect
                  width={board.w}
                  height={board.h}
                  fill="var(--mk-surface)"
                  stroke="var(--mk-border-strong)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.08))" }}
                />
                {gridPath && <path d={gridPath} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} vectorEffect="non-scaling-stroke" fill="none" pointerEvents="none" />}
                {shapes.map((s) => (s.hidden ? null : renderShape(s, s.id)))}
                {currentPath &&
                  renderShape(
                    { type: "path", id: "current", d: currentPath, dash: style.strokeDash, fill: fillV(), ...look() },
                    "current",
                  )}
                {preview && renderShape(preview, "preview", true)}
              </g>
              <path d={outside} fillRule="evenodd" fill="var(--mk-surface-2)" fillOpacity={0.6} pointerEvents="none" />
              {boardLabelVisible && (
                <text className="svg-board-label" x={labelLeft} y={art.y - 8}>
                  Artboard · {board.w} × {board.h}
                </text>
              )}
              <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.z})`}>
                <SelectionOverlay
                  z={cam.z}
                  selection={tool === "select" ? selection : []}
                  frame={showSelection ? frame : null}
                  hover={hoverShape}
                  marquee={marquee}
                  handles={showSelection && !marquee}
                />
              </g>
            </svg>

            {sizeLabel && (
              <span className="svg-size-label" style={{ left: sizeLabel.x, top: sizeLabel.y }}>
                {sizeLabel.text}
              </span>
            )}

            {shapes.length === 0 && !currentPath && !preview && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
                <div className="flex flex-col items-center gap-2 text-mk-muted">
                  <span className="grid size-10 place-items-center rounded-xl border border-mk-border bg-mk-surface text-mk-text shadow-mk-sm">
                    {activeTool.icon}
                  </span>
                  <p className="text-[14px] font-medium text-mk-text">
                    {tool === "text" ? "Click anywhere to place text" : tool === "select" || tool === "eraser" || tool === "hand" ? "Nothing here yet" : "Drag to draw"}
                  </p>
                  <p className="hidden text-[12.5px] sm:block">
                    Press <kbd className="mk-kbd">B</kbd> brush, <kbd className="mk-kbd">R</kbd> rectangle, <kbd className="mk-kbd">C</kbd> circle,{" "}
                    <kbd className="mk-kbd">T</kbd> text
                  </p>
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
              <span className="mk-badge">{activeTool.label}</span>
            </div>
            <div className="pointer-events-none absolute right-3 top-3 flex gap-2">
              {selection.length > 0 && <span className="mk-badge max-sm:hidden!">{selection.length} selected</span>}
              <span className="mk-badge">{plural(shapes.length, "shape")}</span>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 max-sm:hidden">
              <span className="mk-badge" aria-hidden>
                <span ref={coordRef}>–</span>
              </span>
            </div>
            <div className="svg-hud bottom-3 right-3" role="group" aria-label="Zoom">
              <button type="button" className="mk-tool" onClick={() => step(-1)} aria-label="Zoom out" title="Zoom out (−)">
                <Minus size={14} />
              </button>
              <button type="button" className="mk-tool svg-zoom-value" onClick={() => setZoom(1)} aria-label="Reset zoom to 100%" title="Zoom to 100% (Shift 0)">
                {Math.round(cam.z * 100)}%
              </button>
              <button type="button" className="mk-tool" onClick={() => step(1)} aria-label="Zoom in" title={`Zoom in (+, or ${mod} wheel)`}>
                <Plus size={14} />
              </button>
              <button type="button" className="mk-tool" onClick={fit} aria-label="Zoom to fit artboard" title="Fit artboard (Shift 1)">
                <Scan size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Side panel ── */}
        {panelOpen && (
          <div className="svg-side">
            {showSelection && frame ? (
              <SelectionInspector
                selection={selection}
                frame={frame}
                mod={mod}
                onPatch={patchSelection}
                onFrame={setFrameField}
                onRotation={setRotation}
                onAlign={align}
                onDistribute={distribute}
                onDuplicate={duplicate}
                onDelete={deleteSelected}
              />
            ) : (
              <StylePanel tool={tool} style={style} onChange={(patch) => setStyle((s) => ({ ...s, ...patch }))} />
            )}
            <LayersPanel
              shapes={shapes}
              selectedIds={tool === "select" ? selectedIds : []}
              hoverId={hoverId}
              mod={mod}
              onSelect={selectFromLayer}
              onHover={setHoverId}
              onToggle={toggleFlag}
              onRename={rename}
              onReorder={reorder}
              onStep={(dir) => moveLayer(dir)}
            />
            <ArtboardPanel board={board} grid={grid} snap={snap} hasShapes={shapes.some((s) => !s.hidden)} onBoard={setBoard} onGrid={setGrid} onSnap={setSnap} onTrim={trimToContent} />
            <div className="mk-tip">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-mk-accent" />
              <div className="min-w-0 flex-1">
                <p className="m-0">
                  <strong>V</strong> selects: drag empty space to marquee, Shift adds. <strong>{mod} wheel</strong> or pinch zooms,{" "}
                  <strong>Space</strong> drag pans. Hover any button for its key.
                </p>
                <details className="svg-shortcuts mt-2">
                  <summary>All shortcuts</summary>
                  <dl>
                  {SHORTCUTS.map((s) => (
                    <div key={s.label} className="contents">
                      <dt>{s.keys.replaceAll("Mod", mod)}</dt>
                      <dd>{s.label}</dd>
                    </div>
                  ))}
                  </dl>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>

      <CodePanel
        formats={[
          { value: "jsx", label: "JSX" },
          { value: "svg", label: "SVG" },
          { value: "react", label: "React" },
        ]}
        format={codeFormat}
        onFormat={setCodeFormat}
        code={output[codeFormat]}
        rawSvg={output.count ? output.svg : ""}
        fileName="motionkit-canvas.svg"
        note={`${board.w} × ${board.h} viewBox · ${plural(output.count, "visible shape")}`}
      />
    </div>
  );
}
