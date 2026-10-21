/* Built-in example sources, drawn procedurally so the animator has something
   beautiful to show on first load without any network request. Each example
   paints into its own small canvas at time `t` (seconds); the engine samples
   that canvas down to the ASCII grid. */

export type ExampleId = "orb" | "wordmark" | "dunes" | "spiral" | "burst" | "ripple";

export interface Example {
  id: ExampleId;
  title: string;
  desc: string;
  /** Paint the example into ctx (w×h) at time t. */
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
}

export const EXAMPLE_W = 320;
export const EXAMPLE_H = 180;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* HSL (0..360, 0..1, 0..1) → RGB 0..255 */
function hsl(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/* Per-pixel painter. fn receives centred coords (u: -aspect..aspect, v: -1..1). */
function perPixel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fn: (u: number, v: number) => [number, number, number],
) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const aspect = w / h;
  for (let y = 0; y < h; y++) {
    const v = ((y + 0.5) / h) * 2 - 1;
    for (let x = 0; x < w; x++) {
      const u = (((x + 0.5) / w) * 2 - 1) * aspect;
      const [r, g, b] = fn(u, v);
      const i = (y * w + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* A ringed planet: shaded sphere, key light swinging across the front, and a
   banded ring that passes behind and in front of it. */
function paintOrb(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const a = t * 0.6;
  let lx = Math.cos(a) * 0.8, ly = -0.25, lz = 0.85;
  const ll = Math.hypot(lx, ly, lz);
  lx /= ll; ly /= ll; lz /= ll;
  const R = 0.74;
  const tilt = -0.2; // ring tilt (radians)
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const spin = t * 0.5;
  perPixel(ctx, w, h, (u, v) => {
    // Ring coordinates (rotated, flattened ellipse).
    const ru = (u * ct - v * st) / R;
    const rv = (u * st + v * ct) / R / 0.2;
    const rd = Math.hypot(ru, rv);
    const onRing = rd > 1.3 && rd < 1.85;
    const ringFront = rv > 0;
    let ring = 0;
    if (onRing) {
      const bands = 0.55 + 0.45 * Math.sin(rd * 38) * Math.sin(rd * 11 + 1);
      const gap = rd > 1.56 && rd < 1.62 ? 0.15 : 1;
      const sweep = 0.75 + 0.25 * Math.cos(Math.atan2(rv, ru) - spin);
      ring = clamp01(bands * gap * sweep);
    }

    const x = u / R, y = v / R;
    const r2 = x * x + y * y;
    if (r2 <= 1 && !(onRing && ringFront)) {
      const z = Math.sqrt(1 - r2);
      const diff = Math.max(0, x * lx + y * ly + z * lz);
      const hx = lx, hy = ly, hz = lz + 1;
      const hl = Math.hypot(hx, hy, hz);
      const spec = Math.pow(Math.max(0, (x * hx + y * hy + z * hz) / hl), 36);
      const rim = Math.pow(1 - z, 2.5) * 0.35;
      // Soft latitude bands like a gas giant.
      const bands = 0.9 + 0.1 * Math.sin(y * 14 + Math.sin(x * 3 + t * 0.4) * 0.8);
      const l = clamp01((0.22 + diff * 0.78) * bands + spec * 0.6 + rim);
      const [r, g, b] = hsl(205 + y * 55 - x * 20, 0.8, 0.2 + l * 0.55);
      const k = 0.3 + l * 0.9;
      return [Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)];
    }
    if (onRing) {
      const [r, g, b] = hsl(28 + rd * 18, 0.7, 0.3 + ring * 0.45);
      const k = 0.5 + ring * 0.6;
      return [Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)];
    }
    return [0, 0, 0];
  });
}

/* "MotionKit" wordmark with a light sweep passing through the letters. */
function paintWordmark(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const family =
    (typeof window !== "undefined" &&
      getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim()) ||
    "system-ui, sans-serif";
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = h * 0.5;
  ctx.font = `900 ${size}px ${family}`;
  const measured = ctx.measureText("MotionKit").width;
  if (measured > w * 0.9) {
    size *= (w * 0.9) / measured;
    ctx.font = `900 ${size}px ${family}`;
  }
  const g = ctx.createLinearGradient(0, h * 0.25, w, h * 0.75);
  g.addColorStop(0, "#9dbbff");
  g.addColorStop(0.5, "#d2b4ff");
  g.addColorStop(1, "#ffb0d4");
  ctx.fillStyle = g;
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = g;
  ctx.strokeText("MotionKit", w / 2, h * 0.47);
  ctx.fillText("MotionKit", w / 2, h * 0.47);
  // Light sweep, clipped to the letters.
  ctx.globalCompositeOperation = "source-atop";
  const p = ((t * 0.35) % 1.6) - 0.3;
  const sx = p * w * 1.4 - w * 0.2;
  const sweep = ctx.createLinearGradient(sx - w * 0.18, 0, sx + w * 0.18, h * 0.3);
  sweep.addColorStop(0, "rgba(255,255,255,0)");
  sweep.addColorStop(0.5, "rgba(255,255,255,0.95)");
  sweep.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // Underline bar
  ctx.fillStyle = "rgba(160,170,255,0.55)";
  const barW = w * 0.22;
  ctx.fillRect(w / 2 - barW / 2, h * 0.78, barW, Math.max(2, h * 0.035));
}

/* Layered dunes under a low sun; each layer drifts at its own speed. */
function paintDunes(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#05060c");
  sky.addColorStop(0.6, "#2a1736");
  sky.addColorStop(1, "#5a2a3a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Sun
  const sunX = w * 0.68, sunY = h * 0.42, sunR = h * 0.17;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, sunR * 2.6);
  glow.addColorStop(0, "rgba(255,200,140,0.55)");
  glow.addColorStop(1, "rgba(255,120,90,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ffe2b0";
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  const layers = [
    { base: 0.58, amp: 0.07, freq: 1.3, speed: 0.05, color: "#c06a6a" },
    { base: 0.68, amp: 0.08, freq: 1.9, speed: 0.09, color: "#8f4a63" },
    { base: 0.79, amp: 0.07, freq: 2.6, speed: 0.15, color: "#e2a46f" },
    { base: 0.9, amp: 0.06, freq: 3.4, speed: 0.24, color: "#f6d7a0" },
  ];
  for (const L of layers) {
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const u = x / w;
      const y =
        L.base +
        Math.sin((u + t * L.speed) * Math.PI * 2 * L.freq) * L.amp +
        Math.sin((u * 2.3 - t * L.speed * 0.6) * Math.PI * 2) * L.amp * 0.35;
      ctx.lineTo(x, y * h);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
}

/* A rotating logarithmic spiral galaxy. */
function paintSpiral(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  perPixel(ctx, w, h, (u, v) => {
    const r = Math.hypot(u, v) + 1e-4;
    const a = Math.atan2(v, u);
    const arms = Math.sin(a * 3 + Math.log(r) * 5 - t * 1.4);
    const band = Math.pow(clamp01(arms * 0.5 + 0.5), 1.6);
    const fall = clamp01(1.15 - r / 1.5);
    const core = Math.exp(-r * 4) * 0.9;
    const l = clamp01(band * fall * 1.2 + core);
    const [cr, cg, cb] = hsl(200 + r * 140 + Math.sin(a + t * 0.3) * 20, 0.8, 0.12 + l * 0.55);
    const k = 0.2 + l;
    return [Math.min(255, cr * k), Math.min(255, cg * k), Math.min(255, cb * k)];
  });
}

/* Sun-ray burst: slowly turning rays around a hot core. */
function paintBurst(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  perPixel(ctx, w, h, (u, v) => {
    const r = Math.hypot(u, v) + 1e-4;
    const a = Math.atan2(v, u);
    const rays = Math.pow(Math.abs(Math.cos(a * 8 + t * 0.6)), 6);
    const rays2 = Math.pow(Math.abs(Math.cos(a * 5 - t * 0.35 + 1.3)), 10) * 0.6;
    const fall = Math.exp(-r * 0.95);
    const core = Math.exp(-r * 6);
    const ring = Math.exp(-Math.pow((r - 0.42 - Math.sin(t * 1.2) * 0.04) * 16, 2)) * 0.55;
    const l = clamp01((rays + rays2) * fall * 0.95 + core + ring);
    const [cr, cg, cb] = hsl(18 + (1 - l) * 30 - r * 25, 0.95, 0.1 + l * 0.6);
    const k = 0.25 + l;
    return [Math.min(255, cr * k), Math.min(255, cg * k), Math.min(255, cb * k)];
  });
}

/* Two-source interference ripples. */
function paintRipple(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const ax = Math.cos(t * 0.4) * 0.7, ay = Math.sin(t * 0.5) * 0.35;
  perPixel(ctx, w, h, (u, v) => {
    const d1 = Math.hypot(u - ax, v - ay);
    const d2 = Math.hypot(u + ax, v + ay * 0.6);
    const s = Math.sin(d1 * 16 - t * 3) + Math.sin(d2 * 16 - t * 3);
    const l = clamp01((s * 0.25 + 0.5) * clamp01(1.25 - Math.hypot(u, v) * 0.55));
    const [cr, cg, cb] = hsl(170 + s * 25, 0.75, 0.1 + l * 0.55);
    const k = 0.2 + l;
    return [Math.min(255, cr * k), Math.min(255, cg * k), Math.min(255, cb * k)];
  });
}

export const EXAMPLES: Example[] = [
  { id: "orb", title: "Planet", desc: "Ringed sphere", paint: paintOrb },
  { id: "wordmark", title: "Wordmark", desc: "MotionKit logo", paint: paintWordmark },
  { id: "dunes", title: "Dunes", desc: "Layered landscape", paint: paintDunes },
  { id: "spiral", title: "Spiral", desc: "Turning galaxy", paint: paintSpiral },
  { id: "burst", title: "Burst", desc: "Radial rays", paint: paintBurst },
  { id: "ripple", title: "Ripple", desc: "Interference", paint: paintRipple },
];
