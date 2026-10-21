/* Data model, presets and CSS/Tailwind builders for the Shadow studio. */

export type Layer = {
  id: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  opacity: number;
  color: string; // #rrggbb
  inset: boolean;
  visible: boolean;
};

export type BorderStyle = "none" | "solid" | "dashed" | "dotted" | "double";

export type Border = {
  style: BorderStyle;
  width: number;
  color: string;
  radius: number;
};

export type PreviewKind = "button" | "card" | "input" | "badge" | "profile";

/** "auto" follows the site theme tokens; anything else is a hex colour. */
export type Paint = "auto" | string;

export type Preset = {
  name: string;
  desc: string;
  layers: Omit<Layer, "id" | "visible">[];
  border: Border;
  surface?: Paint;
  background?: Paint;
};

let uid = 0;
export const newId = () => `l${Date.now().toString(36)}${(uid++).toString(36)}`;

export const withIds = (layers: Omit<Layer, "id" | "visible">[], prefix?: string): Layer[] =>
  layers.map((l, i) => ({ ...l, id: prefix ? `${prefix}-${i}` : newId(), visible: true }));

/* ── colour helpers ─────────────────────────────── */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0) as [number, number, number];
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Readable text colour on top of a paint. */
export const inkOn = (paint: Paint) =>
  paint === "auto" ? "var(--mk-text)" : luminance(paint) > 0.4 ? "#111113" : "#ffffff";

/* ── formatting ─────────────────────────────────── */
const num = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return Object.is(r, -0) ? 0 : r;
};
export const px = (v: number) => (num(v) === 0 ? "0" : `${num(v)}px`);
const alpha = (a: number) => String(Math.round(a * 100) / 100);

export function rgba(hex: string, a: number, compact = false) {
  const [r, g, b] = hexToRgb(hex);
  return compact ? `rgba(${r},${g},${b},${alpha(a)})` : `rgba(${r}, ${g}, ${b}, ${alpha(a)})`;
}

export function layerToCss(l: Layer, compact = false) {
  const parts = [px(l.x), px(l.y), px(l.blur), px(l.spread), rgba(l.color, l.opacity, compact)];
  return (l.inset ? "inset " : "") + parts.join(" ");
}

export const visibleLayers = (layers: Layer[]) => layers.filter((l) => l.visible);

export function boxShadow(layers: Layer[]) {
  const v = visibleLayers(layers);
  return v.length ? v.map((l) => layerToCss(l)).join(", ") : "none";
}

export const borderCss = (b: Border) => (b.style === "none" || b.width === 0 ? "none" : `${b.width}px ${b.style} ${b.color}`);

export function buildCss(layers: Layer[], border: Border) {
  const v = visibleLayers(layers);
  const lines: string[] = [];
  if (v.length === 0) lines.push("box-shadow: none;");
  else if (v.length === 1) lines.push(`box-shadow: ${layerToCss(v[0])};`);
  else lines.push(`box-shadow:\n${v.map((l) => `  ${layerToCss(l)}`).join(",\n")};`);
  if (border.style !== "none" && border.width > 0) lines.push(`border: ${borderCss(border)};`);
  lines.push(`border-radius: ${px(border.radius)};`);
  return lines.join("\n");
}

export function buildTailwind(layers: Layer[], border: Border) {
  const v = visibleLayers(layers);
  const cls: string[] = [];
  cls.push(v.length ? `shadow-[${v.map((l) => layerToCss(l, true).replace(/ /g, "_")).join(",")}]` : "shadow-none");
  if (border.style !== "none" && border.width > 0) {
    cls.push(border.width === 1 ? "border" : `border-[${border.width}px]`);
    if (border.style !== "solid") cls.push(`border-${border.style}`);
    cls.push(`border-[${border.color}]`);
  }
  cls.push(border.radius === 0 ? "rounded-none" : `rounded-[${px(border.radius)}]`);
  return cls.join(" ");
}

/* ── geometry ───────────────────────────────────── */
export const MAX_DIST = 64;

/** Scale every length so mini previews stay in proportion. */
export const scaleLayers = (layers: Layer[], k: number): Layer[] =>
  layers.map((l) => ({ ...l, x: l.x * k, y: l.y * k, blur: l.blur * k, spread: l.spread * k }));

/** The layer that defines the "light direction": the longest outer offset. */
export function primaryOffset(layers: Layer[]) {
  let best: { angle: number; dist: number } | null = null;
  for (const l of layers) {
    if (!l.visible || l.inset) continue;
    const d = Math.hypot(l.x, l.y);
    if (!best || d > best.dist) best = { angle: Math.atan2(l.y, l.x), dist: d };
  }
  return best;
}

/** Rotate + scale every layer offset so the primary layer points at `angle` with length `dist`. */
export function aimLayers(base: Layer[], angle: number, dist: number): Layer[] {
  const p = primaryOffset(base);
  const round = (v: number) => Math.round(v * 10) / 10;
  if (!p || p.dist < 0.01) {
    return base.map((l) =>
      l.inset ? l : { ...l, x: round(Math.cos(angle) * dist), y: round(Math.sin(angle) * dist) },
    );
  }
  const delta = angle - p.angle;
  const k = dist / p.dist;
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);
  return base.map((l) => ({
    ...l,
    x: round((l.x * cos - l.y * sin) * k),
    y: round((l.x * sin + l.y * cos) * k),
  }));
}

/* ── smooth generator ───────────────────────────── */
export type SmoothParams = {
  count: number;
  distance: number;
  softness: number;
  darkness: number;
  color: string;
};

/** Offsets roughly double each layer (exponential ease-in), alpha is split so the stack
    reaches `darkness` where all layers overlap. */
export function smoothLayers(p: SmoothParams, angleRad: number): Omit<Layer, "id" | "visible">[] {
  const n = p.count;
  const per = 1 - Math.pow(1 - p.darkness, 1 / n);
  const round = (v: number) => Math.round(v * 10) / 10;
  return Array.from({ length: n }, (_, i) => {
    const e = (Math.pow(2, i + 1) - 1) / (Math.pow(2, n) - 1);
    const d = p.distance * e;
    return {
      x: round(Math.cos(angleRad) * d),
      y: round(Math.sin(angleRad) * d),
      blur: round(d * p.softness),
      spread: round(-d * 0.15),
      opacity: Math.round(per * 100) / 100,
      color: p.color,
      inset: false,
    };
  });
}

/* ── presets ────────────────────────────────────── */
const ink = "#0b0b0c";
const L = (x: number, y: number, blur: number, spread: number, opacity: number, color = ink, inset = false) => ({
  x, y, blur, spread, opacity, color, inset,
});
const noBorder: Border = { style: "none", width: 1, color: "#e4e4e7", radius: 14 };

export const PRESETS: Preset[] = [
  {
    name: "Subtle",
    desc: "Hairline lift",
    layers: [L(0, 1, 2, 0, 0.06), L(0, 1, 3, 0, 0.1)],
    border: { style: "solid", width: 1, color: "#e4e4e7", radius: 12 },
  },
  {
    name: "Soft",
    desc: "Diffuse, calm",
    layers: [L(0, 1, 2, 0, 0.04), L(0, 4, 8, -2, 0.06), L(0, 12, 24, -6, 0.1)],
    border: { ...noBorder, radius: 16 },
  },
  {
    name: "Floating",
    desc: "High elevation",
    layers: [L(0, 2, 4, 0, 0.04), L(0, 12, 20, -8, 0.12), L(0, 32, 56, -16, 0.22)],
    border: { ...noBorder, radius: 18 },
  },
  {
    name: "Sharp",
    desc: "Crisp ring + edge",
    layers: [L(0, 0, 0, 1, 0.08), L(0, 2, 0, 0, 0.1)],
    border: { ...noBorder, radius: 8 },
  },
  {
    name: "Layered",
    desc: "Five doubling layers",
    layers: [L(0, 1, 1, 0, 0.08), L(0, 2, 2, 0, 0.08), L(0, 4, 4, 0, 0.08), L(0, 8, 8, 0, 0.08), L(0, 16, 16, 0, 0.08)],
    border: { ...noBorder, radius: 14 },
  },
  {
    name: "Inner glow",
    desc: "Lit from inside",
    layers: [L(0, 0, 14, 2, 0.35, "#1f6bff", true), L(0, 0, 0, 1, 0.5, "#1f6bff", true)],
    border: { ...noBorder, radius: 14 },
  },
  {
    name: "Neumorphic",
    desc: "Extruded surface",
    layers: [L(10, 10, 20, 0, 0.6, "#a3b1c6"), L(-10, -10, 20, 0, 0.9, "#ffffff")],
    border: { ...noBorder, radius: 22 },
    surface: "#e0e5ec",
    background: "#e0e5ec",
  },
  {
    name: "Coloured glow",
    desc: "Tinted halo",
    layers: [L(0, 2, 6, 0, 0.3, "#5b5bf6"), L(0, 12, 32, -6, 0.55, "#5b5bf6")],
    border: { ...noBorder, radius: 14 },
    surface: "#5b5bf6",
  },
  {
    name: "Brutalist",
    desc: "Hard offset",
    layers: [L(6, 6, 0, 0, 1, "#000000")],
    border: { style: "solid", width: 2, color: "#000000", radius: 4 },
    surface: "#fde68a",
    background: "#fafaf9",
  },
  {
    name: "Pressed",
    desc: "Pushed in",
    layers: [L(0, 2, 4, 0, 0.12, ink, true), L(0, 1, 1, 0, 0.06, ink, true)],
    border: { style: "solid", width: 1, color: "#d4d4d8", radius: 12 },
  },
];

export const DEFAULT_PRESET = PRESETS[1];

export const SWATCHES = ["#0b0b0c", "#64748b", "#1f6bff", "#5b5bf6", "#ec4899", "#ef4444", "#f97316", "#ffffff"];
export const SURFACE_SWATCHES = ["#ffffff", "#f4f4f5", "#18181b", "#1f6bff", "#5b5bf6", "#fde68a", "#e0e5ec"];
export const BORDER_SWATCHES = ["#e4e4e7", "#d4d4d8", "#a1a1aa", "#000000", "#1f6bff", "#ffffff"];
