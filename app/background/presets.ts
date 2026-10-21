/* Background model + presets for the background playground.
   A background is an optional colour plus a stack of image layers (gradients
   or SVG data URIs), each with its own size/position. CSS and Tailwind output
   are both generated from this one shape. */

import type { CSSProperties } from "react";

export type Layer = { image: string; size?: string; position?: string };
export type Bg = { color?: string; layers: Layer[] };
export type Preset = { id: string; name: string; group: string; bg: Bg };

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const lin = (css: string): Bg => ({ layers: [{ image: css }] });
const mesh = (color: string, ...spots: [string, string, number][]): Bg => ({
  color,
  layers: spots.map(([at, c, stop]) => ({ image: `radial-gradient(at ${at}, ${c} 0px, transparent ${stop}%)` })),
});

export const gradientPresets: Preset[] = [
  // Mesh & glow
  { id: "mesh-pastel", name: "Pastel mesh", group: "Mesh & glow", bg: mesh("#ffffff", ["0% 0%", "#c7d2fe", 55], ["100% 0%", "#fbcfe8", 55], ["100% 100%", "#bae6fd", 55], ["0% 100%", "#fde68a", 55]) },
  { id: "mesh-night", name: "Night mesh", group: "Mesh & glow", bg: mesh("#0b1020", ["15% 20%", "#4f46e5", 45], ["85% 25%", "#db2777", 45], ["55% 95%", "#0ea5e9", 50]) },
  { id: "mesh-citrus", name: "Citrus mesh", group: "Mesh & glow", bg: mesh("#fff7ed", ["10% 10%", "#fb923c", 50], ["90% 15%", "#facc15", 50], ["60% 95%", "#f472b6", 55]) },
  { id: "mesh-lagoon", name: "Lagoon", group: "Mesh & glow", bg: mesh("#03211c", ["20% 25%", "#10b981", 50], ["85% 15%", "#06b6d4", 50], ["60% 95%", "#6366f1", 55]) },
  {
    id: "glow-light",
    name: "Blue glow",
    group: "Mesh & glow",
    bg: { color: "#ffffff", layers: [{ image: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(31, 107, 255, 0.28), transparent 70%)" }] },
  },
  {
    id: "glow-dark",
    name: "Dark glow",
    group: "Mesh & glow",
    bg: { color: "#0e0e10", layers: [{ image: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(59, 125, 255, 0.45), transparent 70%)" }] },
  },
  { id: "holo", name: "Holo", group: "Mesh & glow", bg: lin("conic-gradient(from 180deg at 50% 50%, #f0abfc, #a5b4fc, #67e8f9, #86efac, #fde68a, #f0abfc)") },
  {
    id: "spotlight",
    name: "Spotlight",
    group: "Mesh & glow",
    bg: { color: "#09090b", layers: [{ image: "radial-gradient(circle at 50% 120%, rgba(255, 255, 255, 0.18), transparent 60%)" }, { image: "radial-gradient(circle at 50% -20%, rgba(168, 85, 247, 0.35), transparent 55%)" }] },
  },
  // Classic linear
  { id: "sunset", name: "Sunset", group: "Linear", bg: lin("linear-gradient(135deg, #f97316, #ec4899)") },
  { id: "ocean", name: "Ocean", group: "Linear", bg: lin("linear-gradient(135deg, #06b6d4, #3b82f6)") },
  { id: "midnight", name: "Midnight", group: "Linear", bg: lin("linear-gradient(135deg, #1e1b4b, #7c3aed, #1e1b4b)") },
  { id: "cyberpunk", name: "Cyberpunk", group: "Linear", bg: lin("linear-gradient(135deg, #c026d3, #7c3aed)") },
  { id: "candy", name: "Candy", group: "Linear", bg: lin("linear-gradient(135deg, #f9a8d4, #c084fc, #818cf8)") },
  { id: "aurora", name: "Aurora", group: "Linear", bg: lin("linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)") },
  { id: "lava", name: "Lava", group: "Linear", bg: lin("linear-gradient(135deg, #dc2626, #f97316, #facc15)") },
  { id: "frost", name: "Frost", group: "Linear", bg: lin("linear-gradient(135deg, #e0f2fe, #bae6fd, #7dd3fc)") },
  { id: "neon", name: "Neon", group: "Linear", bg: lin("linear-gradient(135deg, #22d3ee, #a855f7, #ec4899)") },
  { id: "forest", name: "Forest", group: "Linear", bg: lin("linear-gradient(135deg, #065f46, #059669, #34d399)") },
  { id: "peach", name: "Peach", group: "Linear", bg: lin("linear-gradient(135deg, #fdba74, #fb923c, #f472b6)") },
  { id: "night-sky", name: "Night sky", group: "Linear", bg: lin("linear-gradient(135deg, #0f172a, #1e3a5f, #7c3aed, #0f172a)") },
];

/* Neutral grey with alpha reads on both white and near-black pages, so most
   grid presets leave the background colour transparent. */
/** Neutral grey #808080 with a two-digit hex alpha. */
const grey = (alpha: string) => `#808080${alpha}`;
const plus = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><path d='M14 9v10M9 14h10' stroke='#808080' stroke-opacity='0.45' stroke-width='1'/></svg>`);
const waves = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='20'><path d='M0 10 Q 12 0 24 10 T 48 10' fill='none' stroke='#808080' stroke-opacity='0.35' stroke-width='1'/></svg>`);

export const gridPresets: Preset[] = [
  { id: "dot-sm", name: "Dots", group: "Adapts to your theme", bg: { layers: [{ image: `radial-gradient(circle, ${grey("80")} 1px, transparent 1px)`, size: "16px 16px" }] } },
  { id: "dot-lg", name: "Large dots", group: "Adapts to your theme", bg: { layers: [{ image: `radial-gradient(circle, ${grey("80")} 1.5px, transparent 1.5px)`, size: "28px 28px" }] } },
  {
    id: "halftone",
    name: "Offset dots",
    group: "Adapts to your theme",
    bg: {
      layers: [
        { image: `radial-gradient(circle, ${grey("66")} 1px, transparent 1.5px)`, size: "20px 20px", position: "0 0" },
        { image: `radial-gradient(circle, ${grey("66")} 1px, transparent 1.5px)`, size: "20px 20px", position: "10px 10px" },
      ],
    },
  },
  { id: "plus", name: "Plus", group: "Adapts to your theme", bg: { layers: [{ image: plus, size: "28px 28px" }] } },
  {
    id: "square",
    name: "Square",
    group: "Adapts to your theme",
    bg: { layers: [{ image: `linear-gradient(to right, ${grey("20")} 1px, transparent 1px), linear-gradient(to bottom, ${grey("20")} 1px, transparent 1px)`, size: "24px 24px" }] },
  },
  {
    id: "hairline",
    name: "Hairline",
    group: "Adapts to your theme",
    bg: { layers: [{ image: `linear-gradient(to right, ${grey("14")} 1px, transparent 1px), linear-gradient(to bottom, ${grey("14")} 1px, transparent 1px)`, size: "48px 48px" }] },
  },
  {
    id: "dense",
    name: "Dense",
    group: "Adapts to your theme",
    bg: { layers: [{ image: `linear-gradient(to right, ${grey("12")} 1px, transparent 1px), linear-gradient(to bottom, ${grey("12")} 1px, transparent 1px)`, size: "12px 12px" }] },
  },
  {
    id: "graph",
    name: "Graph paper",
    group: "Adapts to your theme",
    bg: {
      layers: [
        { image: `linear-gradient(to right, ${grey("30")} 1px, transparent 1px), linear-gradient(to bottom, ${grey("30")} 1px, transparent 1px)`, size: "60px 60px" },
        { image: `linear-gradient(to right, ${grey("10")} 1px, transparent 1px), linear-gradient(to bottom, ${grey("10")} 1px, transparent 1px)`, size: "12px 12px" },
      ],
    },
  },
  { id: "checker", name: "Checker", group: "Adapts to your theme", bg: { layers: [{ image: `conic-gradient(${grey("14")} 25%, transparent 0 50%, ${grey("14")} 0 75%, transparent 0)`, size: "24px 24px" }] } },
  { id: "waves", name: "Waves", group: "Adapts to your theme", bg: { layers: [{ image: waves, size: "48px 20px" }] } },
  {
    id: "cross",
    name: "Cross",
    group: "Adapts to your theme",
    bg: {
      layers: [
        {
          image: `radial-gradient(circle, transparent 3px, ${grey("10")} 3px, ${grey("10")} 3.5px, transparent 3.5px), linear-gradient(to right, ${grey("18")} 1px, transparent 1px), linear-gradient(to bottom, ${grey("18")} 1px, transparent 1px)`,
          size: "32px 32px",
        },
      ],
    },
  },
  {
    id: "diamond",
    name: "Diamond",
    group: "Adapts to your theme",
    bg: {
      layers: [
        {
          image: `linear-gradient(45deg, ${grey("15")} 25%, transparent 25%), linear-gradient(-45deg, ${grey("15")} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${grey("15")} 75%), linear-gradient(-45deg, transparent 75%, ${grey("15")} 75%)`,
          size: "30px 30px",
        },
      ],
    },
  },
  {
    id: "isometric",
    name: "Isometric",
    group: "Adapts to your theme",
    bg: {
      layers: [
        {
          image: `linear-gradient(30deg, ${grey("15")} 12%, transparent 12.5%, transparent 87%, ${grey("15")} 87.5%, ${grey("15")}), linear-gradient(150deg, ${grey("15")} 12%, transparent 12.5%, transparent 87%, ${grey("15")} 87.5%, ${grey("15")}), linear-gradient(30deg, ${grey("15")} 12%, transparent 12.5%, transparent 87%, ${grey("15")} 87.5%, ${grey("15")}), linear-gradient(150deg, ${grey("15")} 12%, transparent 12.5%, transparent 87%, ${grey("15")} 87.5%, ${grey("15")})`,
          size: "40px 70px",
        },
      ],
    },
  },
  { id: "striped", name: "Striped", group: "Adapts to your theme", bg: { layers: [{ image: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${grey("12")} 10px, ${grey("12")} 11px)` }] } },
  {
    id: "blueprint",
    name: "Blueprint",
    group: "With a colour",
    bg: {
      color: "#1e3a5f",
      layers: [{ image: "linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)", size: "20px 20px" }],
    },
  },
  {
    id: "grid-glow",
    name: "Grid glow",
    group: "With a colour",
    bg: {
      color: "#0b0b0f",
      layers: [
        { image: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59, 125, 255, 0.35), transparent 70%)" },
        { image: "linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px)", size: "32px 32px" },
      ],
    },
  },
  {
    id: "paper",
    name: "Notebook",
    group: "With a colour",
    bg: {
      color: "#fffdf5",
      layers: [
        { image: "linear-gradient(90deg, transparent 47px, rgba(239, 68, 68, 0.35) 47px, rgba(239, 68, 68, 0.35) 48px, transparent 48px)" },
        { image: "linear-gradient(rgba(59, 130, 246, 0.18) 1px, transparent 1px)", size: "100% 28px" },
      ],
    },
  },
];

/* ── Grain ── */
export const grainLayer = (opacity: number): Layer => ({
  image: svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='${opacity}'/></svg>`,
  ),
  size: "220px 220px",
});

/* ── Output ── */

/* Split "a(...), b(...)" at top-level commas so every CSS image gets its own
   size/position entry (otherwise the size list cycles across images). */
function splitImages(image: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < image.length; i++) {
    const ch = image[i];
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      out.push(image.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(image.slice(start).trim());
  return out.filter(Boolean);
}

const flatten = (bg: Bg): Bg => ({
  ...bg,
  layers: bg.layers.flatMap((l) => splitImages(l.image).map((image) => ({ ...l, image }))),
});

const hasAny = (layers: Layer[], key: "size" | "position") => layers.some((l) => l[key]);
const list = (layers: Layer[], key: "size" | "position", fallback: string) => layers.map((l) => l[key] ?? fallback);

export function bgToStyle(input: Bg, fallbackColor = "transparent"): CSSProperties {
  const bg = flatten(input);
  return {
    backgroundColor: bg.color ?? fallbackColor,
    backgroundImage: bg.layers.map((l) => l.image).join(", ") || "none",
    backgroundSize: hasAny(bg.layers, "size") ? list(bg.layers, "size", "auto").join(", ") : undefined,
    backgroundPosition: hasAny(bg.layers, "position") ? list(bg.layers, "position", "0 0").join(", ") : undefined,
  };
}

export function bgToCss(input: Bg, { selector = ".custom-bg", noteTransparent = false } = {}): string {
  const bg = flatten(input);
  const lines: string[] = [];
  if (bg.color) lines.push(`  background-color: ${bg.color};`);
  else if (noteTransparent) lines.push(`  /* No background colour: the pattern sits on your page colour */`);
  if (bg.layers.length === 1) lines.push(`  background-image: ${bg.layers[0].image};`);
  else if (bg.layers.length > 1) lines.push(`  background-image:\n${bg.layers.map((l) => `    ${l.image}`).join(",\n")};`);
  if (hasAny(bg.layers, "size")) lines.push(`  background-size: ${list(bg.layers, "size", "auto").join(", ")};`);
  if (hasAny(bg.layers, "position")) lines.push(`  background-position: ${list(bg.layers, "position", "0 0").join(", ")};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

/* Tailwind v4 arbitrary values: spaces become underscores. */
const tw = (v: string) => v.replace(/,\s+/g, ",").replace(/_/g, "\\_").replace(/\s+/g, "_");

export function bgToTailwind(input: Bg): string {
  const bg = flatten(input);
  const classes: string[] = [];
  if (bg.color) classes.push(`bg-[${bg.color}]`);
  if (bg.layers.length) classes.push(`bg-[image:${tw(bg.layers.map((l) => l.image).join(","))}]`);
  if (hasAny(bg.layers, "size")) classes.push(`bg-size-[${tw(list(bg.layers, "size", "auto").join(","))}]`);
  if (hasAny(bg.layers, "position")) classes.push(`bg-position-[${tw(list(bg.layers, "position", "0 0").join(","))}]`);
  return `<div className="${classes.join(" ")}" />`;
}
