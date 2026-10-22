/* Shape model, SVG serialisation and geometry helpers for the SVG studio canvas.
   Canvas shapes live in artboard ("world") units; the artboard defines the
   exported viewBox. VIEW_W/VIEW_H stay as the fixed frame for the image modes. */

export const VIEW_W = 800;
export const VIEW_H = 450;

export type ToolType = "select" | "hand" | "brush" | "eraser" | "line" | "rect" | "circle" | "ellipse" | "polygon" | "text";

export type Dash = "none" | "10 10" | "2 8";

/* Editor metadata every shape carries. `rotation` is in degrees, about the
   centre of the shape's own (unrotated) bounds. */
export interface ShapeMeta {
  id: string;
  name?: string;
  hidden?: boolean;
  locked?: boolean;
  rotation?: number;
  opacity: number;
}

export interface PathShape extends ShapeMeta {
  type: "path";
  d: string;
  color: string;
  width: number;
  dash: string;
  fill: string;
}

export interface RectShape extends ShapeMeta {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  width: number;
  fill: string;
  rx: number;
}

export interface CircleShape extends ShapeMeta {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
  color: string;
  width: number;
  fill: string;
}

export interface EllipseShape extends ShapeMeta {
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  width: number;
  fill: string;
}

export interface LineShape extends ShapeMeta {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  dash: string;
}

/* Regular polygon; `ry` (when set) stretches it vertically after a resize. */
export interface PolygonShape extends ShapeMeta {
  type: "polygon";
  cx: number;
  cy: number;
  r: number;
  ry?: number;
  sides: number;
  color: string;
  width: number;
  fill: string;
}

export interface TextShape extends ShapeMeta {
  type: "text";
  x: number;
  y: number;
  content: string;
  fontSize: number;
  color: string;
  fontWeight: string;
}

export type Shape = PathShape | RectShape | CircleShape | EllipseShape | LineShape | PolygonShape | TextShape;

export const SHAPE_LABEL: Record<Shape["type"], string> = {
  path: "Brush stroke",
  rect: "Rectangle",
  circle: "Circle",
  ellipse: "Ellipse",
  line: "Line",
  polygon: "Polygon",
  text: "Text",
};

export const shapeName = (s: Shape) => s.name || SHAPE_LABEL[s.type];

let idSeq = 0;
export const newId = () => `s${Date.now().toString(36)}${(idSeq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/* Two decimals: enough for a 24×24 icon, short enough for clean exports. */
export const round = (n: number) => Math.round(n * 100) / 100;

export function polygonPoints(cx: number, cy: number, r: number, sides: number, ry = r): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push(`${round(cx + r * Math.cos(angle))},${round(cy + ry * Math.sin(angle))}`);
  }
  return pts.join(" ");
}

/* Unit-circle extents of a regular polygon's vertices (a pentagon doesn't reach the bottom). */
function polygonExtents(sides: number) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    minX = Math.min(minX, c);
    maxX = Math.max(maxX, c);
    minY = Math.min(minY, s);
    maxY = Math.max(maxY, s);
  }
  return { minX, maxX, minY, maxY };
}

/* Text content is escaped with entities, which both SVG and JSX understand. */
const escapeText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");

export function rotationCenter(s: Shape) {
  const b = shapeBounds(s);
  return { x: round(b.x + b.w / 2), y: round(b.y + b.h / 2) };
}

export function shapeToSvg(shape: Shape, jsx: boolean): string {
  const a = (camel: string, kebab: string, val: string | number) => (jsx ? `${camel}="${val}"` : `${kebab}="${val}"`);
  const op = shape.opacity < 1 ? ` opacity="${round(shape.opacity)}"` : "";
  const fill = "fill" in shape ? ` fill="${shape.fill !== "none" ? shape.fill : "none"}"` : "";
  const dash = "dash" in shape && shape.dash !== "none" ? ` ${a("strokeDasharray", "stroke-dasharray", shape.dash)}` : "";
  let tf = "";
  if (shape.rotation) {
    const c = rotationCenter(shape);
    tf = ` transform="rotate(${round(shape.rotation)} ${c.x} ${c.y})"`;
  }
  const sw = "width" in shape ? a("strokeWidth", "stroke-width", round(shape.width)) : "";

  switch (shape.type) {
    case "path":
      return `<path d="${shape.d}" stroke="${shape.color}" ${sw}${fill} ${a("strokeLinecap", "stroke-linecap", "round")} ${a("strokeLinejoin", "stroke-linejoin", "round")}${dash}${op}${tf} />`;
    case "rect": {
      const rx = shape.rx > 0 ? ` rx="${round(shape.rx)}"` : "";
      return `<rect x="${round(shape.x)}" y="${round(shape.y)}" width="${round(shape.w)}" height="${round(shape.h)}" stroke="${shape.color}" ${sw}${fill}${rx}${op}${tf} />`;
    }
    case "circle":
      return `<circle cx="${round(shape.cx)}" cy="${round(shape.cy)}" r="${round(shape.r)}" stroke="${shape.color}" ${sw}${fill}${op}${tf} />`;
    case "ellipse":
      return `<ellipse cx="${round(shape.cx)}" cy="${round(shape.cy)}" rx="${round(shape.rx)}" ry="${round(shape.ry)}" stroke="${shape.color}" ${sw}${fill}${op}${tf} />`;
    case "line":
      return `<line x1="${round(shape.x1)}" y1="${round(shape.y1)}" x2="${round(shape.x2)}" y2="${round(shape.y2)}" stroke="${shape.color}" ${sw} ${a("strokeLinecap", "stroke-linecap", "round")}${dash}${op}${tf} />`;
    case "polygon":
      return `<polygon points="${polygonPoints(shape.cx, shape.cy, shape.r, shape.sides, shape.ry)}" stroke="${shape.color}" ${sw}${fill} ${a("strokeLinejoin", "stroke-linejoin", "round")}${op}${tf} />`;
    case "text": {
      const fw = shape.fontWeight !== "normal" ? ` ${a("fontWeight", "font-weight", shape.fontWeight)}` : "";
      return `<text x="${round(shape.x)}" y="${round(shape.y)}" ${a("fontSize", "font-size", round(shape.fontSize))} fill="${shape.color}" ${a("fontFamily", "font-family", "sans-serif")}${fw}${op}${tf}>${escapeText(shape.content)}</text>`;
    }
  }
}

/* ── Geometry ─────────────────────────────────────────── */

export type Pt = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

const PATH_POINT = /([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g;

function pathPoints(d: string): [number, number][] {
  const pts: [number, number][] = [];
  for (const m of d.matchAll(PATH_POINT)) pts.push([parseFloat(m[2]), parseFloat(m[3])]);
  return pts;
}

function mapPath(d: string, fx: (x: number) => number, fy: (y: number) => number) {
  return d.replace(PATH_POINT, (_, cmd: string, px: string, py: string) => `${cmd} ${round(fx(parseFloat(px)))} ${round(fy(parseFloat(py)))}`);
}

/* Text metrics: measure with a canvas when we can, estimate otherwise. */
let measureCtx: CanvasRenderingContext2D | null | undefined;
const widthCache = new Map<string, number>();
function textWidth(s: TextShape) {
  const key = `${s.fontWeight}|${s.content}`;
  let unit = widthCache.get(key);
  if (unit === undefined) {
    if (measureCtx === undefined && typeof document !== "undefined") measureCtx = document.createElement("canvas").getContext("2d");
    if (measureCtx) {
      measureCtx.font = `${s.fontWeight === "bold" ? 700 : 400} 100px sans-serif`;
      unit = measureCtx.measureText(s.content).width / 100;
    } else {
      unit = s.content.length * 0.56;
    }
    widthCache.set(key, unit);
  }
  return Math.max(s.fontSize * 0.3, unit * s.fontSize);
}

/* Bounds of the shape itself, before its rotation is applied. */
export function shapeBounds(s: Shape): Box {
  switch (s.type) {
    case "rect":
      return { x: s.x, y: s.y, w: s.w, h: s.h };
    case "circle":
      return { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 };
    case "polygon": {
      const e = polygonExtents(s.sides);
      const ry = s.ry ?? s.r;
      return { x: s.cx + s.r * e.minX, y: s.cy + ry * e.minY, w: s.r * (e.maxX - e.minX), h: ry * (e.maxY - e.minY) };
    }
    case "ellipse":
      return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 };
    case "line":
      return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
    case "text":
      return { x: s.x, y: s.y - s.fontSize * 0.8, w: textWidth(s), h: s.fontSize };
    case "path": {
      const pts = pathPoints(s.d);
      if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [x, y] of pts) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
  }
}

export const boxCenter = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export function rotatePoint(p: Pt, c: Pt, deg: number): Pt {
  if (!deg) return p;
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

export function boxCorners(b: Box): Pt[] {
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y + b.h },
  ];
}

export function unionBox(boxes: Box[]): Box | null {
  if (!boxes.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/* Axis-aligned bounds on the artboard, rotation included. */
export function worldBounds(s: Shape): Box {
  const b = shapeBounds(s);
  if (!s.rotation) return b;
  const c = boxCenter(b);
  const pts = boxCorners(b).map((p) => rotatePoint(p, c, s.rotation!));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export const boxesIntersect = (a: Box, b: Box) => a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* Is the point on (or inside) the shape? `pad` widens the target in artboard units. */
export function hitTest(s: Shape, px: number, py: number, pad = 6): boolean {
  let x = px;
  let y = py;
  if (s.rotation) {
    const p = rotatePoint({ x: px, y: py }, boxCenter(shapeBounds(s)), -s.rotation);
    x = p.x;
    y = p.y;
  }
  switch (s.type) {
    case "rect":
      return x >= s.x - pad && x <= s.x + s.w + pad && y >= s.y - pad && y <= s.y + s.h + pad;
    case "circle":
      return Math.hypot(x - s.cx, y - s.cy) <= s.r + pad;
    case "polygon":
    case "ellipse": {
      const rx = (s.type === "ellipse" ? s.rx : s.r) + pad;
      const ry = (s.type === "ellipse" ? s.ry : (s.ry ?? s.r)) + pad;
      return (x - s.cx) ** 2 / rx ** 2 + (y - s.cy) ** 2 / ry ** 2 <= 1;
    }
    case "line":
      return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) <= s.width / 2 + pad;
    case "text": {
      const b = shapeBounds(s);
      return x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
    }
    case "path": {
      const pts = pathPoints(s.d);
      const tol = s.width / 2 + pad;
      if (pts.length === 1) return Math.hypot(x - pts[0][0], y - pts[0][1]) <= tol;
      for (let i = 1; i < pts.length; i++) {
        if (distToSegment(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= tol) return true;
      }
      return false;
    }
  }
}

export function translateShape<S extends Shape>(s: S, dx: number, dy: number): S {
  if (!dx && !dy) return s;
  switch (s.type) {
    case "rect":
    case "text":
      return { ...s, x: round(s.x + dx), y: round(s.y + dy) };
    case "circle":
    case "ellipse":
    case "polygon":
      return { ...s, cx: round(s.cx + dx), cy: round(s.cy + dy) };
    case "line":
      return { ...s, x1: round(s.x1 + dx), y1: round(s.y1 + dy), x2: round(s.x2 + dx), y2: round(s.y2 + dy) };
    case "path":
      return { ...s, d: mapPath(s.d, (x) => x + dx, (y) => y + dy) };
  }
  return s;
}

/* Map the shape's geometry with p' = n + (p - o) * s (no rotation involved).
   Text only scales uniformly, so it uses `sy` for its size. A circle that is
   stretched unevenly becomes an ellipse. */
export function scaleShape(s: Shape, o: Pt, sx: number, sy: number, n: Pt): Shape {
  const X = (x: number) => round(n.x + (x - o.x) * sx);
  const Y = (y: number) => round(n.y + (y - o.y) * sy);
  switch (s.type) {
    case "rect":
      return { ...s, x: X(s.x), y: Y(s.y), w: round(s.w * sx), h: round(s.h * sy) };
    case "circle": {
      if (Math.abs(sx - sy) < 1e-6) return { ...s, cx: X(s.cx), cy: Y(s.cy), r: round(s.r * sx) };
      const { r, ...rest } = s;
      return { ...rest, type: "ellipse", cx: X(s.cx), cy: Y(s.cy), rx: round(r * sx), ry: round(r * sy) };
    }
    case "ellipse":
      return { ...s, cx: X(s.cx), cy: Y(s.cy), rx: round(s.rx * sx), ry: round(s.ry * sy) };
    case "polygon": {
      const ry = round((s.ry ?? s.r) * sy);
      const r = round(s.r * sx);
      return { ...s, cx: X(s.cx), cy: Y(s.cy), r, ry: Math.abs(ry - r) < 0.01 ? undefined : ry };
    }
    case "line":
      return { ...s, x1: X(s.x1), y1: Y(s.y1), x2: X(s.x2), y2: Y(s.y2) };
    case "text":
      return { ...s, x: X(s.x), y: Y(s.y), fontSize: Math.max(1, round(s.fontSize * sy)) };
    case "path":
      return { ...s, d: mapPath(s.d, (x) => n.x + (x - o.x) * sx, (y) => n.y + (y - o.y) * sy) };
  }
}

/* Too small to keep (a click without a drag). `min` is in artboard units. */
export function isDegenerate(s: Shape, min = 2): boolean {
  switch (s.type) {
    case "rect":
      return s.w < min || s.h < min;
    case "circle":
    case "polygon":
      return s.r < min;
    case "ellipse":
      return s.rx < min || s.ry < min;
    case "line":
      return Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < min;
    default:
      return false;
  }
}

export const normalizeAngle = (deg: number) => {
  let a = ((deg % 360) + 360) % 360;
  if (a > 180) a -= 360;
  return round(a);
};
