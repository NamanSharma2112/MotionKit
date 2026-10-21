/* Isometric geometry shared by the editor, the SVG/PNG export and the example
   thumbnails. Every shape is a set of flat faces in a unit cell; faces are
   rotated (view + per-block facing), back-face culled, shaded by their view
   normal and projected to 2:1 dimetric screen space. */

export type ShapeType = "cube" | "slab" | "wedge" | "stairs" | "pyramid" | "cylinder";
export type Dir = 0 | 1 | 2 | 3;

export interface Block {
  id: string;
  x: number;
  y: number;
  /** Base elevation in block units (0 = on the floor). */
  z: number;
  color: string;
  shape: ShapeType;
  /** Facing for directional shapes (wedge, stairs). */
  dir?: Dir;
}

export interface Scene {
  version: 2;
  grid: number;
  ground: boolean;
  blocks: Block[];
}

export const SHAPES: { id: ShapeType; label: string; directional?: boolean }[] = [
  { id: "cube", label: "Cube" },
  { id: "slab", label: "Slab" },
  { id: "wedge", label: "Wedge", directional: true },
  { id: "stairs", label: "Stairs", directional: true },
  { id: "pyramid", label: "Pyramid" },
  { id: "cylinder", label: "Cylinder" },
];

export const SHAPE_HEIGHT: Record<ShapeType, number> = {
  cube: 1,
  slab: 0.5,
  wedge: 1,
  stairs: 1,
  pyramid: 1,
  cylinder: 1,
};

export const isDirectional = (s: ShapeType) => s === "wedge" || s === "stairs";

export const TW = 28; // tile half-width
export const TH = 14; // tile half-height
export const CH = 30; // unit block height on screen
export const MAX_Z = 24;

/* ─── Colour ─── */

/** Mix toward white (p > 0) or black (p < 0) by |p| percent. */
export function shade(hex: string, p: number) {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const t = p > 0 ? 255 : 0;
  const k = Math.min(Math.abs(p), 100) / 100;
  r = Math.round(r + (t - r) * k);
  g = Math.round(g + (t - g) * k);
  b = Math.round(b + (t - b) * k);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function normalizeHex(c: string) {
  let s = String(c || "").trim().toLowerCase();
  if (!s.startsWith("#")) s = "#" + s;
  if (/^#[0-9a-f]{3}$/.test(s)) s = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  return /^#[0-9a-f]{6}$/.test(s) ? s : "#9ca3af";
}

/* ─── Rotation helpers ─── */

type V3 = [number, number, number];

/** Rotate a grid-space point around the grid centre by `rot` quarter turns. */
export function rotPoint(x: number, y: number, rot: number, n: number): [number, number] {
  switch (rot & 3) {
    case 1:
      return [n - y, x];
    case 2:
      return [n - x, n - y];
    case 3:
      return [y, n - x];
    default:
      return [x, y];
  }
}

function rotVec(x: number, y: number, rot: number): [number, number] {
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

export function project(x: number, y: number, z: number, n: number): [number, number] {
  return [(x - y) * TW, (x + y - n) * TH - z * CH];
}

/* ─── Shape definitions (local unit cell) ─── */

interface Face {
  pts: V3[];
  n: V3;
}

function box(u0: number, u1: number, v0: number, v1: number, w0: number, w1: number): Face[] {
  return [
    { pts: [[u0, v0, w1], [u1, v0, w1], [u1, v1, w1], [u0, v1, w1]], n: [0, 0, 1] },
    { pts: [[u1, v0, w0], [u1, v1, w0], [u1, v1, w1], [u1, v0, w1]], n: [1, 0, 0] },
    { pts: [[u0, v0, w0], [u0, v1, w0], [u0, v1, w1], [u0, v0, w1]], n: [-1, 0, 0] },
    { pts: [[u0, v1, w0], [u1, v1, w0], [u1, v1, w1], [u0, v1, w1]], n: [0, 1, 0] },
    { pts: [[u0, v0, w0], [u1, v0, w0], [u1, v0, w1], [u0, v0, w1]], n: [0, -1, 0] },
  ];
}

const S2 = Math.SQRT1_2;
const P1 = 1 / Math.sqrt(1.25);

/** Convex parts per shape; stairs is two boxes drawn back to front. */
const PARTS: Record<Exclude<ShapeType, "cylinder">, Face[][]> = {
  cube: [box(0, 1, 0, 1, 0, 1)],
  slab: [box(0, 1, 0, 1, 0, 0.5)],
  // High edge along v = 0, slope runs down toward +v.
  wedge: [
    [
      { pts: [[0, 1, 0], [1, 1, 0], [1, 0, 1], [0, 0, 1]], n: [0, S2, S2] },
      { pts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], n: [0, -1, 0] },
      { pts: [[0, 0, 0], [0, 1, 0], [0, 0, 1]], n: [-1, 0, 0] },
      { pts: [[1, 0, 0], [1, 1, 0], [1, 0, 1]], n: [1, 0, 0] },
    ],
  ],
  stairs: [box(0, 1, 0, 0.5, 0, 1), box(0, 1, 0.5, 1, 0, 0.5)],
  pyramid: [
    [
      { pts: [[0, 1, 0], [1, 1, 0], [0.5, 0.5, 1]], n: [0, P1, P1 / 2] },
      { pts: [[1, 0, 0], [1, 1, 0], [0.5, 0.5, 1]], n: [P1, 0, P1 / 2] },
      { pts: [[0, 0, 0], [1, 0, 0], [0.5, 0.5, 1]], n: [0, -P1, P1 / 2] },
      { pts: [[0, 0, 0], [0, 1, 0], [0.5, 0.5, 1]], n: [-P1, 0, P1 / 2] },
    ],
  ],
};

/* ─── Primitives ─── */

/** Where a click on this face puts the next block. */
export type Hit = { kind: "top" } | { kind: "side"; dx: number; dy: number };

export interface Prim {
  d: string;
  fill: string;
  hit: Hit;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const emptyBounds = (): Bounds => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

function grow(b: Bounds, x: number, y: number) {
  if (x < b.minX) b.minX = x;
  if (y < b.minY) b.minY = y;
  if (x > b.maxX) b.maxX = x;
  if (y > b.maxY) b.maxY = y;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

function pathOf(pts: [number, number][], b: Bounds) {
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    grow(b, x, y);
    d += (i ? "L" : "M") + r2(x) + "," + r2(y);
  }
  return d + "Z";
}

/** Face shading by view-space normal: lit top, mid left, dark right. */
const shadeFor = (nx: number, ny: number, nz: number) => 14 * nz - 6 * ny - 24 * nx;

function hitFromWorldNormal(nx: number, ny: number, nz: number): Hit {
  if (nz > 0.3) return { kind: "top" };
  if (Math.abs(nx) >= Math.abs(ny)) return { kind: "side", dx: Math.sign(nx), dy: 0 };
  return { kind: "side", dx: 0, dy: Math.sign(ny) };
}

/** Screen-space faces for one block, back to front, with bounds. */
export function blockPrims(b: Block, rot: number, n: number, bounds: Bounds): Prim[] {
  const color = normalizeHex(b.color);
  const out: Prim[] = [];
  if (b.shape === "cylinder") {
    const R = 0.45;
    const [cxw, cyw] = rotPoint(b.x + 0.5, b.y + 0.5, rot, n);
    const [cx, cyBot] = project(cxw, cyw, b.z, n);
    const cyTop = cyBot - CH;
    const rx = R * Math.SQRT2 * TW;
    const ry = R * Math.SQRT2 * TH;
    grow(bounds, cx - rx, cyTop - ry);
    grow(bounds, cx + rx, cyBot + ry);
    const f = (v: number) => r2(v);
    // Left (view +y) and right (view +x) halves of the body.
    const left = `M${f(cx - rx)},${f(cyTop)}L${f(cx - rx)},${f(cyBot)}A${f(rx)} ${f(ry)} 0 0 0 ${f(cx)},${f(cyBot + ry)}L${f(cx)},${f(cyTop + ry)}Z`;
    const right = `M${f(cx)},${f(cyTop + ry)}L${f(cx)},${f(cyBot + ry)}A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)},${f(cyBot)}L${f(cx + rx)},${f(cyTop)}Z`;
    const top = `M${f(cx - rx)},${f(cyTop)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)},${f(cyTop)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)},${f(cyTop)}Z`;
    const inv = (4 - (rot & 3)) & 3;
    const [lx, ly] = rotVec(0, 1, inv);
    const [rx2, ry2] = rotVec(1, 0, inv);
    out.push({ d: left, fill: shade(color, -6), hit: hitFromWorldNormal(lx, ly, 0) });
    out.push({ d: right, fill: shade(color, -24), hit: hitFromWorldNormal(rx2, ry2, 0) });
    out.push({ d: top, fill: shade(color, 14), hit: { kind: "top" } });
    return out;
  }

  const dir = isDirectional(b.shape) ? (b.dir ?? 0) & 3 : 0;
  const parts = PARTS[b.shape] ?? PARTS.cube;

  const placed = parts.map((faces) => {
    let depth = 0;
    const fs = faces.map((face) => {
      const pts = face.pts.map(([u, v, w]) => {
        // facing rotation about the cell centre: (u,v) -> (1-v, u)
        let uu = u;
        let vv = v;
        for (let k = 0; k < dir; k++) {
          const t = uu;
          uu = 1 - vv;
          vv = t;
        }
        const [X, Y] = rotPoint(b.x + uu, b.y + vv, rot, n);
        return [X, Y, b.z + w] as V3;
      });
      let [wx, wy] = [face.n[0], face.n[1]];
      for (let k = 0; k < dir; k++) [wx, wy] = [-wy, wx];
      const [vx, vy] = rotVec(wx, wy, rot);
      return { pts, world: [wx, wy, face.n[2]] as V3, view: [vx, vy, face.n[2]] as V3 };
    });
    // depth of the part = mean of its vertices along the view axis
    let cnt = 0;
    for (const f of fs)
      for (const p of f.pts) {
        depth += p[0] + p[1] + p[2];
        cnt++;
      }
    return { fs, depth: depth / cnt };
  });
  placed.sort((a, c) => a.depth - c.depth);

  for (const part of placed) {
    for (const f of part.fs) {
      const [vx, vy, vz] = f.view;
      if (vx + vy + vz <= 1e-6) continue; // faces away from the viewer
      const d = pathOf(
        f.pts.map(([X, Y, Z]) => project(X, Y, Z, n)),
        bounds,
      );
      out.push({ d, fill: shade(color, shadeFor(vx, vy, vz)), hit: hitFromWorldNormal(f.world[0], f.world[1], f.world[2]) });
    }
  }
  return out;
}

/** Painter's order key for a block in the current view. */
export function depthKey(b: Block, rot: number, n: number) {
  const [X, Y] = rotPoint(b.x + 0.5, b.y + 0.5, rot, n);
  return X + Y + b.z + SHAPE_HEIGHT[b.shape] / 2;
}

export function sortBlocks(blocks: Block[], rot: number, n: number) {
  return blocks
    .map((b) => ({ b, k: depthKey(b, rot, n) }))
    .sort((a, c) => a.k - c.k || a.b.z - c.b.z)
    .map((e) => e.b);
}

/** Floor cell outline (z = 0). */
export function cellPath(x: number, y: number, rot: number, n: number) {
  const corners: [number, number][] = [
    [x, y],
    [x + 1, y],
    [x + 1, y + 1],
    [x, y + 1],
  ];
  const b = emptyBounds();
  return pathOf(
    corners.map(([cx, cy]) => {
      const [X, Y] = rotPoint(cx, cy, rot, n);
      return project(X, Y, 0, n);
    }),
    b,
  );
}

export const GROUND_DEPTH = 0.32;

/** Base plate under the grid: top diamond plus the two visible sides. */
export function groundPrims(n: number, bounds: Bounds, colors = GROUND_EXPORT) {
  const P = (x: number, y: number, z: number) => project(x, y, z, n);
  const g = -GROUND_DEPTH;
  return [
    { d: pathOf([P(0, n, 0), P(n, n, 0), P(n, n, g), P(0, n, g)], bounds), fill: colors.left },
    { d: pathOf([P(n, 0, 0), P(n, n, 0), P(n, n, g), P(n, 0, g)], bounds), fill: colors.right },
    { d: pathOf([P(0, 0, 0), P(n, 0, 0), P(n, n, 0), P(0, n, 0)], bounds), fill: colors.top },
  ];
}

export const GROUND_EXPORT = { top: "#ececef", left: "#dcdce1", right: "#c9c9cf" };

/* ─── Scene → SVG string ─── */

export function renderScene(blocks: Block[], rot: number, n: number, ground: boolean) {
  const bounds = emptyBounds();
  const g = ground ? groundPrims(n, bounds) : [];
  const items = sortBlocks(blocks, rot, n).map((b) => ({ b, prims: blockPrims(b, rot, n, bounds) }));
  return { ground: g, items, bounds };
}

export function sceneToSvg(blocks: Block[], rot: number, n: number, ground: boolean, pad = 24) {
  const { ground: g, items, bounds } = renderScene(blocks, rot, n, ground);
  const x = Math.floor(bounds.minX - pad);
  const y = Math.floor(bounds.minY - pad);
  const w = Math.ceil(bounds.maxX - bounds.minX + pad * 2);
  const h = Math.ceil(bounds.maxY - bounds.minY + pad * 2);
  const face = (p: { d: string; fill: string }) =>
    `<path d="${p.d}" fill="${p.fill}" stroke="${p.fill}" stroke-width="0.6" stroke-linejoin="round"/>`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">\n`;
  if (g.length) s += `  <g id="ground">${g.map(face).join("")}</g>\n`;
  for (const it of items) s += `  <g>${it.prims.map(face).join("")}</g>\n`;
  s += `</svg>\n`;
  return { svg: s, width: w, height: h };
}

/* ─── Scene serialisation ─── */

const SHAPE_IDS = new Set<string>(SHAPES.map((s) => s.id));

let idSeq = 0;
export const newId = () => `b${Date.now().toString(36)}${(idSeq++).toString(36)}`;

/** Accepts the current format and the legacy plain array (1-based z). */
export function parseScene(raw: unknown): Scene | null {
  let legacy = false;
  let blocksIn: unknown;
  let grid = 12;
  let ground = true;
  if (Array.isArray(raw)) {
    legacy = true;
    blocksIn = raw;
  } else if (raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks)) {
    const o = raw as { blocks: unknown[]; grid?: unknown; ground?: unknown };
    blocksIn = o.blocks;
    if (typeof o.grid === "number") grid = o.grid;
    if (typeof o.ground === "boolean") ground = o.ground;
  } else return null;

  const blocks: Block[] = [];
  for (const item of blocksIn as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const x = Number(o.x);
    const y = Number(o.y);
    let z = Number(o.z);
    if (![x, y, z].every(Number.isFinite)) continue;
    if (legacy) z -= 1;
    const shape = SHAPE_IDS.has(String(o.shape)) ? (o.shape as ShapeType) : "cube";
    const blk: Block = {
      id: newId(),
      x: Math.round(x),
      y: Math.round(y),
      z: Math.max(0, Math.round(z * 2) / 2),
      color: normalizeHex(String(o.color ?? "")),
      shape,
    };
    if (isDirectional(shape)) blk.dir = ((((Math.round(Number(o.dir)) || 0) % 4) + 4) % 4) as Dir;
    blocks.push(blk);
    if (blocks.length >= 4000) break;
  }
  let need = 6;
  for (const b of blocks) need = Math.max(need, b.x + 1, b.y + 1);
  if (blocks.some((b) => b.x < 0 || b.y < 0)) return null;
  grid = Math.min(32, Math.max(need, Math.round(grid)));
  return { version: 2, grid, ground, blocks };
}

export function serializeScene(s: Omit<Scene, "version">, extra?: Record<string, unknown>) {
  return JSON.stringify({
    version: 2,
    ...extra,
    grid: s.grid,
    ground: s.ground,
    blocks: s.blocks.map(({ x, y, z, color, shape, dir }) =>
      dir ? { x, y, z, color, shape, dir } : { x, y, z, color, shape },
    ),
  });
}
