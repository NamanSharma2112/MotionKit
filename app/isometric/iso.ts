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

export function normalizeHex(c: string) {
  let s = String(c || "").trim().toLowerCase();
  if (!s.startsWith("#")) s = "#" + s;
  if (/^#[0-9a-f]{3}$/.test(s)) s = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  return /^#[0-9a-f]{6}$/.test(s) ? s : "#9ca3af";
}

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklab(hex: string): V3 {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  const r = toLin(((n >> 16) & 255) / 255);
  const g = toLin(((n >> 8) & 255) / 255);
  const b = toLin((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb(L: number, a: number, b: number): V3 {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = ([r, g, b]: V3) => r >= -1e-4 && r <= 1.0001 && g >= -1e-4 && g <= 1.0001 && b >= -1e-4 && b <= 1.0001;

/** OKLab → hex, keeping lightness and hue and pulling chroma in until it fits sRGB. */
function oklabToHex(L: number, a: number, b: number) {
  let rgb = oklabToRgb(L, a, b);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 16; i++) {
      const k = (lo + hi) / 2;
      if (inGamut(oklabToRgb(L, a * k, b * k))) lo = k;
      else hi = k;
    }
    rgb = oklabToRgb(L, a * lo, b * lo);
  }
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, toGamma(Math.min(1, Math.max(0, v))))) * 255);
  return "#" + ((1 << 24) | (ch(rgb[0]) << 16) | (ch(rgb[1]) << 8) | ch(rgb[2])).toString(16).slice(1);
}

const toneCache = new Map<string, string>();

/**
 * Shift a colour's perceptual lightness (OKLCH L) by `dL`, hue fixed. Steps are
 * eased toward the ends of the range so near-white and near-black colours
 * still get distinct faces; shadowed faces lose chroma only in step with
 * lightness, so they neither grey out (mix toward black) nor turn neon.
 */
export function tone(hex: string, dL: number) {
  const key = hex + (Math.round(dL * 1000) / 1000);
  const hit = toneCache.get(key);
  if (hit) return hit;
  const [L, a, b] = hexToOklab(hex);
  let L2: number;
  let c = 1;
  if (dL >= 0) {
    L2 = Math.min(0.995, L + dL * Math.min(1.1, Math.max(0.3, (1 - L) / 0.3)));
    c = 1 - dL * 0.8;
  } else {
    L2 = Math.max(0.06, L + dL * (0.6 + 0.45 * L));
    // Ease chroma down with lightness so shaded faces stay rich but never neon.
    c = (L2 / Math.max(L, 1e-3)) ** 0.6;
  }
  const out = oklabToHex(L2, a * c, b * c);
  if (toneCache.size > 4000) toneCache.clear();
  toneCache.set(key, out);
  return out;
}

/*
 * One light for every shape. Brightness is linear in the view-space normal:
 *   dL = -0.06·nx + 0.02·ny + 0.08·nz − 0.08
 * so a flat top shows the picked colour exactly, the left (+y) wall sits
 * 0.06 darker and the right (+x) wall 0.14 darker; slopes and the curve of a
 * cylinder land in between on the same scale.
 */
export const faceDelta = (nx: number, ny: number, nz: number) => -0.06 * nx + 0.02 * ny + 0.08 * nz - 0.08;

/** Direction toward the viewer in view space; faces with n · EYE ≤ 0 are back faces. */
const EYE_Z = (2 * TH) / CH;

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

export function rotVec(x: number, y: number, rot: number): [number, number] {
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

/** Screen point → world grid point on the horizontal plane at height z. */
export function unproject(sx: number, sy: number, z: number, rot: number, n: number): [number, number] {
  const a = sx / TW;
  const b = (sy + z * CH) / TH + n;
  return rotPoint((a + b) / 2, (b - a) / 2, (4 - (rot & 3)) & 3, n);
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

/* ─── Neighbourhood: hidden faces and ambient occlusion ─── */

/*
 * A block's look depends on its neighbours: faces pressed against another
 * block are skipped (they would only leak their anti-aliased edges as
 * seams), and top faces darken softly along edges where something stands
 * next to them. Everything is packed into one number so renderers can cache
 * a block's faces until its surroundings change.
 */
const EPS = 1e-6;
const C_TOP = 1;
/** Side cover: 2 bits per world direction (−x, +x, −y, +y), lower/upper half. */
const coverBit = (dirIdx: number, slot: number) => 1 << (1 + dirIdx * 2 + slot);
const AO_BIT = (dirIdx: number) => 1 << (9 + dirIdx);
const C_CONTACT = 1 << 13;
const DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export type BlockIndex = Map<number, Block[]>;
const cellKey = (x: number, y: number) => x * 4096 + y;

export function indexBlocks(blocks: Iterable<Block>): BlockIndex {
  const m: BlockIndex = new Map();
  for (const b of blocks) {
    const k = cellKey(b.x, b.y);
    const list = m.get(k);
    if (list) list.push(b);
    else m.set(k, [b]);
  }
  return m;
}

const fullSides = (s: ShapeType) => s === "cube" || s === "slab";

/** Neighbourhood bits for one block (see above). */
export function blockCtx(b: Block, idx: BlockIndex, ground: boolean): number {
  const H = SHAPE_HEIGHT[b.shape];
  const top = b.z + H;
  let ctx = 0;
  for (const o of idx.get(cellKey(b.x, b.y)) ?? []) {
    if (o === b) continue;
    if (Math.abs(o.z - top) < EPS && (o.shape !== "cylinder" || b.shape === "cylinder")) ctx |= C_TOP;
    if (b.shape === "cylinder" && o.shape !== "cylinder" && Math.abs(o.z + SHAPE_HEIGHT[o.shape] - b.z) < EPS) ctx |= C_CONTACT;
  }
  if (b.shape === "cylinder" && ground && b.z < EPS) ctx |= C_CONTACT;
  DIRS.forEach(([dx, dy], i) => {
    for (const o of idx.get(cellKey(b.x + dx, b.y + dy)) ?? []) {
      const oh = SHAPE_HEIGHT[o.shape];
      if (fullSides(o.shape)) {
        if (o.z <= b.z + EPS && o.z + oh >= b.z + 0.5 - EPS) ctx |= coverBit(i, 0);
        if (o.z <= b.z + 0.5 + EPS && o.z + oh >= b.z + 1 - EPS) ctx |= coverBit(i, 1);
      }
      if ((b.shape === "cube" || b.shape === "slab") && o.shape !== "cylinder" && o.z <= top + EPS && o.z + oh > top + EPS) ctx |= AO_BIT(i);
    }
  });
  return ctx;
}

/** Bits for a block drawn on its own (icons, ghost previews): nothing hidden, no shading. */
export const NO_CTX = 0;

/* ─── Primitives ─── */

/** Where a click on this face puts the next block. */
export type Hit = { kind: "top" } | { kind: "side"; dx: number; dy: number };

export interface Prim {
  d: string;
  fill: string;
  /** null for decoration (occlusion shading): not stroked, not clickable. */
  hit: Hit | null;
  /** SVG transform, for shading strips drawn in a unit square. */
  tf?: string;
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

/**
 * Polygon path. With `openEdge` = k the path starts after edge k and stops
 * before it without closing: the fill still closes it, but the stroke skips
 * that edge, so a face never paints its outline over the face it meets.
 */
function pathOf(pts: [number, number][], b: Bounds, openEdge = -1) {
  const m = pts.length;
  const start = openEdge >= 0 ? (openEdge + 1) % m : 0;
  let d = "";
  for (let i = 0; i < m; i++) {
    const [x, y] = pts[(start + i) % m];
    grow(b, x, y);
    d += (i ? "L" : "M") + r2(x) + "," + r2(y);
  }
  return openEdge >= 0 ? d : d + "Z";
}

function hitFromWorldNormal(nx: number, ny: number, nz: number): Hit {
  if (nz > 0.3) return { kind: "top" };
  if (Math.abs(nx) >= Math.abs(ny)) return { kind: "side", dx: Math.sign(nx), dy: 0 };
  return { kind: "side", dx: 0, dy: Math.sign(ny) };
}

/** Width of an occlusion strip, in cells. */
const AO_W = 0.34;
export const AO_UNIT = "M0,0H1V1H0Z";

/** Screen-space image of a world vector (already view-rotated). */
const screenVec = (x: number, y: number, z: number): [number, number] => [(x - y) * TW, (x + y) * TH - z * CH];

/**
 * A soft darkening strip lying on a horizontal surface: starts at world
 * point S, runs one cell along E, fades over AO_W cells along I. Drawn as the
 * unit square under a transform so a single gradient serves every strip.
 */
function aoStrip(S: V3, E: [number, number], I: [number, number], rot: number, n: number): Prim {
  const [sx, sy] = rotPoint(S[0], S[1], rot, n);
  const [ex, ey] = rotVec(E[0], E[1], rot);
  const [ix, iy] = rotVec(I[0] * AO_W, I[1] * AO_W, rot);
  const [a, b] = screenVec(ex, ey, 0);
  const [c, d] = screenVec(ix, iy, 0);
  const [e, f] = project(sx, sy, S[2], n);
  return { d: AO_UNIT, fill: "url(#iso-ao)", hit: null, tf: `matrix(${r2(a)} ${r2(b)} ${r2(c)} ${r2(d)} ${r2(e)} ${r2(f)})` };
}

/** Strip along the cell edge toward world direction (dx, dy), on the surface at height h. */
function edgeStrip(x: number, y: number, h: number, dx: number, dy: number, rot: number, n: number): Prim | null {
  const [vx, vy] = rotVec(dx, dy, rot);
  if (vx + vy >= 0) return null; // the occluder stands in front and hides the strip
  if (dx === -1) return aoStrip([x, y, h], [0, 1], [1, 0], rot, n);
  if (dx === 1) return aoStrip([x + 1, y, h], [0, 1], [-1, 0], rot, n);
  if (dy === -1) return aoStrip([x, y, h], [1, 0], [0, 1], rot, n);
  return aoStrip([x, y + 1, h], [1, 0], [0, -1], rot, n);
}

/** Cylinder body gradient id for a colour; left and right halves each fill their own box. */
const cylId = (hex: string, side: "l" | "r") => `iso-cyl-${hex.slice(1)}-${side}`;

/** Screen-space faces for one block, back to front, with bounds. */
export function blockPrims(b: Block, rot: number, n: number, bounds: Bounds, ctx = NO_CTX): Prim[] {
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
    if (ctx & C_CONTACT) {
      // Soft contact shadow on the surface it stands on, kept inside its own cell.
      const ax = 0.5 * Math.SQRT2 * TW;
      const ay = 0.5 * Math.SQRT2 * TH;
      out.push({
        d: `M${f(cx - ax)},${f(cyBot)}A${f(ax)} ${f(ay)} 0 1 0 ${f(cx + ax)},${f(cyBot)}A${f(ax)} ${f(ay)} 0 1 0 ${f(cx - ax)},${f(cyBot)}Z`,
        fill: "url(#iso-ao-r)",
        hit: null,
      });
    }
    // Left (view +y) and right (view +x) halves of the body. The right half
    // leaves its seam edge unstroked so it never paints over the left half.
    const left = `M${f(cx - rx)},${f(cyTop)}L${f(cx - rx)},${f(cyBot)}A${f(rx)} ${f(ry)} 0 0 0 ${f(cx)},${f(cyBot + ry)}L${f(cx)},${f(cyTop + ry)}Z`;
    const right = `M${f(cx)},${f(cyBot + ry)}A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)},${f(cyBot)}L${f(cx + rx)},${f(cyTop)}L${f(cx)},${f(cyTop + ry)}`;
    const top = `M${f(cx - rx)},${f(cyTop)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)},${f(cyTop)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)},${f(cyTop)}Z`;
    const inv = (4 - (rot & 3)) & 3;
    const [lx, ly] = rotVec(0, 1, inv);
    const [rx2, ry2] = rotVec(1, 0, inv);
    out.push({ d: left, fill: `url(#${cylId(color, "l")})`, hit: hitFromWorldNormal(lx, ly, 0) });
    out.push({ d: right, fill: `url(#${cylId(color, "r")})`, hit: hitFromWorldNormal(rx2, ry2, 0) });
    if (!(ctx & C_TOP)) out.push({ d: top, fill: color, hit: { kind: "top" } });
    return out;
  }

  const dir = isDirectional(b.shape) ? (b.dir ?? 0) & 3 : 0;
  const parts = PARTS[b.shape] ?? PARTS.cube;
  const H = SHAPE_HEIGHT[b.shape];
  const turnUV = (u: number, v: number): [number, number] => {
    for (let k = 0; k < dir; k++) [u, v] = [1 - v, u];
    return [u, v];
  };
  const turnVec = (x: number, y: number): [number, number] => {
    for (let k = 0; k < dir; k++) [x, y] = [-y, x];
    return [x, y];
  };

  const placed = parts.map((faces) => {
    let depth = 0;
    const fs = faces.map((face) => {
      const local = face.pts.map(([u, v, w]) => {
        const [uu, vv] = turnUV(u, v);
        return [uu, vv, w] as V3;
      });
      const pts = local.map(([uu, vv, w]) => {
        const [X, Y] = rotPoint(b.x + uu, b.y + vv, rot, n);
        return [X, Y, b.z + w] as V3;
      });
      const [wx, wy] = turnVec(face.n[0], face.n[1]);
      const [vx, vy] = rotVec(wx, wy, rot);
      return { local, pts, world: [wx, wy, face.n[2]] as V3, view: [vx, vy, face.n[2]] as V3 };
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

  /** Is this face pressed flat against a neighbour (or the block on top)? */
  const hidden = (local: V3[], world: V3) => {
    if (!ctx) return false;
    if (world[2] > 0.99) return !!(ctx & C_TOP) && local.every((p) => Math.abs(p[2] - H) < EPS);
    if (Math.abs(world[2]) > EPS) return false;
    const i = DIRS.findIndex(([dx, dy]) => dx === Math.round(world[0]) && dy === Math.round(world[1]));
    if (i < 0) return false;
    const axis = world[0] !== 0 ? 0 : 1;
    const edge = (world[axis] > 0 ? 1 : 0) as number;
    if (!local.every((p) => Math.abs(p[axis] - edge) < EPS)) return false;
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of local) {
      lo = Math.min(lo, p[2]);
      hi = Math.max(hi, p[2]);
    }
    if (lo < 0.5 - EPS && !(ctx & coverBit(i, 0))) return false;
    if (hi > 0.5 + EPS && !(ctx & coverBit(i, 1))) return false;
    return true;
  };

  // Faces drawn so far, by their 3D edges, to find shared side-to-side seams.
  const drawn: { keys: string[]; nz: number }[] = [];
  const pk = (p: V3) => `${r2(p[0])},${r2(p[1])},${r2(p[2])}`;
  for (const part of placed) {
    for (const f of part.fs) {
      const [vx, vy, vz] = f.view;
      if (vx + vy + vz * EYE_Z <= 1e-6) continue; // faces away from the viewer
      if (hidden(f.local, f.world)) continue;
      const m = f.pts.length;
      const keys = f.pts.map((p, i) => {
        const a = pk(p);
        const c = pk(f.pts[(i + 1) % m]);
        return a < c ? a + "|" + c : c + "|" + a;
      });
      let open = -1;
      if (vz < 0.5)
        open = keys.findIndex((k) => drawn.some((o) => o.nz < 0.5 && o.keys.includes(k)));
      drawn.push({ keys, nz: vz });
      const d = pathOf(
        f.pts.map(([X, Y, Z]) => project(X, Y, Z, n)),
        bounds,
        open,
      );
      out.push({ d, fill: tone(color, faceDelta(vx, vy, vz)), hit: hitFromWorldNormal(f.world[0], f.world[1], f.world[2]) });
    }
  }

  // Occlusion: along the riser of a stair, and where a neighbour rises beside a flat top.
  if (b.shape === "stairs") {
    const [ux, uy] = turnVec(1, 0);
    const [ix, iy] = turnVec(0, 1);
    const [ox, oy] = rotVec(-ix, -iy, rot);
    if (ox + oy < 0) {
      const [su, sv] = turnUV(0, 0.5);
      out.push(aoStrip([b.x + su, b.y + sv, b.z + 0.5], [ux, uy], [ix, iy], rot, n));
    }
  } else if ((b.shape === "cube" || b.shape === "slab") && !(ctx & C_TOP)) {
    DIRS.forEach(([dx, dy], i) => {
      if (!(ctx & AO_BIT(i))) return;
      const s = edgeStrip(b.x, b.y, b.z + H, dx, dy, rot, n);
      if (s) out.push(s);
    });
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

/** Cell outline on the plane at height z. */
export function cellPath(x: number, y: number, rot: number, n: number, z = 0) {
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
      return project(X, Y, z, n);
    }),
    b,
  );
}

export const GROUND_DEPTH = 0.32;

export interface GroundColors {
  top: string;
  left: string;
  right: string;
  grid: string;
}

/** Plate tones: same light direction as the blocks, softer steps so the plate stays quiet. */
export const GROUND_LIGHT: GroundColors = { top: "#ebebee", left: "#dcdce0", right: "#cbcbd0", grid: "rgba(0,0,0,0.09)" };
export const GROUND_DARK: GroundColors = { top: "#29292e", left: "#212125", right: "#19191c", grid: "rgba(255,255,255,0.07)" };

/** Base plate under the grid: top diamond plus the two visible sides. */
export function groundPrims(n: number, bounds: Bounds, colors: Omit<GroundColors, "grid"> = GROUND_LIGHT) {
  const P = (x: number, y: number, z: number) => project(x, y, z, n);
  const g = -GROUND_DEPTH;
  return [
    { d: pathOf([P(0, n, 0), P(n, n, 0), P(n, n, g), P(0, n, g)], bounds), fill: colors.left },
    { d: pathOf([P(n, 0, 0), P(n, n, 0), P(n, n, g), P(n, 0, g)], bounds), fill: colors.right },
    { d: pathOf([P(0, 0, 0), P(n, 0, 0), P(n, n, 0), P(0, n, 0)], bounds), fill: colors.top },
  ];
}

/** Occlusion strips on the ground plate next to blocks standing on it. */
export function groundShades(idx: BlockIndex, rot: number, n: number): Prim[] {
  const out: Prim[] = [];
  const stands = (x: number, y: number) => (idx.get(cellKey(x, y)) ?? []).some((o) => o.z < EPS && o.shape !== "cylinder");
  for (let x = 0; x < n; x++)
    for (let y = 0; y < n; y++) {
      if (stands(x, y)) continue;
      for (const [dx, dy] of DIRS) {
        if (!stands(x + dx, y + dy)) continue;
        const s = edgeStrip(x, y, 0, dx, dy, rot, n);
        if (s) out.push(s);
      }
    }
  return out;
}

/* ─── Paint servers ─── */

/** Gradient definitions for every `url(#…)` used by these prims, as SVG markup. */
export function defsFor(prims: Iterable<Prim>) {
  const ids = new Set<string>();
  for (const p of prims) if (p.fill.startsWith("url(#")) ids.add(p.fill.slice(5, -1));
  return defsMarkup(ids);
}

export function defsMarkup(ids: Iterable<string>) {
  let s = "";
  for (const id of ids) {
    if (id === "iso-ao") {
      s +=
        `<linearGradient id="iso-ao" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="#000" stop-opacity="0.2"/><stop offset="0.35" stop-color="#000" stop-opacity="0.09"/>` +
        `<stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;
    } else if (id === "iso-ao-r") {
      s +=
        `<radialGradient id="iso-ao-r"><stop offset="0.86" stop-color="#000" stop-opacity="0.26"/>` +
        `<stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
    } else {
      const m = /^iso-cyl-([0-9a-f]{6})-([lr])$/.exec(id);
      if (!m) continue;
      const hex = "#" + m[1];
      let stops = "";
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        // Screen position across the half → angle around the body.
        const cos = m[2] === "l" ? t - 1 : t;
        const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
        const nx = S2 * (cos + sin);
        const ny = S2 * (sin - cos);
        stops += `<stop offset="${r2(t)}" stop-color="${tone(hex, faceDelta(nx, ny, 0))}"/>`;
      }
      s += `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>`;
    }
  }
  return s;
}

/* ─── Scene → SVG string ─── */

export function renderScene(blocks: Block[], rot: number, n: number, ground: boolean) {
  const bounds = emptyBounds();
  const g = ground ? groundPrims(n, bounds) : [];
  const idx = indexBlocks(blocks);
  const shades = ground ? groundShades(idx, rot, n) : [];
  const items = sortBlocks(blocks, rot, n).map((b) => ({ b, prims: blockPrims(b, rot, n, bounds, blockCtx(b, idx, ground)) }));
  return { ground: g, shades, items, bounds };
}

export interface ExportOptions {
  ground: boolean;
  grid?: boolean;
  /** Solid backdrop colour, or null for transparent. */
  background?: string | null;
  /** Use the dark ground plate. */
  dark?: boolean;
  pad?: number;
}

const attrs = (p: Prim) =>
  p.hit === null
    ? `d="${p.d}" fill="${p.fill}"${p.tf ? ` transform="${p.tf}"` : ""}`
    : `d="${p.d}" fill="${p.fill}" stroke="${p.fill}" stroke-width="0.5" stroke-linejoin="round"`;

export function sceneToSvg(blocks: Block[], rot: number, n: number, opts: ExportOptions) {
  const { ground, grid = false, background = null, dark = false, pad = 24 } = opts;
  const colors = dark ? GROUND_DARK : GROUND_LIGHT;
  const { shades, items, bounds } = renderScene(blocks, rot, n, ground);
  const g = ground ? groundPrims(n, emptyBounds(), colors) : [];
  if (grid) for (const [x, y] of [[0, 0], [n, 0], [n, n], [0, n]]) grow(bounds, ...project(...rotPoint(x, y, rot, n), 0, n));
  if (!isFinite(bounds.minX)) Object.assign(bounds, { minX: 0, minY: 0, maxX: 1, maxY: 1 });
  const x = Math.floor(bounds.minX - pad);
  const y = Math.floor(bounds.minY - pad);
  const w = Math.ceil(bounds.maxX - bounds.minX + pad * 2);
  const h = Math.ceil(bounds.maxY - bounds.minY + pad * 2);
  const all = [...shades, ...items.flatMap((it) => it.prims)];
  const defs = defsFor(all);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">\n`;
  if (defs) s += `  <defs>${defs}</defs>\n`;
  if (background) s += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${background}"/>\n`;
  if (g.length) s += `  <g id="ground">${g.map((p) => `<path ${attrs({ ...p, hit: { kind: "top" } })}/>`).join("")}</g>\n`;
  if (grid) {
    let cells = "";
    for (let cx = 0; cx < n; cx++) for (let cy = 0; cy < n; cy++) cells += cellPath(cx, cy, rot, n);
    s += `  <path id="grid" d="${cells}" fill="none" stroke="${colors.grid}" stroke-width="0.6"/>\n`;
  }
  if (shades.length) s += `  <g id="ground-shade">${shades.map((p) => `<path ${attrs(p)}/>`).join("")}</g>\n`;
  for (const it of items) s += `  <g>${it.prims.map((p) => `<path ${attrs(p)}/>`).join("")}</g>\n`;
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
