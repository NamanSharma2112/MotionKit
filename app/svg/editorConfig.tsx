/* Tools, presets and swatches for the canvas editor. */

import type { ReactNode } from "react";
import { Brush, Circle, Eraser, Hand, MousePointer2, Pentagon, Spline, Square, Type } from "lucide-react";
import type { Dash, Shape, ToolType } from "./shapes";

export const LineIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <line x1="5" y1="19" x2="19" y2="5" />
  </svg>
);
export const EllipseIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <ellipse cx="12" cy="12" rx="10" ry="6" />
  </svg>
);

export const TOOLS: { key: ToolType; label: string; shortcut: string; icon: ReactNode }[] = [
  { key: "select", label: "Select", shortcut: "V", icon: <MousePointer2 size={16} /> },
  { key: "hand", label: "Hand (pan)", shortcut: "H", icon: <Hand size={16} /> },
  { key: "brush", label: "Brush", shortcut: "B", icon: <Brush size={16} /> },
  { key: "eraser", label: "Eraser", shortcut: "E", icon: <Eraser size={16} /> },
  { key: "line", label: "Line", shortcut: "L", icon: <LineIcon /> },
  { key: "rect", label: "Rectangle", shortcut: "R", icon: <Square size={16} /> },
  { key: "circle", label: "Circle", shortcut: "C", icon: <Circle size={16} /> },
  { key: "ellipse", label: "Ellipse", shortcut: "O", icon: <EllipseIcon /> },
  { key: "polygon", label: "Polygon", shortcut: "P", icon: <Pentagon size={16} /> },
  { key: "text", label: "Text", shortcut: "T", icon: <Type size={16} /> },
];

export const SHAPE_ICON: Record<Shape["type"], ReactNode> = {
  path: <Spline size={14} />,
  rect: <Square size={14} />,
  circle: <Circle size={14} />,
  ellipse: <EllipseIcon size={14} />,
  line: <LineIcon size={14} />,
  polygon: <Pentagon size={14} />,
  text: <Type size={14} />,
};

export const STROKE_SWATCHES = ["#1f6bff", "#0b0b0c", "#ffffff", "#ef4444", "#f59e0b", "#22c55e", "#a855f7"];
export const FILL_SWATCHES = ["#c7d7fe", "#fde68a", "#bbf7d0", "#fbcfe8", "#0b0b0c", "#ffffff"];
export const DASHES: { value: Dash; label: string }[] = [
  { value: "none", label: "Solid" },
  { value: "10 10", label: "Dashed" },
  { value: "2 8", label: "Dotted" },
];

export type BoardPreset = { id: string; label: string; w: number; h: number; grid: number };

export const BOARD_PRESETS: BoardPreset[] = [
  { id: "icon", label: "Icon", w: 24, h: 24, grid: 1 },
  { id: "512", label: "512", w: 512, h: 512, grid: 16 },
  { id: "wide", label: "16:9", w: 800, h: 450, grid: 20 },
  { id: "post", label: "Post", w: 1080, h: 1080, grid: 40 },
  { id: "hd", label: "HD", w: 1920, h: 1080, grid: 40 },
];

export const DEFAULT_BOARD = { w: 800, h: 450 };

/* Platform-aware modifier label for tooltips. Resolved after mount. */
export const modKey = () => (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl");

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "V H B E L R C O P T", label: "Tools" },
  { keys: "Shift click / drag", label: "Add to selection" },
  { keys: "Shift + handle", label: "Keep aspect ratio / 15° steps" },
  { keys: "Alt + drag", label: "Duplicate while moving" },
  { keys: "Mod C / X / V / D", label: "Copy, cut, paste, duplicate" },
  { keys: "Mod A", label: "Select all" },
  { keys: "Arrows (+ Shift)", label: "Nudge 1 (10)" },
  { keys: "[ ]  ·  Shift [ ]", label: "Backward / forward, to back / front" },
  { keys: "Alt A D W S H V", label: "Align left, right, top, bottom, centre" },
  { keys: "Mod Shift H / L", label: "Hide / lock" },
  { keys: "Mod wheel · pinch", label: "Zoom to cursor" },
  { keys: "Space drag · middle drag", label: "Pan" },
  { keys: "+ − · Shift 1 · Shift 0", label: "Zoom in, out, fit, 100%" },
  { keys: "Mod Z · Mod Shift Z", label: "Undo, redo" },
];
