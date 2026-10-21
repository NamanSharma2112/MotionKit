/* ASCII engine: samples a source into a character grid and renders animated
   frames onto a canvas. One requestAnimationFrame loop, settings held in
   plain fields so React re-renders never restart the animation. */

import { EXAMPLE_H, EXAMPLE_W, type Example } from "./examples";

export type AnimationType = "wave" | "typewriter" | "rain" | "pulse" | "cascade" | "glitch" | "spiral" | "explode";
export type ColorMode = "mono" | "original" | "gradient" | "tint";

export const CHAR_SETS = {
  standard: ["@", "#", "S", "%", "?", "*", "+", ";", ":", ",", "."],
  detailed: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,^`'.".split(""),
  blocks: ["█", "▓", "▒", "░", "·", " "],
  minimal: ["#", "=", "-", ".", " "],
  binary: ["1", "0"],
  dots: ["●", "◉", "◎", "○", "·"],
  braille: ["⣿", "⣷", "⣯", "⣟", "⡿", "⢿", "⣻", "⣽", "⣾", "⠀"],
} as const;

export type CharSetKey = keyof typeof CHAR_SETS;

export interface AsciiSettings {
  style: AnimationType;
  speed: number;
  /** Glyph size relative to the cell height. */
  fontScale: number;
  cols: number;
  /** Contrast multiplier around mid-grey (1 = unchanged). */
  contrast: number;
  /** Brightness offset, -0.5..0.5. */
  brightness: number;
  invert: boolean;
  charSet: CharSetKey;
  colorMode: ColorMode;
  tint: string;
  background: string;
  playing: boolean;
  /** Let live examples move on their own while playing. */
  animateSource: boolean;
}

export interface AsciiSource {
  kind: "example" | "image" | "video";
  /** Width / height of the source. */
  aspect: number;
  /** True when the source changes over time (webcam, animated example). */
  live: boolean;
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
  dispose?: () => void;
}

/* Cell height / cell width: monospace glyphs are roughly twice as tall as wide. */
export const CELL_RATIO = 2;

const GLITCH = "!@#$%^&*()_+-=[]{}|;:,.<>?/~ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BLANKS = new Set([" ", "⠀"]);

const hash = (i: number) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

export function isLightColor(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/* Quantised rgb() string cache so per-cell colours don't allocate every frame. */
const rgbCache: string[] = [];
function rgbString(r: number, g: number, b: number) {
  const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  return (rgbCache[key] ??= `rgb(${(r >> 3) * 8 + 4},${(g >> 3) * 8 + 4},${(b >> 3) * 8 + 4})`);
}

const gradientCache: string[] = [];
function gradientString(v: number) {
  const k = Math.round(v * 63);
  return (gradientCache[k] ??= `hsl(${200 + (k / 63) * 160}, ${70 + (k / 63) * 30}%, ${40 + (k / 63) * 42}%)`);
}

/* ─── Sources ─── */

export function exampleSource(example: Example): AsciiSource {
  const c = document.createElement("canvas");
  c.width = EXAMPLE_W;
  c.height = EXAMPLE_H;
  const cctx = c.getContext("2d")!;
  let lastT = Number.NaN;
  return {
    kind: "example",
    aspect: EXAMPLE_W / EXAMPLE_H,
    live: true,
    paint(ctx, w, h, t) {
      if (t !== lastT) {
        example.paint(cctx, EXAMPLE_W, EXAMPLE_H, t);
        lastT = t;
      }
      ctx.drawImage(c, 0, 0, w, h);
    },
  };
}

export function imageSource(img: CanvasImageSource & { width: number; height: number }): AsciiSource {
  // Pre-scale large images once so per-sample downscaling stays cheap.
  const max = 900;
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * s));
  c.height = Math.max(1, Math.round(img.height * s));
  const cctx = c.getContext("2d")!;
  cctx.imageSmoothingQuality = "high";
  cctx.drawImage(img, 0, 0, c.width, c.height);
  return {
    kind: "image",
    aspect: c.width / c.height,
    live: false,
    paint(ctx, w, h) {
      ctx.drawImage(c, 0, 0, w, h);
    },
  };
}

export function videoSource(video: HTMLVideoElement, mirror = true): AsciiSource {
  return {
    kind: "video",
    aspect: (video.videoWidth || 4) / (video.videoHeight || 3),
    live: true,
    paint(ctx, w, h) {
      if (video.readyState < 2) return;
      ctx.save();
      if (mirror) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
    },
  };
}

/* ─── Engine ─── */

export interface EngineInfo {
  cols: number;
  rows: number;
  /** Cell height in CSS px (font size = cellH × fontScale). */
  cellH: number;
}

export class AsciiEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sCanvas: HTMLCanvasElement;
  private sCtx: CanvasRenderingContext2D;
  private settings: AsciiSettings;
  private source: AsciiSource | null = null;

  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private padding: number;

  // grid
  private cols = 0;
  private rows = 0;
  private chars: string[] = [];
  private colors: string[] = [];
  private alphas = new Float32Array(0);
  private ox = 0;
  private oy = 0;
  private cw = 0;
  private ch = 0;
  private lo = 0;
  private hi = 1;
  private levelsInit = false;

  private playhead = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private needSample = true;
  private needDraw = true;
  private pageVisible = true;
  private onscreen = true;
  private fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
  private rowShift = new Float32Array(0);
  private keepAlive = false;

  onInfo?: (info: EngineInfo) => void;
  private lastInfo: EngineInfo = { cols: 0, rows: 0, cellH: 0 };

  constructor(canvas: HTMLCanvasElement, settings: AsciiSettings, opts: { padding?: number } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.sCanvas = document.createElement("canvas");
    this.sCtx = this.sCanvas.getContext("2d", { willReadFrequently: true })!;
    this.settings = { ...settings };
    this.padding = opts.padding ?? 20;
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim();
    if (mono) this.fontFamily = `${mono}, ui-monospace, monospace`;
  }

  /* ─ public API ─ */

  setSettings(next: AsciiSettings) {
    const prev = this.settings;
    this.settings = { ...next };
    if (
      prev.cols !== next.cols ||
      prev.contrast !== next.contrast ||
      prev.brightness !== next.brightness ||
      prev.invert !== next.invert ||
      prev.charSet !== next.charSet ||
      prev.colorMode !== next.colorMode ||
      prev.tint !== next.tint ||
      prev.background !== next.background ||
      prev.animateSource !== next.animateSource
    ) {
      this.needSample = true;
    }
    this.needDraw = true;
    this.kick();
  }

  setSource(src: AsciiSource | null) {
    this.source = src;
    this.levelsInit = false;
    this.needSample = true;
    this.needDraw = true;
    this.kick();
  }

  resize(cssW: number, cssH: number, dpr = Math.min(window.devicePixelRatio || 1, 2)) {
    if (cssW === this.cssW && cssH === this.cssH && dpr === this.dpr) return;
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.needSample = true;
    this.needDraw = true;
    this.kick();
  }

  replay() {
    this.playhead = 0;
    this.needSample = true;
    this.needDraw = true;
    this.kick();
  }

  setPageVisible(v: boolean) {
    this.pageVisible = v;
    this.kick();
  }

  setOnscreen(v: boolean) {
    this.onscreen = v;
    this.kick();
  }

  /** Keep rendering even when scrolled away (used while recording a clip). */
  setKeepAlive(v: boolean) {
    this.keepAlive = v;
    this.kick();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.source = null;
  }

  /** Current grid as plain text (base characters, no animation offsets). */
  toText() {
    const lines: string[] = [];
    for (let y = 0; y < this.rows; y++) {
      let line = "";
      for (let x = 0; x < this.cols; x++) line += this.chars[y * this.cols + x] || " ";
      lines.push(line.replace(/\s+$/, ""));
    }
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    while (lines.length && !lines[0]) lines.shift();
    // Strip common leading indentation.
    const indent = Math.min(...lines.filter(Boolean).map((l) => l.length - l.trimStart().length));
    return lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join("\n");
  }

  get canvasElement() {
    return this.canvas;
  }

  /* ─ loop ─ */

  private kick() {
    const shouldRun = this.cssW > 0 && (this.keepAlive || (this.pageVisible && this.onscreen));
    if (shouldRun && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else if (!shouldRun && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const s = this.settings;
    if (s.playing && this.source) {
      this.playhead += dt * s.speed;
      this.needDraw = true;
      if (this.source.live && (s.animateSource || this.source.kind !== "example")) this.needSample = true;
    }
    if (this.needSample) this.sample();
    if (this.needDraw) this.draw();
  };

  /* ─ sampling ─ */

  private sample() {
    this.needSample = false;
    this.needDraw = true;
    const src = this.source;
    const s = this.settings;
    if (!src || this.cssW === 0) {
      this.cols = this.rows = 0;
      return;
    }
    const cols = Math.max(8, Math.round(s.cols));
    const rows = Math.max(4, Math.round(cols / (CELL_RATIO * src.aspect)));
    const pad = Math.min(this.padding, this.cssW * 0.04);
    const cw = Math.min((this.cssW - pad * 2) / cols, (this.cssH - pad * 2) / (rows * CELL_RATIO));
    this.cw = cw;
    this.ch = cw * CELL_RATIO;
    this.ox = (this.cssW - cols * cw) / 2;
    this.oy = (this.cssH - rows * this.ch) / 2;

    if (this.sCanvas.width !== cols || this.sCanvas.height !== rows) {
      this.sCanvas.width = cols;
      this.sCanvas.height = rows;
    }
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols;
      this.rows = rows;
      this.chars = new Array(cols * rows).fill("");
      this.colors = new Array(cols * rows).fill("");
      this.alphas = new Float32Array(cols * rows);
      this.rowShift = new Float32Array(rows);
    }
    if (cols !== this.lastInfo.cols || rows !== this.lastInfo.rows || Math.abs(this.ch - this.lastInfo.cellH) > 0.01) {
      this.lastInfo = { cols, rows, cellH: this.ch };
      this.onInfo?.(this.lastInfo);
    }

    const sctx = this.sCtx;
    sctx.clearRect(0, 0, cols, rows);
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    // Examples honour the "animate source" toggle; webcams are always live.
    const t = src.kind === "example" && !s.animateSource ? 0 : this.playhead;
    src.paint(sctx, cols, rows, t);
    const data = sctx.getImageData(0, 0, cols, rows).data;

    // Auto levels (smoothed for live sources so they don't flicker).
    let lo = 1, hi = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 64) continue;
      const l = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      if (l < lo) lo = l;
      if (l > hi) hi = l;
    }
    if (hi <= lo) hi = lo + 0.1;
    if (src.live && this.levelsInit) {
      this.lo += (lo - this.lo) * 0.1;
      this.hi += (hi - this.hi) * 0.1;
    } else {
      this.lo = lo;
      this.hi = hi;
      this.levelsInit = true;
    }
    const range = Math.max(0.05, this.hi - this.lo);

    const set = CHAR_SETS[s.charSet];
    const n = set.length;
    const lightBg = isLightColor(s.background);
    // Photos read correctly on a light background when dark pixels become ink.
    // Examples are drawn on black, so they keep their mapping and simply use dark ink.
    const flip = s.invert !== (lightBg && src.kind !== "example");
    const monoColor = lightBg ? "#141418" : "#ececf0";

    for (let i = 0, p = 0; i < cols * rows; i++, p += 4) {
      if (data[p + 3] < 64) {
        this.chars[i] = "";
        continue;
      }
      const r = data[p], g = data[p + 1], b = data[p + 2];
      let v = ((r * 0.299 + g * 0.587 + b * 0.114) / 255 - this.lo) / range;
      v = (v - 0.5) * s.contrast + 0.5 + s.brightness;
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      const tone = flip ? 1 - v : v;
      if (tone < 0.035) {
        this.chars[i] = "";
        continue;
      }
      const ci = Math.min(n - 1, Math.floor((1 - tone) * n));
      const c = set[ci];
      if (BLANKS.has(c)) {
        this.chars[i] = "";
        continue;
      }
      this.chars[i] = c;
      switch (s.colorMode) {
        case "original": {
          // Keep the pixel's hue but let the tone drive its value, so colours
          // stay readable against the background instead of sinking into it.
          const m = Math.max(r, g, b, 1);
          const f = (lightBg ? 0.85 - 0.65 * tone : 0.3 + 0.7 * tone) * (255 / m);
          this.colors[i] = rgbString(Math.min(255, r * f) | 0, Math.min(255, g * f) | 0, Math.min(255, b * f) | 0);
          this.alphas[i] = 1;
          break;
        }
        case "gradient":
          this.colors[i] = gradientString(v);
          this.alphas[i] = 0.45 + 0.55 * tone;
          break;
        case "tint":
          this.colors[i] = s.tint;
          this.alphas[i] = 0.4 + 0.6 * tone;
          break;
        default:
          this.colors[i] = monoColor;
          this.alphas[i] = 0.4 + 0.6 * tone;
      }
    }
  }

  /* ─ drawing ─ */

  private draw() {
    this.needDraw = false;
    const ctx = this.ctx;
    const s = this.settings;
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    if (!this.cols || !this.rows) return;

    const { cols, rows, cw, ch, ox, oy, chars, colors, alphas } = this;
    const fontPx = Math.max(2, ch * s.fontScale);
    ctx.font = `600 ${fontPx}px ${this.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const t = this.playhead;
    const total = cols * rows;
    const gridW = cols * cw, gridH = rows * ch;
    const cx = ox + gridW / 2, cy = oy + gridH / 2;
    const maxDist = Math.hypot(gridW / 2, gridH / 2);
    const style = s.style;

    // Per-frame values shared across cells.
    let revealIdx = 0, front = 0, explodeK = 0, explodeA = 1, explodeS = 1;
    if (style === "typewriter") {
      const D = 3.6, hold = 1.6;
      const p = (t % (D + hold)) / D;
      revealIdx = Math.min(1, p) * (total + cols);
    } else if (style === "cascade" || style === "spiral") {
      const D = 2.8, hold = 1.6;
      front = ((t % (D + hold)) / D) * 1.25;
    } else if (style === "explode") {
      const c = t % 4.4;
      if (c < 1.6) {
        const p = c / 1.6, e = p * p;
        explodeK = e * 2.6; explodeA = 1 - e; explodeS = 1 + e * 0.6;
      } else if (c < 3.2) {
        const p = (c - 1.6) / 1.6, e = 1 - (1 - p) * (1 - p) * (1 - p);
        explodeK = (1 - e) * 2.6; explodeA = e; explodeS = 1.6 - e * 0.6;
      }
    } else if (style === "glitch" && s.playing) {
      for (let y = 0; y < rows; y++) {
        if (Math.random() < 0.02) this.rowShift[y] = (Math.random() - 0.5) * cw * 10;
        else this.rowShift[y] *= 0.6;
      }
    }

    let lastColor = "";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        let glyph = chars[i];
        if (!glyph) continue;
        const px = ox + (x + 0.5) * cw;
        const py = oy + (y + 0.5) * ch;
        let dx = px, dy = py, alpha = 1, scale = 1;

        switch (style) {
          case "wave": {
            dy += Math.sin(t * 2 + x * 0.3 + y * 0.1) * ch * 0.3;
            alpha = 0.6 + 0.4 * Math.sin(t * 1.5 + i * 0.05);
            break;
          }
          case "typewriter": {
            const k = y * cols + x;
            if (k > revealIdx) alpha = 0;
            else if (k > revealIdx - 6) scale = 1.35 - (revealIdx - k) * 0.06;
            break;
          }
          case "rain": {
            // A bright head falls down each column, leaving a fading trail.
            const sp = 0.6 + hash(x) * 0.9;
            const len = rows * (0.25 + hash(x + 99) * 0.35);
            const head = ((t * sp * 14 + hash(x + 7) * rows * 2) % (rows + len));
            const d = head - y;
            const trail = d >= 0 && d < len ? 1 - d / len : 0;
            alpha = 0.18 + 0.82 * trail * trail;
            if (d >= 0 && d < 1.5) {
              scale = 1.15;
              if (s.playing && Math.random() < 0.3) glyph = GLITCH[(Math.random() * GLITCH.length) | 0];
            }
            break;
          }
          case "pulse": {
            const ph = Math.sin(t * 2 + x * 0.2 + y * 0.15);
            scale = 0.7 + 0.45 * ph;
            alpha = 0.5 + 0.5 * ph;
            break;
          }
          case "cascade": {
            const d = (x / cols + y / rows) / 2;
            const r = (front - d) * 6;
            if (r < 0) alpha = 0;
            else if (r < 1) {
              alpha = r;
              scale = 0.5 + r * 0.5;
              dy += (1 - r) * ch * 0.8;
            }
            break;
          }
          case "glitch": {
            dx += this.rowShift[y];
            if (s.playing && Math.random() < 0.03) {
              glyph = GLITCH[(Math.random() * GLITCH.length) | 0];
              dx += (Math.random() - 0.5) * cw;
              dy += (Math.random() - 0.5) * ch * 0.3;
              alpha = 0.3 + Math.random() * 0.7;
            }
            break;
          }
          case "spiral": {
            const ddx = px - cx, ddy = py - cy;
            const dist = Math.hypot(ddx, ddy) / maxDist;
            const ang = Math.atan2(ddy, ddx);
            const r = (front - dist + Math.sin(ang * 3) * 0.04) * 5;
            if (r < 0) alpha = 0;
            else if (r < 1.5) {
              const k = 1.5 - r;
              alpha = r / 1.5;
              dx += Math.cos(ang + k * 3) * k * ch * 0.8;
              dy += Math.sin(ang + k * 3) * k * ch * 0.8;
              scale = 0.3 + (r / 1.5) * 0.7;
            }
            break;
          }
          case "explode": {
            const j = 0.6 + hash(i) * 0.8;
            dx = cx + (px - cx) * (1 + explodeK * j);
            dy = cy + (py - cy) * (1 + explodeK * j);
            alpha = explodeA;
            scale = explodeS;
            break;
          }
        }

        alpha *= alphas[i];
        if (alpha <= 0.02) continue;
        const color = colors[i];
        if (color !== lastColor) {
          ctx.fillStyle = color;
          lastColor = color;
        }
        ctx.globalAlpha = alpha > 1 ? 1 : alpha;
        if (scale !== 1) {
          ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dx * dpr, dy * dpr);
          ctx.fillText(glyph, 0, 0);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } else {
          ctx.fillText(glyph, dx, dy);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
