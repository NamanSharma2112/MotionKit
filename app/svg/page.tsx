"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BringToFront,
  Brush,
  Circle,
  CopyPlus,
  Download,
  Eraser,
  Image as ImageIcon,
  Lightbulb,
  MousePointer2,
  PenTool,
  Pentagon,
  Redo2,
  SendToBack,
  Square,
  Terminal,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import PageHeader from "../compoents/ui/PageHeader";
import SegmentedTabs from "../compoents/ui/SegmentedTabs";
import MorePlaygrounds from "../compoents/ui/MorePlaygrounds";
import { ColorField, CopyButton, Dropzone, RangeField } from "./controls";
import {
  SHAPE_LABEL,
  VIEW_H,
  VIEW_W,
  hitTest,
  isDegenerate,
  polygonPoints,
  shapeBounds,
  shapeToSvg,
  translateShape,
  type Dash,
  type Shape,
  type ToolType,
} from "./shapes";
import { ASCII_FILTER_DEFS, imageToAscii, vectorizeImage, type AsciiFilter, type VecStyle } from "./imageToSvg";

type Mode = "canvas" | "vectorizer" | "ascii";
type CodeMode = "jsx" | "svg";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const LineIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="19" x2="19" y2="5" />
  </svg>
);
const EllipseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="12" rx="10" ry="6" />
  </svg>
);

const TOOLS: { key: ToolType; label: string; shortcut: string; icon: ReactNode }[] = [
  { key: "select", label: "Select and move", shortcut: "V", icon: <MousePointer2 size={16} /> },
  { key: "brush", label: "Brush", shortcut: "B", icon: <Brush size={16} /> },
  { key: "eraser", label: "Eraser", shortcut: "E", icon: <Eraser size={16} /> },
  { key: "line", label: "Line", shortcut: "L", icon: <LineIcon /> },
  { key: "rect", label: "Rectangle", shortcut: "R", icon: <Square size={16} /> },
  { key: "circle", label: "Circle", shortcut: "C", icon: <Circle size={16} /> },
  { key: "ellipse", label: "Ellipse", shortcut: "O", icon: <EllipseIcon /> },
  { key: "polygon", label: "Polygon", shortcut: "P", icon: <Pentagon size={16} /> },
  { key: "text", label: "Text", shortcut: "T", icon: <Type size={16} /> },
];

const STROKE_SWATCHES = ["#1f6bff", "#0b0b0c", "#ffffff", "#ef4444", "#f59e0b", "#22c55e", "#a855f7"];
const FILL_SWATCHES = ["#c7d7fe", "#fde68a", "#bbf7d0", "#fbcfe8", "#0b0b0c", "#ffffff"];
const DASHES: { value: Dash; label: string }[] = [
  { value: "none", label: "Solid" },
  { value: "10 10", label: "Dashed" },
  { value: "2 8", label: "Dotted" },
];

const GRID = 20;
const HISTORY_LIMIT = 100;

type Interaction =
  | { kind: "draw"; start: { x: number; y: number } }
  | { kind: "erase"; snapshot: Shape[] }
  | { kind: "move"; start: { x: number; y: number }; index: number; original: Shape; snapshot: Shape[]; moved: boolean };

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

const indent = (lines: string[], pad: string) => lines.map((l) => pad + l).join("\n");

export default function SvgStudioPage() {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("canvas");
  const [codeMode, setCodeMode] = useState<CodeMode>("jsx");

  /* ── Canvas state ── */
  const [tool, setTool] = useState<ToolType>("brush");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [past, setPast] = useState<Shape[][]>([]);
  const [future, setFuture] = useState<Shape[][]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [previewShape, setPreviewShape] = useState<Shape | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const [strokeColor, setStrokeColor] = useState("#1f6bff");
  const [useFill, setUseFill] = useState(false);
  const [fillColor, setFillColor] = useState("#c7d7fe");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeDash, setStrokeDash] = useState<Dash>("none");
  const [shapeOpacity, setShapeOpacity] = useState(100);
  const [cornerRadius, setCornerRadius] = useState(0);
  const [polygonSides, setPolygonSides] = useState(5);
  const [textContent, setTextContent] = useState("Text");
  const [fontSize, setFontSize] = useState(32);
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("normal");
  const [snapToGrid, setSnapToGrid] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const interaction = useRef<Interaction | null>(null);

  /* ── Image state (shared by Image to SVG and ASCII pattern) ── */
  const [image, setImage] = useState<{ img: HTMLImageElement; name: string } | null>(null);
  const [vecStyle, setVecStyle] = useState<VecStyle>("pixel");
  const [vecResolution, setVecResolution] = useState(50);
  const [vecQuantize, setVecQuantize] = useState(32);
  const [asciiFilter, setAsciiFilter] = useState<AsciiFilter>("none");
  const [asciiRounding, setAsciiRounding] = useState(0);
  const [asciiOpacity, setAsciiOpacity] = useState(100);

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result !== "string") return;
      const img = new window.Image();
      img.onload = () => setImage({ img, name: file.name });
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Heavy re-sampling follows the sliders without blocking them.
  const deferredRes = useDeferredValue(vecResolution);
  const deferredQuant = useDeferredValue(vecQuantize);
  const vecData = useMemo(
    () => (mode === "vectorizer" && image ? vectorizeImage(image.img, { style: vecStyle, resolution: deferredRes, quantize: deferredQuant }) : ""),
    [mode, image, vecStyle, deferredRes, deferredQuant],
  );
  const asciiData = useMemo(() => (mode === "ascii" && image ? imageToAscii(image.img) : ""), [mode, image]);

  /* ── History ── */
  const commit = (next: Shape[], before: Shape[] = shapes) => {
    setPast((p) => [...p, before].slice(-HISTORY_LIMIT));
    setFuture([]);
    setShapes(next);
  };
  const undo = () => {
    if (!past.length) return;
    setFuture((f) => [shapes, ...f]);
    setShapes(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setSelectedIdx(null);
  };
  const redo = () => {
    if (!future.length) return;
    setPast((p) => [...p, shapes]);
    setShapes(future[0]);
    setFuture((f) => f.slice(1));
    setSelectedIdx(null);
  };
  const clearAll = () => {
    if (!shapes.length) return;
    commit([]);
    setSelectedIdx(null);
  };
  const deleteSelected = () => {
    if (selectedIdx === null) return;
    commit(shapes.filter((_, i) => i !== selectedIdx));
    setSelectedIdx(null);
  };
  const duplicateSelected = () => {
    if (selectedIdx === null || !shapes[selectedIdx]) return;
    commit([...shapes, translateShape(shapes[selectedIdx], 20, 20)]);
    setSelectedIdx(shapes.length);
  };
  const moveLayer = (dir: 1 | -1) => {
    if (selectedIdx === null) return;
    const target = selectedIdx + dir;
    if (target < 0 || target >= shapes.length) return;
    const next = [...shapes];
    [next[selectedIdx], next[target]] = [next[target], next[selectedIdx]];
    commit(next);
    setSelectedIdx(target);
  };
  const nudge = (dx: number, dy: number) => {
    if (selectedIdx === null) return;
    commit(shapes.map((s, i) => (i === selectedIdx ? translateShape(s, dx, dy) : s)));
  };
  const pickTool = (t: ToolType) => {
    setTool(t);
    if (t !== "select") setSelectedIdx(null);
  };

  /* ── Pointer handling ── */
  const snap = (v: number) => (snapToGrid ? Math.round(v / GRID) * GRID : Math.round(v));
  const getCoords = (e: React.PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = Math.max(0, Math.min(VIEW_W, ((e.clientX - rect.left) / rect.width) * VIEW_W));
    const y = Math.max(0, Math.min(VIEW_H, ((e.clientY - rect.top) / rect.height) * VIEW_H));
    return { x: snap(x), y: snap(y) };
  };
  const topHit = (x: number, y: number, pad?: number) => {
    for (let i = shapes.length - 1; i >= 0; i--) if (hitTest(shapes[i], x, y, pad)) return i;
    return -1;
  };
  const style = () => ({ color: strokeColor, width: strokeWidth, opacity: shapeOpacity / 100 });
  const fill = () => (useFill ? fillColor : "none");

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCoords(e);

    if (tool === "select") {
      const found = topHit(x, y);
      setSelectedIdx(found >= 0 ? found : null);
      if (found >= 0) {
        interaction.current = { kind: "move", start: { x, y }, index: found, original: shapes[found], snapshot: shapes, moved: false };
      }
      return;
    }
    if (tool === "text") {
      if (!textContent.trim()) return;
      commit([...shapes, { type: "text", x, y, content: textContent, fontSize, fontWeight, color: strokeColor, opacity: shapeOpacity / 100 }]);
      return;
    }
    if (tool === "eraser") {
      interaction.current = { kind: "erase", snapshot: shapes };
      setShapes((prev) => prev.filter((s) => !hitTest(s, x, y, 10)));
      return;
    }
    interaction.current = { kind: "draw", start: { x, y } };
    if (tool === "brush") setCurrentPath(`M ${x} ${y}`);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const act = interaction.current;
    const { x, y } = getCoords(e);
    if (!act) {
      if (tool === "select") {
        const h = topHit(x, y);
        const next = h >= 0 ? h : null;
        if (next !== hoverIdx) setHoverIdx(next);
      }
      return;
    }
    if (act.kind === "move") {
      const dx = x - act.start.x;
      const dy = y - act.start.y;
      if (dx || dy) act.moved = true;
      const moved = translateShape(act.original, dx, dy);
      setShapes((prev) => prev.map((s, i) => (i === act.index ? moved : s)));
      return;
    }
    if (act.kind === "erase") {
      setShapes((prev) => prev.filter((s) => !hitTest(s, x, y, 10)));
      return;
    }
    const { start } = act;
    const { color, width, opacity } = style();
    switch (tool) {
      case "brush":
        setCurrentPath((p) => `${p} L ${x} ${y}`);
        break;
      case "rect":
        setPreviewShape({
          type: "rect", x: Math.min(start.x, x), y: Math.min(start.y, y), w: Math.abs(x - start.x), h: Math.abs(y - start.y),
          color, width, opacity, fill: fill(), rx: cornerRadius,
        });
        break;
      case "circle":
        setPreviewShape({ type: "circle", cx: start.x, cy: start.y, r: Math.round(Math.hypot(x - start.x, y - start.y)), color, width, opacity, fill: fill() });
        break;
      case "ellipse":
        setPreviewShape({ type: "ellipse", cx: start.x, cy: start.y, rx: Math.abs(x - start.x), ry: Math.abs(y - start.y), color, width, opacity, fill: fill() });
        break;
      case "line":
        setPreviewShape({ type: "line", x1: start.x, y1: start.y, x2: x, y2: y, color, width, opacity, dash: strokeDash });
        break;
      case "polygon":
        setPreviewShape({
          type: "polygon", cx: start.x, cy: start.y, r: Math.round(Math.hypot(x - start.x, y - start.y)), sides: polygonSides,
          color, width, opacity, fill: fill(),
        });
        break;
    }
  };

  const onPointerUp = () => {
    const act = interaction.current;
    interaction.current = null;
    if (!act) return;
    if (act.kind === "move") {
      if (act.moved) {
        setPast((p) => [...p, act.snapshot].slice(-HISTORY_LIMIT));
        setFuture([]);
      }
      return;
    }
    if (act.kind === "erase") {
      if (shapes.length !== act.snapshot.length) {
        setPast((p) => [...p, act.snapshot].slice(-HISTORY_LIMIT));
        setFuture([]);
      }
      return;
    }
    if (tool === "brush" && currentPath) {
      // A click without a drag still leaves a dot (round caps on a zero-length segment).
      const d = currentPath.includes("L") ? currentPath : `${currentPath} ${currentPath.replace("M", "L")}`;
      commit([...shapes, { type: "path", d, dash: strokeDash, fill: fill(), ...style() }]);
      setCurrentPath("");
    } else if (previewShape) {
      if (!isDegenerate(previewShape)) commit([...shapes, previewShape]);
      setPreviewShape(null);
    }
  };

  /* ── Keyboard shortcuts (canvas mode) ── */
  useEffect(() => {
    if (mode !== "canvas") return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && key === "d" && selectedIdx !== null) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod || e.altKey) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdx !== null) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        setSelectedIdx(null);
        return;
      }
      if (e.key.startsWith("Arrow") && selectedIdx !== null) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        nudge(
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0,
        );
        return;
      }
      if (e.key === "]") return moveLayer(1);
      if (e.key === "[") return moveLayer(-1);
      const t = TOOLS.find((t) => t.shortcut.toLowerCase() === key);
      if (t) pickTool(t.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── Code output ── */
  const { code, rawSvg, elementCount } = useMemo(() => {
    const jsx = codeMode === "jsx";
    const open = `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg"`;

    if (mode === "canvas") {
      const live: Shape[] = [...shapes];
      if (previewShape) live.push(previewShape);
      if (currentPath) live.push({ type: "path", d: currentPath, color: strokeColor, width: strokeWidth, dash: strokeDash, fill: useFill ? fillColor : "none", opacity: shapeOpacity / 100 });
      const body = (j: boolean, pad: string) => (live.length ? `${indent(live.map((s) => shapeToSvg(s, j)), pad)}\n` : "");
      const raw = `${open}>\n${body(false, "  ")}</svg>`;
      const jsxCode = `export default function CustomSvg() {\n  return (\n    ${open} className="h-full w-full">\n${body(true, "      ")}    </svg>\n  );\n}`;
      return { code: jsx ? jsxCode : raw, rawSvg: raw, elementCount: shapes.length };
    }

    if (mode === "vectorizer") {
      if (!vecData) return { code: "// Upload an image to generate a vector SVG", rawSvg: "", elementCount: 0 };
      const raw = `${open}>\n${vecData}</svg>`;
      const jsxCode = `export default function VectorSvg() {\n  return (\n    ${open} className="h-full w-full">\n${vecData.replace(/^/gm, "    ").trimEnd()}\n    </svg>\n  );\n}`;
      return { code: jsx ? jsxCode : raw, rawSvg: raw, elementCount: vecData.split("\n").length - 1 };
    }

    if (!asciiData) return { code: "// Upload an image to generate an ASCII SVG pattern", rawSvg: "", elementCount: 0 };
    const filterDef = asciiFilter !== "none" ? `<filter id="ascii-filter">${ASCII_FILTER_DEFS[asciiFilter]}</filter>` : "";
    const clipDef = asciiRounding > 0 ? `<clipPath id="ascii-clip"><rect width="100%" height="100%" rx="${asciiRounding}" /></clipPath>` : "";
    const defs = filterDef || clipDef ? `\n  <defs>${[filterDef, clipDef].filter(Boolean).map((d) => `\n    ${d}`).join("")}\n  </defs>` : "";
    const gAttrs = (j: boolean) =>
      (asciiFilter !== "none" ? ` filter="url(#ascii-filter)"` : "") +
      (asciiRounding > 0 ? (j ? ` clipPath="url(#ascii-clip)"` : ` clip-path="url(#ascii-clip)"`) : "") +
      (asciiOpacity < 100 ? ` opacity="${(asciiOpacity / 100).toFixed(2)}"` : "");
    const raw = `${open} style="color: currentColor;">${defs}\n  <g${gAttrs(false)}>\n${asciiData}  </g>\n</svg>`;
    const jsxCode = `export default function AsciiSvg() {\n  return (\n    ${open} className="h-full w-full text-black dark:text-white">${defs.replace(/\n/g, "\n    ")}\n      <g${gAttrs(true)}>\n${asciiData.replace(/^/gm, "  ").trimEnd()}\n      </g>\n    </svg>\n  );\n}`;
    return { code: jsx ? jsxCode : raw, rawSvg: raw, elementCount: asciiData.split("\n").length - 1 };
  }, [mode, codeMode, shapes, previewShape, currentPath, strokeColor, strokeWidth, strokeDash, useFill, fillColor, shapeOpacity, vecData, asciiData, asciiFilter, asciiRounding, asciiOpacity]);

  const downloadSvg = () => {
    if (!rawSvg) return;
    const url = URL.createObjectURL(new Blob([rawSvg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `motionkit-${mode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Rendering helpers ── */
  const renderShape = (s: Shape, key: string | number, ghost = false) => {
    const common = {
      stroke: "color" in s ? s.color : undefined,
      strokeWidth: "width" in s ? s.width : undefined,
      opacity: ghost ? s.opacity * 0.6 : s.opacity,
    };
    const dash = ghost ? "6 4" : "dash" in s && s.dash !== "none" ? s.dash : undefined;
    switch (s.type) {
      case "path":
        return <path key={key} d={s.d} {...common} fill={s.fill} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" />;
      case "rect":
        return <rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...common} fill={s.fill} strokeDasharray={dash} />;
      case "circle":
        return <circle key={key} cx={s.cx} cy={s.cy} r={s.r} {...common} fill={s.fill} strokeDasharray={dash} />;
      case "ellipse":
        return <ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} fill={s.fill} strokeDasharray={dash} />;
      case "line":
        return <line key={key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...common} strokeDasharray={dash} strokeLinecap="round" />;
      case "polygon":
        return <polygon key={key} points={polygonPoints(s.cx, s.cy, s.r, s.sides)} {...common} fill={s.fill} strokeDasharray={dash} strokeLinejoin="round" />;
      case "text":
        return (
          <text key={key} x={s.x} y={s.y} fontSize={s.fontSize} fill={s.color} fontFamily="sans-serif" fontWeight={s.fontWeight} opacity={s.opacity}>
            {s.content}
          </text>
        );
    }
  };

  const selectionBox = (s: Shape, strong: boolean) => {
    const b = shapeBounds(s);
    const pad = ("width" in s ? s.width / 2 : 0) + 6;
    return (
      <rect
        x={b.x - pad}
        y={b.y - pad}
        width={b.w + pad * 2}
        height={b.h + pad * 2}
        rx={6}
        fill="none"
        stroke="var(--mk-accent)"
        strokeWidth={strong ? 1.5 : 1}
        strokeDasharray={strong ? "5 4" : undefined}
        opacity={strong ? 1 : 0.5}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
    );
  };

  const activeTool = TOOLS.find((t) => t.key === tool)!;
  const selected = selectedIdx !== null ? shapes[selectedIdx] : undefined;
  const cursor =
    tool === "select" ? (hoverIdx !== null ? "cursor-move" : "cursor-default") : tool === "eraser" ? "cursor-cell" : tool === "text" ? "cursor-text" : "cursor-crosshair";
  const panelMotion = {
    initial: { opacity: 0, transform: reduceMotion ? "none" : "translateY(6px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { duration: 0.22, ease: EASE_OUT },
  };
  const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

  return (
    <main className="mk-page">
      <PageHeader
        title="SVG studio"
        description="Draw shapes, vectorize an image or turn it into an ASCII pattern, then copy clean JSX or download the SVG."
      >
        <SegmentedTabs
          label="Studio mode"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setSelectedIdx(null);
          }}
          items={[
            { value: "canvas", label: "Canvas editor", icon: <PenTool size={14} className="hidden sm:block" /> },
            { value: "vectorizer", label: "Image to SVG", icon: <ImageIcon size={14} className="hidden sm:block" /> },
            { value: "ascii", label: "ASCII pattern", icon: <Terminal size={14} className="hidden sm:block" /> },
          ]}
        />
      </PageHeader>

      <div className="mk-workspace">
        {/* ── Work area ── */}
        <div className="mk-stack-col">
          {mode === "canvas" && (
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
              <button type="button" className="mk-tool" onClick={undo} disabled={!past.length} aria-label="Undo" title="Undo (Ctrl/⌘ Z)">
                <Undo2 size={16} />
              </button>
              <button type="button" className="mk-tool" onClick={redo} disabled={!future.length} aria-label="Redo" title="Redo (Ctrl/⌘ Shift Z)">
                <Redo2 size={16} />
              </button>
              <span className="mk-toolbar-sep" />
              <button type="button" className="mk-tool" onClick={duplicateSelected} disabled={!selected} aria-label="Duplicate selection" title="Duplicate (Ctrl/⌘ D)">
                <CopyPlus size={16} />
              </button>
              <button type="button" className="mk-tool" onClick={() => moveLayer(1)} disabled={!selected || selectedIdx === shapes.length - 1} aria-label="Bring forward" title="Bring forward (])">
                <BringToFront size={16} />
              </button>
              <button type="button" className="mk-tool" onClick={() => moveLayer(-1)} disabled={!selected || selectedIdx === 0} aria-label="Send backward" title="Send backward ([)">
                <SendToBack size={16} />
              </button>
              <button type="button" className="mk-tool" onClick={deleteSelected} disabled={!selected} aria-label="Delete selection" title="Delete (Del)">
                <Trash2 size={16} />
              </button>
              <span className="flex-1" />
              <button type="button" className="mk-tool" onClick={clearAll} disabled={!shapes.length} title="Clear canvas">
                Clear
              </button>
            </div>
          )}

          <div className="mk-canvas aspect-video w-full select-none">
            {mode === "canvas" && (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                preserveAspectRatio="none"
                className={`absolute inset-0 block h-full w-full touch-none text-mk-text ${cursor}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={() => setHoverIdx(null)}
                role="img"
                aria-label={`Drawing canvas, ${plural(shapes.length, "shape")}`}
              >
                {snapToGrid && (
                  <g opacity="0.12" pointerEvents="none">
                    {Array.from({ length: VIEW_W / GRID - 1 }, (_, i) => (
                      <line key={`v${i}`} x1={(i + 1) * GRID} y1="0" x2={(i + 1) * GRID} y2={VIEW_H} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    ))}
                    {Array.from({ length: Math.floor(VIEW_H / GRID) }, (_, i) => (
                      <line key={`h${i}`} x1="0" y1={(i + 1) * GRID} x2={VIEW_W} y2={(i + 1) * GRID} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    ))}
                  </g>
                )}
                {shapes.map((s, i) => renderShape(s, i))}
                {currentPath &&
                  renderShape({ type: "path", d: currentPath, color: strokeColor, width: strokeWidth, dash: strokeDash, fill: useFill ? fillColor : "none", opacity: shapeOpacity / 100 }, "current")}
                {previewShape && renderShape(previewShape, "preview", true)}
                {tool === "select" && hoverIdx !== null && hoverIdx !== selectedIdx && shapes[hoverIdx] && selectionBox(shapes[hoverIdx], false)}
                {selected && selectionBox(selected, true)}
              </svg>
            )}

            {mode === "vectorizer" && vecData && (
              <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="pointer-events-none absolute inset-0 h-full w-full">
                <g dangerouslySetInnerHTML={{ __html: vecData }} />
              </svg>
            )}

            {mode === "ascii" && asciiData && (
              <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="pointer-events-none absolute inset-0 h-full w-full text-mk-text">
                <defs>
                  {asciiFilter !== "none" && <filter id="ascii-preview-filter" dangerouslySetInnerHTML={{ __html: ASCII_FILTER_DEFS[asciiFilter] }} />}
                  {asciiRounding > 0 && (
                    <clipPath id="ascii-preview-clip">
                      <rect width="100%" height="100%" rx={asciiRounding} />
                    </clipPath>
                  )}
                </defs>
                <g
                  dangerouslySetInnerHTML={{ __html: asciiData }}
                  filter={asciiFilter !== "none" ? "url(#ascii-preview-filter)" : undefined}
                  clipPath={asciiRounding > 0 ? "url(#ascii-preview-clip)" : undefined}
                  opacity={asciiOpacity / 100}
                />
              </svg>
            )}

            {/* Empty states */}
            {mode === "canvas" && shapes.length === 0 && !currentPath && !previewShape && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
                <div className="flex flex-col items-center gap-2 text-mk-muted">
                  <span className="grid size-10 place-items-center rounded-xl border border-mk-border bg-mk-surface text-mk-text shadow-mk-sm">
                    {activeTool.icon}
                  </span>
                  <p className="text-[14px] font-medium text-mk-text">
                    {tool === "text" ? "Click anywhere to place text" : tool === "select" || tool === "eraser" ? "Nothing here yet" : "Drag to draw"}
                  </p>
                  <p className="hidden text-[12.5px] sm:block">
                    Press <kbd className="mk-kbd">B</kbd> brush, <kbd className="mk-kbd">R</kbd> rectangle, <kbd className="mk-kbd">C</kbd> circle, <kbd className="mk-kbd">T</kbd> text
                  </p>
                </div>
              </div>
            )}
            {mode !== "canvas" && !image && (
              <div className="absolute inset-0 grid place-items-center p-6">
                <div className="w-full max-w-[340px]">
                  <Dropzone onFile={loadImage} hint="PNG, JPG, GIF or WebP. Drop it here or click." />
                </div>
              </div>
            )}

            {/* Corner badges */}
            <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
              {mode === "canvas" && <span className="mk-badge">{activeTool.label}</span>}
              {mode !== "canvas" && image && (
                <span className="mk-badge max-w-[220px]">
                  <span className="min-w-0 truncate">{image.name}</span>
                </span>
              )}
            </div>
            <div className="pointer-events-none absolute right-3 top-3">
              {mode === "canvas" && <span className="mk-badge">{plural(shapes.length, "shape")}</span>}
              {mode === "vectorizer" && vecData && <span className="mk-badge">{plural(elementCount, "element")}</span>}
              {mode === "ascii" && asciiData && <span className="mk-badge">{plural(elementCount, "glyph")}</span>}
            </div>
          </div>
        </div>

        {/* ── Side panel ── */}
        <div className="mk-stack-col">
          {mode === "canvas" && (
            <motion.div key="canvas" {...panelMotion} className="mk-stack-col">
              <section className="mk-panel flex flex-col gap-5">
                <h2 className="mk-panel-title">Style</h2>
                <ColorField label={tool === "text" ? "Text colour" : "Stroke"} value={strokeColor} onChange={setStrokeColor} swatches={STROKE_SWATCHES} />
                {tool !== "text" && tool !== "line" && (
                  <div className="flex flex-col gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-mk-muted">
                      <input type="checkbox" className="mk-check" checked={useFill} onChange={(e) => setUseFill(e.target.checked)} />
                      Fill shapes
                    </label>
                    {useFill && <ColorField label="Fill" value={fillColor} onChange={setFillColor} swatches={FILL_SWATCHES} />}
                  </div>
                )}
                {tool !== "text" && <RangeField label="Stroke width" value={strokeWidth} onChange={setStrokeWidth} min={1} max={40} unit="px" />}
                <RangeField label="Opacity" value={shapeOpacity} onChange={setShapeOpacity} min={10} max={100} unit="%" />
                {(tool === "brush" || tool === "line") && (
                  <div className="mk-field">
                    <p className="mk-section-label mb-0!">Stroke style</p>
                    <div className="mk-chips">
                      {DASHES.map((d) => (
                        <button key={d.value} type="button" className="mk-chip flex-1" data-active={strokeDash === d.value} onClick={() => setStrokeDash(d.value)}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {tool === "rect" && <RangeField label="Corner radius" value={cornerRadius} onChange={setCornerRadius} min={0} max={100} unit="px" />}
                {tool === "polygon" && <RangeField label="Sides" value={polygonSides} onChange={setPolygonSides} min={3} max={12} />}
                {tool === "text" && (
                  <>
                    <div className="mk-field">
                      <label className="mk-section-label mb-0!" htmlFor="svg-text">
                        Text
                      </label>
                      <input id="svg-text" type="text" className="mk-input" value={textContent} onChange={(e) => setTextContent(e.target.value)} />
                    </div>
                    <RangeField label="Font size" value={fontSize} onChange={setFontSize} min={8} max={120} unit="px" />
                    <div className="mk-chips">
                      <button type="button" className="mk-chip flex-1" data-active={fontWeight === "normal"} onClick={() => setFontWeight("normal")}>
                        Regular
                      </button>
                      <button type="button" className="mk-chip flex-1 font-bold!" data-active={fontWeight === "bold"} onClick={() => setFontWeight("bold")}>
                        Bold
                      </button>
                    </div>
                  </>
                )}
                <label className="flex cursor-pointer items-center gap-2 border-t border-mk-border pt-4 text-[12.5px] text-mk-muted">
                  <input type="checkbox" className="mk-check" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
                  Snap to grid ({GRID}px)
                </label>
              </section>

              {selected && (
                <section className="mk-panel">
                  <div className="mk-panel-head">
                    <h2 className="mk-panel-title">Selection</h2>
                    <span className="mk-badge">
                      layer {selectedIdx! + 1}/{shapes.length}
                    </span>
                  </div>
                  <p className="mb-3 text-[13px] text-mk-muted">
                    {SHAPE_LABEL[selected.type]}. Drag to move, arrow keys to nudge.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm justify-center" onClick={duplicateSelected}>
                      <CopyPlus size={14} /> Duplicate
                    </button>
                    <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm justify-center" onClick={deleteSelected}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {mode === "vectorizer" && (
            <motion.section key="vectorizer" {...panelMotion} className="mk-panel flex flex-col gap-5">
              <h2 className="mk-panel-title">Vectorizer</h2>
              <Dropzone onFile={loadImage} fileName={image?.name} hint="Turns pixels into real SVG shapes" />
              <div className="mk-field">
                <p className="mk-section-label mb-0!">Style</p>
                <div className="mk-chips">
                  {(["pixel", "halftone", "triangle"] as const).map((s) => (
                    <button key={s} type="button" className="mk-chip flex-1 capitalize" data-active={vecStyle === s} onClick={() => setVecStyle(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <RangeField label="Resolution" value={vecResolution} onChange={setVecResolution} min={10} max={100} unit=" blocks" />
              <RangeField label="Colour quantization" value={vecQuantize} onChange={setVecQuantize} min={1} max={64} unit=" steps" />
            </motion.section>
          )}

          {mode === "ascii" && (
            <motion.section key="ascii" {...panelMotion} className="mk-panel flex flex-col gap-5">
              <h2 className="mk-panel-title">ASCII pattern</h2>
              <Dropzone onFile={loadImage} fileName={image?.name} hint="Brightness becomes characters" />
              <div className="mk-field">
                <p className="mk-section-label mb-0!">SVG filter</p>
                <div className="mk-chips">
                  {(["none", "grayscale", "sepia", "blur", "invert"] as const).map((f) => (
                    <button key={f} type="button" className="mk-chip capitalize" data-active={asciiFilter === f} onClick={() => setAsciiFilter(f)}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <RangeField label="Corner radius" value={asciiRounding} onChange={setAsciiRounding} min={0} max={200} unit="px" />
              <RangeField label="Opacity" value={asciiOpacity} onChange={setAsciiOpacity} min={10} max={100} unit="%" />
            </motion.section>
          )}

          <div className="mk-tip">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-mk-accent" />
            <p className="m-0">
              {mode === "canvas" ? (
                <>
                  <strong>Shortcuts.</strong> Each tool has a key (hover a tool to see it). <strong>V</strong> selects; drag to move,
                  arrows nudge, <strong>Delete</strong> removes, <strong>[</strong> / <strong>]</strong> reorder and <strong>Ctrl/⌘ Z</strong> undoes.
                </>
              ) : mode === "vectorizer" ? (
                <>
                  <strong>Real vectors.</strong> The vectorizer redraws your image from hundreds of {"<rect>"}, {"<circle>"} or {"<polygon>"} elements. Lower
                  the resolution for a smaller file.
                </>
              ) : (
                <>
                  <strong>Text as texture.</strong> Each pixel becomes a {"<text>"} glyph using currentColor, so the pattern follows your text colour
                  in light and dark themes.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Code output ── */}
      <section className="mk-panel mt-5">
        <div className="mk-panel-head flex-wrap">
          <div className="flex items-center gap-3 [&_.mk-tabs-wrap]:mb-0!">
            <h2 className="mk-panel-title">Code</h2>
            <SegmentedTabs
              label="Output format"
              size="sm"
              value={codeMode}
              onChange={setCodeMode}
              items={[
                { value: "jsx", label: "JSX" },
                { value: "svg", label: "SVG" },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <CopyButton text={code} label="Copy code" disabled={!rawSvg} />
            <button type="button" className="mk-btn mk-btn-primary mk-btn-sm" onClick={downloadSvg} disabled={!rawSvg}>
              <Download size={14} /> Download .svg
            </button>
          </div>
        </div>
        <pre className="mk-code max-h-[360px]">
          <code>{code}</code>
        </pre>
      </section>

      <MorePlaygrounds current="/svg" />
    </main>
  );
}
