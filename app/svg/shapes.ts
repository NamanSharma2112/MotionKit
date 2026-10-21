/* Shape model, SVG serialisation and geometry helpers for the SVG studio canvas.
   The canvas uses a fixed 800×450 viewBox; every coordinate lives in that space. */

export const VIEW_W = 800;
export const VIEW_H = 450;

export type ToolType = "select" | "brush" | "eraser" | "line" | "rect" | "circle" | "ellipse" | "polygon" | "text";

export type Dash = "none" | "10 10" | "2 8";

export interface PathShape {
  type: "path";
  d: string;
  color: string;
  width: number;
  dash: string;
  fill: string;
  opacity: number;
}

export interface RectShape {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  width: number;
  fill: string;
  rx: number;
  opacity: number;
}

export interface CircleShape {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
  color: string;
  width: number;
  fill: string;
  opacity: number;
}

export interface EllipseShape {
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  width: number;
  fill: string;
  opacity: number;
}

export interface LineShape {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  dash: string;
  opacity: number;
}

export interface PolygonShape {
  type: "polygon";
  cx: number;
  cy: number;
  r: number;
  sides: number;
  color: string;
  width: number;
  fill: string;
  opacity: number;
}

export interface TextShape {
  type: "text";
  x: number;
  y: number;
  content: string;
  fontSize: number;
  color: string;
  fontWeight: string;
  opacity: number;
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

export function polygonPoints(cx: number, cy: number, r: number, sides: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push(`${round(cx + r * Math.cos(angle))},${round(cy + r * Math.sin(angle))}`);
  }
  return pts.join(" ");
}

const round = (n: number) => Math.round(n * 10) / 10;

/* Text content is escaped with entities, which both SVG and JSX understand. */
const escapeText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");

export function shapeToSvg(shape: Shape, jsx: boolean): string {
  const a = (camel: string, kebab: string, val: string | number) => (jsx ? `${camel}="${val}"` : `${kebab}="${val}"`);
  const op = shape.opacity < 1 ? ` opacity="${shape.opacity}"` : "";
  const fill = "fill" in shape ? ` fill="${shape.fill !== "none" ? shape.fill : "none"}"` : "";
  const dash = "dash" in shape && shape.dash !== "none" ? ` ${a("strokeDasharray", "stroke-dasharray", shape.dash)}` : "";

  switch (shape.type) {
    case "path":
      return `<path d="${shape.d}" stroke="${shape.color}" ${a("strokeWidth", "stroke-width", shape.width)}${fill} ${a("strokeLinecap", "stroke-linecap", "round")} ${a("strokeLinejoin", "stroke-linejoin", "round")}${dash}${op} />`;
    case "rect": {
      const rx = shape.rx > 0 ? ` rx="${shape.rx}"` : "";
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" stroke="${shape.color}" ${a("strokeWidth", "stroke-width", shape.width)}${fill}${rx}${op} />`;
    }
    case "circle":
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" stroke="${shape.color}" ${a("strokeWidth", "stroke-width", shape.width)}${fill}${op} />`;
    case "ellipse":
      return `<ellipse cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}" stroke="${shape.color}" ${a("strokeWidth", "stroke-width", shape.width)}${fill}${op} />`;
    case "line":
      return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${shape.color}" ${a("strokeWidth", "stroke-width", shape.width)} ${a("strokeLinecap", "stroke-linecap", "round")}${dash}${op} />`;
    case "polygon":
      return `<polygon points="${polygonPoints(shape.cx, shape.cy, shape.r, shape.sides)}" stroke="${shape.color}" ${a("strokeWidth", "stroke-width", shape.width)}${fill} ${a("strokeLinejoin", "stroke-linejoin", "round")}${op} />`;
    case "text": {
      const fw = shape.fontWeight !== "normal" ? ` ${a("fontWeight", "font-weight", shape.fontWeight)}` : "";
      return `<text x="${shape.x}" y="${shape.y}" ${a("fontSize", "font-size", shape.fontSize)} fill="${shape.color}" ${a("fontFamily", "font-family", "sans-serif")}${fw}${op}>${escapeText(shape.content)}</text>`;
    }
  }
}

/* ── Geometry ─────────────────────────────────────────── */

const PATH_POINT = /([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g;

function pathPoints(d: string): [number, number][] {
  const pts: [number, number][] = [];
  for (const m of d.matchAll(PATH_POINT)) pts.push([parseFloat(m[2]), parseFloat(m[3])]);
  return pts;
}

export type Box = { x: number; y: number; w: number; h: number };

export function shapeBounds(s: Shape): Box {
  switch (s.type) {
    case "rect":
      return { x: s.x, y: s.y, w: s.w, h: s.h };
    case "circle":
    case "polygon":
      return { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 };
    case "ellipse":
      return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 };
    case "line":
      return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
    case "text": {
      // Rough metrics for a sans-serif face: good enough for hit-testing and the selection box.
      const w = Math.max(s.fontSize * 0.3, s.content.length * s.fontSize * 0.56);
      return { x: s.x, y: s.y - s.fontSize * 0.8, w, h: s.fontSize };
    }
    case "path": {
      const pts = pathPoints(s.d);
      if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
  }
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* Is the point on (or inside) the shape? `pad` widens the target in viewBox units. */
export function hitTest(s: Shape, x: number, y: number, pad = 6): boolean {
  switch (s.type) {
    case "rect":
      return x >= s.x - pad && x <= s.x + s.w + pad && y >= s.y - pad && y <= s.y + s.h + pad;
    case "circle":
    case "polygon":
      return Math.hypot(x - s.cx, y - s.cy) <= s.r + pad;
    case "ellipse": {
      const rx = s.rx + pad;
      const ry = s.ry + pad;
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

export function translateShape(s: Shape, dx: number, dy: number): Shape {
  switch (s.type) {
    case "rect":
    case "text":
      return { ...s, x: s.x + dx, y: s.y + dy };
    case "circle":
    case "ellipse":
    case "polygon":
      return { ...s, cx: s.cx + dx, cy: s.cy + dy };
    case "line":
      return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
    case "path":
      return {
        ...s,
        d: s.d.replace(PATH_POINT, (_, cmd: string, px: string, py: string) => `${cmd} ${round(parseFloat(px) + dx)} ${round(parseFloat(py) + dy)}`),
      };
  }
}

/* Too small to keep (a click without a drag). */
export function isDegenerate(s: Shape): boolean {
  switch (s.type) {
    case "rect":
      return s.w < 2 || s.h < 2;
    case "circle":
    case "polygon":
      return s.r < 2;
    case "ellipse":
      return s.rx < 2 || s.ry < 2;
    case "line":
      return Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 2;
    default:
      return false;
  }
}
