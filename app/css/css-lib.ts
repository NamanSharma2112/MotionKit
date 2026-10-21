/* State, presets and CSS output for the CSS playground. */

export type Props = {
  width: number;
  height: number;
  radius: number;
  rotate: number;
  scale: number;
  skewX: number;
  skewY: number;
  tx: number;
  ty: number;
  blur: number;
  opacity: number;
  brightness: number; // %
  saturate: number; // %
  angle: number; // gradient angle, deg
  c1: string;
  c2: string;
};

export const DEFAULTS: Props = {
  width: 180,
  height: 180,
  radius: 28,
  rotate: 0,
  scale: 1,
  skewX: 0,
  skewY: 0,
  tx: 0,
  ty: 0,
  blur: 0,
  opacity: 1,
  brightness: 100,
  saturate: 100,
  angle: 135,
  c1: "#1f6bff",
  c2: "#a855f7",
};

export type Group = "shape" | "transform" | "effects" | "fill";

export const GROUP_KEYS: Record<Group, (keyof Props)[]> = {
  shape: ["width", "height", "radius"],
  transform: ["rotate", "scale", "skewX", "skewY", "tx", "ty"],
  effects: ["blur", "opacity", "brightness", "saturate"],
  fill: ["angle", "c1", "c2"],
};

export type Preset = { name: string; desc: string; props: Partial<Props> };

export const PRESETS: Preset[] = [
  { name: "Default", desc: "Clean slate", props: {} },
  { name: "Pill", desc: "Wide and round", props: { width: 240, height: 88, radius: 44, angle: 90, c1: "#1f6bff", c2: "#22d3ee" } },
  { name: "Tilted card", desc: "A playful lean", props: { width: 220, height: 150, radius: 20, rotate: -8, ty: -6, c1: "#f97316", c2: "#ec4899" } },
  { name: "Diamond", desc: "Rotated square", props: { width: 140, height: 140, radius: 18, rotate: 45, c1: "#a855f7", c2: "#6366f1" } },
  { name: "Circle", desc: "Full radius", props: { radius: 90, angle: 160, c1: "#22c55e", c2: "#14b8a6" } },
  { name: "Ghost", desc: "Faded + soft", props: { scale: 0.92, blur: 3, opacity: 0.55, saturate: 60, c1: "#64748b", c2: "#cbd5e1" } },
  { name: "Slanted", desc: "Skewed slab", props: { width: 240, height: 110, radius: 14, skewX: -14, angle: 90, c1: "#334155", c2: "#94a3b8" } },
  { name: "Vivid", desc: "Punchy colour", props: { scale: 1.08, brightness: 112, saturate: 180, angle: 45, c1: "#ef4444", c2: "#f59e0b" } },
];

export const EASINGS = [
  { name: "Ease out", value: "cubic-bezier(0.23, 1, 0.32, 1)" },
  { name: "Ease in-out", value: "cubic-bezier(0.77, 0, 0.175, 1)" },
  { name: "Overshoot", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { name: "Linear", value: "linear" },
] as const;

const n = (v: number) => String(Math.round(v * 100) / 100);

export function transformOf(p: Props) {
  const parts: string[] = [];
  if (p.tx || p.ty) parts.push(`translate(${n(p.tx)}px, ${n(p.ty)}px)`);
  if (p.rotate) parts.push(`rotate(${n(p.rotate)}deg)`);
  if (p.scale !== 1) parts.push(`scale(${n(p.scale)})`);
  if (p.skewX || p.skewY) parts.push(p.skewY ? `skew(${n(p.skewX)}deg, ${n(p.skewY)}deg)` : `skewX(${n(p.skewX)}deg)`);
  return parts.length ? parts.join(" ") : "none";
}

export function filterOf(p: Props) {
  const parts: string[] = [];
  if (p.blur) parts.push(`blur(${n(p.blur)}px)`);
  if (p.brightness !== 100) parts.push(`brightness(${n(p.brightness)}%)`);
  if (p.saturate !== 100) parts.push(`saturate(${n(p.saturate)}%)`);
  return parts.length ? parts.join(" ") : "none";
}

export const backgroundOf = (p: Props) => `linear-gradient(${n(p.angle)}deg, ${p.c1}, ${p.c2})`;

/** Properties that differ from the defaults, in transition-list form. */
export function changedProps(p: Props) {
  const list: string[] = [];
  if (transformOf(p) !== "none") list.push("transform");
  if (filterOf(p) !== "none") list.push("filter");
  if (p.opacity !== 1) list.push("opacity");
  if (p.radius !== DEFAULTS.radius) list.push("border-radius");
  if (p.width !== DEFAULTS.width) list.push("width");
  if (p.height !== DEFAULTS.height) list.push("height");
  return list;
}

export function buildCss(p: Props, transition: { on: boolean; duration: number; easing: string }) {
  const lines = [
    `width: ${n(p.width)}px;`,
    `height: ${n(p.height)}px;`,
    `border-radius: ${n(p.radius)}px;`,
    `background: ${backgroundOf(p)};`,
  ];
  const t = transformOf(p);
  if (t !== "none") lines.push(`transform: ${t};`);
  const f = filterOf(p);
  if (f !== "none") lines.push(`filter: ${f};`);
  if (p.opacity !== 1) lines.push(`opacity: ${n(p.opacity)};`);
  if (transition.on) {
    const props = changedProps(p);
    const list = (props.length ? props : ["transform"]).map((x) => `${x} ${transition.duration}ms ${transition.easing}`);
    lines.push(list.length === 1 ? `transition: ${list[0]};` : `transition:\n    ${list.join(",\n    ")};`);
  }
  return `.element {\n${lines.map((l) => `  ${l}`).join("\n")}\n}`;
}

export const SWATCHES = ["#1f6bff", "#22d3ee", "#a855f7", "#ec4899", "#ef4444", "#f97316", "#22c55e", "#0b0b0c"];
