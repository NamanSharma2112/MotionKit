/* Selection transforms for the canvas editor: the handle frame, resize,
   rotate, align and distribute. All maths is in artboard units. */

import {
  boxCenter,
  normalizeAngle,
  rotatePoint,
  scaleShape,
  shapeBounds,
  translateShape,
  unionBox,
  worldBounds,
  type Box,
  type Pt,
  type Shape,
} from "./shapes";

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/* Where each handle sits on the frame, as fractions of its width and height. */
export const HANDLE_POS: Record<Handle, [number, number]> = {
  nw: [0, 0],
  n: [0.5, 0],
  ne: [1, 0],
  e: [1, 0.5],
  se: [1, 1],
  s: [0.5, 1],
  sw: [0, 1],
  w: [0, 0.5],
};
export const HANDLES = Object.keys(HANDLE_POS) as Handle[];

const CURSORS = ["ns-resize", "nesw-resize", "ew-resize", "nwse-resize"];
const HANDLE_ANGLE: Record<Handle, number> = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };

/* Resize cursor for a handle, turned with the selection. */
export function handleCursor(h: Handle, rotation: number) {
  const a = (((HANDLE_ANGLE[h] + rotation) % 180) + 180) % 180;
  return CURSORS[Math.round(a / 45) % 4];
}

/* The box the handles sit on. One shape: its own bounds plus its rotation.
   Several: the union of their bounds on the artboard, unrotated. */
export type Frame = { box: Box; rotation: number };

export function selectionFrame(shapes: Shape[]): Frame | null {
  if (!shapes.length) return null;
  if (shapes.length === 1) return { box: shapeBounds(shapes[0]), rotation: shapes[0].rotation ?? 0 };
  return { box: unionBox(shapes.map(worldBounds))!, rotation: 0 };
}

/* Which handles make sense: a flat line has nothing to stretch vertically. */
export function usableHandles(frame: Frame, tiny: number): Handle[] {
  const flatW = frame.box.w < tiny;
  const flatH = frame.box.h < tiny;
  if (flatW && flatH) return [];
  if (flatH) return ["e", "w"];
  if (flatW) return ["n", "s"];
  return HANDLES;
}

/* New local box when `handle` is dragged to local point `p`. `anchor` is the
   point that stays put (the opposite handle). */
export function resizeBox(box: Box, handle: Handle, p: Pt, keepRatio: boolean, min: number): { next: Box; anchor: Pt } {
  const [hx, hy] = HANDLE_POS[handle];
  let x1 = box.x;
  let x2 = box.x + box.w;
  let y1 = box.y;
  let y2 = box.y + box.h;
  if (hx === 0) x1 = Math.min(p.x, x2 - min);
  else if (hx === 1) x2 = Math.max(p.x, x1 + min);
  if (hy === 0) y1 = Math.min(p.y, y2 - min);
  else if (hy === 1) y2 = Math.max(p.y, y1 + min);

  if (keepRatio && box.w > 1e-6 && box.h > 1e-6) {
    const ratio = box.w / box.h;
    let w = x2 - x1;
    let h = y2 - y1;
    if (hx !== 0.5 && hy !== 0.5) {
      if (w / box.w > h / box.h) h = w / ratio;
      else w = h * ratio;
      if (hx === 0) x1 = x2 - w;
      else x2 = x1 + w;
      if (hy === 0) y1 = y2 - h;
      else y2 = y1 + h;
    } else if (hx === 0.5) {
      w = h * ratio;
      const cx = box.x + box.w / 2;
      x1 = cx - w / 2;
      x2 = cx + w / 2;
    } else {
      h = w / ratio;
      const cy = box.y + box.h / 2;
      y1 = cy - h / 2;
      y2 = cy + h / 2;
    }
  }
  const anchor = {
    x: hx === 0 ? box.x + box.w : hx === 1 ? box.x : box.x + box.w / 2,
    y: hy === 0 ? box.y + box.h : hy === 1 ? box.y : box.y + box.h / 2,
  };
  return { next: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, anchor };
}

/* Fit the selection (as it was when the gesture started) to `next`, a new
   local box for `frame`. `anchor` (local) must not move on the artboard. */
export function fitToBox(originals: Shape[], frame: Frame, next: Box, anchor: Pt): Shape[] {
  const { box, rotation } = frame;
  const sx = box.w > 1e-6 ? next.w / box.w : 1;
  const sy = box.h > 1e-6 ? next.h / box.h : 1;
  const o = { x: box.x, y: box.y };
  const n = { x: next.x, y: next.y };
  if (originals.length === 1) {
    const s = scaleShape(originals[0], o, sx, sy, n);
    if (!rotation) return [s];
    // Rotation pivots on the box centre, which moved: shift back so the anchor stays put.
    const before = rotatePoint(anchor, boxCenter(box), rotation);
    const after = rotatePoint({ x: n.x + (anchor.x - o.x) * sx, y: n.y + (anchor.y - o.y) * sy }, boxCenter(next), rotation);
    return [translateShape(s, before.x - after.x, before.y - after.y)];
  }
  return originals.map((s) => {
    if (!s.rotation) return scaleShape(s, o, sx, sy, n);
    // A rotated member keeps its rotation: scale it about its own centre, then move that centre.
    const c = boxCenter(shapeBounds(s));
    const scaled = scaleShape(s, c, sx, sy, c);
    const c2 = boxCenter(shapeBounds(scaled));
    return translateShape(scaled, n.x + (c.x - o.x) * sx - c2.x, n.y + (c.y - o.y) * sy - c2.y);
  });
}

/* Turn the selection by `delta` degrees about `center`. */
export function rotateShapes(originals: Shape[], center: Pt, delta: number): Shape[] {
  return originals.map((s) => {
    const rotation = normalizeAngle((s.rotation ?? 0) + delta) || undefined;
    if (originals.length === 1) return { ...s, rotation };
    const c = boxCenter(shapeBounds(s));
    const c2 = rotatePoint(c, center, delta);
    return { ...translateShape(s, c2.x - c.x, c2.y - c.y), rotation };
  });
}

export type AlignKind = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

/* Line every shape up against `target` (the selection's bounds, or the artboard). */
export function alignShapes(sel: Shape[], kind: AlignKind, target: Box): Shape[] {
  return sel.map((s) => {
    const b = worldBounds(s);
    let dx = 0;
    let dy = 0;
    if (kind === "left") dx = target.x - b.x;
    if (kind === "hcenter") dx = target.x + target.w / 2 - (b.x + b.w / 2);
    if (kind === "right") dx = target.x + target.w - (b.x + b.w);
    if (kind === "top") dy = target.y - b.y;
    if (kind === "vcenter") dy = target.y + target.h / 2 - (b.y + b.h / 2);
    if (kind === "bottom") dy = target.y + target.h - (b.y + b.h);
    return translateShape(s, dx, dy);
  });
}

/* Equal gaps between the shapes along one axis; the outermost two stay put. */
export function distributeShapes(sel: Shape[], axis: "h" | "v"): Shape[] {
  if (sel.length < 3) return sel;
  const items = sel.map((s, i) => ({ s, i, b: worldBounds(s) }));
  const pos = (b: Box) => (axis === "h" ? b.x : b.y);
  const size = (b: Box) => (axis === "h" ? b.w : b.h);
  items.sort((a, b) => pos(a.b) - pos(b.b));
  const first = items[0].b;
  const last = items[items.length - 1].b;
  const span = pos(last) + size(last) - pos(first);
  const gap = (span - items.reduce((n, it) => n + size(it.b), 0)) / (items.length - 1);
  const out = [...sel];
  let cursor = pos(first) + size(first) + gap;
  for (let k = 1; k < items.length - 1; k++) {
    const { s, i, b } = items[k];
    const d = cursor - pos(b);
    out[i] = axis === "h" ? translateShape(s, d, 0) : translateShape(s, 0, d);
    cursor += size(b) + gap;
  }
  return out;
}
