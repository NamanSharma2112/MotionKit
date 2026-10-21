/* Image → SVG converters used by the "Image to SVG" and "ASCII pattern" modes.
   Both sample the image on a small canvas and emit plain SVG element strings
   sized for the studio's 800×450 viewBox. */

import { VIEW_H, VIEW_W } from "./shapes";

export type VecStyle = "pixel" | "halftone" | "triangle";
export type AsciiFilter = "none" | "grayscale" | "sepia" | "blur" | "invert";

const ASCII_CHARS = ["@", "#", "S", "%", "?", "*", "+", ";", ":", ",", "."];

function sample(img: HTMLImageElement, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

export function imageToAscii(img: HTMLImageElement): string {
  const w = 80;
  const h = 45;
  const data = sample(img, w, h);
  if (!data) return "";
  let out = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 128) continue;
      const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      const ch = ASCII_CHARS[Math.floor(brightness * (ASCII_CHARS.length - 1))];
      out += `      <text x="${x * 10 + 5}" y="${y * 10 + 8}" font-family="monospace" font-size="10" fill="currentColor" text-anchor="middle">${ch}</text>\n`;
    }
  }
  return out;
}

export function vectorizeImage(
  img: HTMLImageElement,
  { style, resolution, quantize }: { style: VecStyle; resolution: number; quantize: number },
): string {
  const imgRatio = img.width / img.height;
  const canvasRatio = VIEW_W / VIEW_H;
  let w = resolution;
  let h = Math.max(1, Math.round(w / imgRatio));
  if (imgRatio < canvasRatio) {
    h = resolution;
    w = Math.max(1, Math.round(h * imgRatio));
  }
  const data = sample(img, w, h);
  if (!data) return "";

  const cellW = VIEW_W / Math.max(w, h * canvasRatio);
  const cellH = VIEW_H / Math.max(h, w / canvasRatio);
  const offsetX = (VIEW_W - w * cellW) / 2;
  const offsetY = (VIEW_H - h * cellH) / 2;
  const f = (n: number) => n.toFixed(1);
  const q = (v: number) => Math.min(255, Math.round(v / quantize) * quantize);

  let out = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (data[i + 3] < 10) continue;
      const hex = `#${((1 << 24) | (q(r) << 16) | (q(g) << 8) | q(b)).toString(16).slice(1)}`;
      const px = offsetX + x * cellW;
      const py = offsetY + y * cellH;

      if (style === "pixel") {
        out += `  <rect x="${f(px)}" y="${f(py)}" width="${f(cellW + 0.5)}" height="${f(cellH + 0.5)}" fill="${hex}" />\n`;
      } else if (style === "halftone") {
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const radius = (1 - brightness) * Math.min(cellW, cellH) * 0.6;
        if (radius > 0.5) out += `  <circle cx="${f(px + cellW / 2)}" cy="${f(py + cellH / 2)}" r="${f(radius)}" fill="${hex}" />\n`;
      } else {
        const x2 = px + cellW;
        const y2 = py + cellH;
        if ((x + y) % 2 === 0) {
          out += `  <polygon points="${f(px)},${f(py)} ${f(x2)},${f(py)} ${f(px)},${f(y2)}" fill="${hex}" />\n`;
          out += `  <polygon points="${f(x2)},${f(py)} ${f(x2)},${f(y2)} ${f(px)},${f(y2)}" fill="${hex}" opacity="0.8" />\n`;
        } else {
          out += `  <polygon points="${f(px)},${f(py)} ${f(x2)},${f(y2)} ${f(px)},${f(y2)}" fill="${hex}" />\n`;
          out += `  <polygon points="${f(px)},${f(py)} ${f(x2)},${f(py)} ${f(x2)},${f(y2)}" fill="${hex}" opacity="0.8" />\n`;
        }
      }
    }
  }
  return out;
}

export const ASCII_FILTER_DEFS: Record<Exclude<AsciiFilter, "none">, string> = {
  grayscale: `<feColorMatrix type="matrix" values="0.333 0.333 0.333 0 0  0.333 0.333 0.333 0 0  0.333 0.333 0.333 0 0  0 0 0 1 0"/>`,
  sepia: `<feColorMatrix type="matrix" values="0.393 0.769 0.189 0 0  0.349 0.686 0.168 0 0  0.272 0.534 0.131 0 0  0 0 0 1 0"/>`,
  blur: `<feGaussianBlur stdDeviation="4"/>`,
  invert: `<feComponentTransfer><feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/></feComponentTransfer>`,
};
