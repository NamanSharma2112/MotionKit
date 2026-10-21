/* WebGL engine for the shader playground.

   - ShaderRenderer: one context for the main stage. Crisp DPR-aware sizing
     (ResizeObserver), pauses when off-screen or the tab is hidden, keeps the
     last good program when a new one fails, survives context loss.
   - PreviewHub: ONE shared offscreen context that paints every preset
     thumbnail into plain 2D canvases (browsers cap live contexts at ~16). */

export type UniformValue = number | string; // string = "#rrggbb"
export type UniformValues = Record<string, UniformValue>;

export type Control =
  | { kind: "range"; name: string; label: string; min: number; max: number; step: number; def: number }
  | { kind: "color"; name: string; label: string; def: string };

export type ShaderError = { line: number | null; message: string };
export type CompileResult = { ok: true; ms: number } | { ok: false; errors: ShaderError[] };

const VERT_100 = `attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;
const VERT_300 = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

export const BUILTINS = new Set(["u_time", "u_resolution", "u_mouse"]);

export const isGLSL3 = (src: string) => /^\s*#version\s+300\s+es/.test(src);
export const usesMouse = (src: string) => /\bu_mouse\b/.test(src);

/* ─── Controls from annotated uniforms ─── */

const humanize = (name: string) => {
  const s = name.replace(/^u_/, "").replace(/_/g, " ").replace(/([a-z])(\d)/g, "$1 $2");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const niceStep = (span: number) => {
  const raw = span / 200;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n < 2 ? 1 : n < 5 ? 2 : 5) * pow;
};

const UNIFORM_RE =
  /^[ \t]*uniform[ \t]+(?:(?:lowp|mediump|highp)[ \t]+)?(float|vec3)[ \t]+([A-Za-z_]\w*)[ \t]*;[ \t]*(?:\/\/[ \t]*(.*))?$/gm;

export function parseControls(src: string): Control[] {
  const out: Control[] = [];
  const seen = new Set<string>();
  for (const m of src.matchAll(UNIFORM_RE)) {
    const [, type, name, note = ""] = m;
    if (BUILTINS.has(name) || seen.has(name)) continue;
    seen.add(name);
    if (type === "float") {
      const r = note.match(/@range[ \t]+(-?[\d.]+)[ \t]+(-?[\d.]+)[ \t]+(-?[\d.]+)[ \t]*(.*)$/);
      let min = 0;
      let max = 1;
      let def = 0.5;
      let label = "";
      if (r) {
        min = parseFloat(r[1]);
        max = parseFloat(r[2]);
        def = parseFloat(r[3]);
        label = r[4].trim();
      }
      if (!(max > min) || !Number.isFinite(def)) {
        min = 0;
        max = 1;
        def = 0.5;
      }
      out.push({
        kind: "range",
        name,
        label: label || humanize(name),
        min,
        max,
        step: niceStep(max - min),
        def: Math.min(max, Math.max(min, def)),
      });
    } else {
      const c = note.match(/@colou?r[ \t]+(#[0-9a-fA-F]{6})[ \t]*(.*)$/);
      out.push({
        kind: "color",
        name,
        label: (c?.[2] ?? "").trim() || humanize(name),
        def: (c?.[1] ?? "#ffffff").toLowerCase(),
      });
    }
  }
  return out;
}

export const defaultsOf = (controls: Control[]): UniformValues =>
  Object.fromEntries(controls.map((c) => [c.name, c.def]));

export function resolveValues(controls: Control[], overrides?: UniformValues): UniformValues {
  const v: UniformValues = {};
  for (const c of controls) {
    const o = overrides?.[c.name];
    v[c.name] = o !== undefined && typeof o === typeof c.def ? o : c.def;
  }
  return v;
}

const fmtNum = (n: number) => String(Math.round(n * 1000) / 1000);

/** Rewrite annotation defaults so copied GLSL carries the current tweaks. */
export function bakeDefaults(src: string, controls: Control[], values: UniformValues): string {
  const byName = new Map(controls.map((c) => [c.name, c]));
  return src.replace(UNIFORM_RE, (line, _type: string, name: string, note?: string) => {
    const c = byName.get(name);
    const v = values[name];
    if (!c || v === undefined || !note) return line;
    if (c.kind === "range" && typeof v === "number") {
      return line.replace(
        /(@range[ \t]+-?[\d.]+[ \t]+-?[\d.]+[ \t]+)(-?[\d.]+)/,
        (_m, head: string) => head + fmtNum(v),
      );
    }
    if (c.kind === "color" && typeof v === "string") {
      return line.replace(/(@colou?r[ \t]+)#[0-9a-fA-F]{6}/, (_m, head: string) => head + v);
    }
    return line;
  });
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* ─── Compilation ─── */

type GL = WebGLRenderingContext | WebGL2RenderingContext;

const isGL2 = (gl: GL): gl is WebGL2RenderingContext =>
  typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;

export function parseShaderLog(log: string): ShaderError[] {
  const errs: ShaderError[] = [];
  const seen = new Set<string>();
  for (const raw of log.split("\n")) {
    const line = raw.replace(/\0/g, "").trim();
    if (!line || /^WARNING/i.test(line)) continue;
    const m = line.match(/^ERROR:\s*\d+:(\d+):\s*(.*)$/i);
    const err: ShaderError = m ? { line: Number(m[1]), message: m[2].trim() } : { line: null, message: line };
    if (/compilation terminated|too many errors/i.test(err.message)) continue;
    const key = `${err.line}:${err.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    errs.push(err);
  }
  return errs.length ? errs : [{ line: null, message: log.trim() || "Shader failed to compile." }];
}

function compileStage(gl: GL, type: number, src: string): WebGLShader | string {
  const s = gl.createShader(type);
  if (!s) return "Could not create shader (is the WebGL context lost?).";
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s) || "Shader failed to compile.";
    gl.deleteShader(s);
    return log;
  }
  return s;
}

export function buildProgram(gl: GL, frag: string): { program: WebGLProgram } | { errors: ShaderError[] } {
  const v3 = isGLSL3(frag);
  if (v3 && !isGL2(gl)) {
    return { errors: [{ line: 1, message: "#version 300 es needs WebGL2, which this browser doesn't offer." }] };
  }
  if (!/\bvoid\s+main\s*\(/.test(frag)) {
    return { errors: [{ line: null, message: "No main() function. A fragment shader needs void main() { … }." }] };
  }
  const vs = compileStage(gl, gl.VERTEX_SHADER, v3 ? VERT_300 : VERT_100);
  if (typeof vs === "string") return { errors: parseShaderLog(vs) };
  const fs = compileStage(gl, gl.FRAGMENT_SHADER, frag);
  if (typeof fs === "string") {
    gl.deleteShader(vs);
    return { errors: parseShaderLog(fs) };
  }
  const program = gl.createProgram();
  if (!program) return { errors: [{ line: null, message: "Could not create program." }] };
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "a_position");
  gl.linkProgram(program);
  gl.detachShader(program, vs);
  gl.detachShader(program, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || "Program failed to link.";
    gl.deleteProgram(program);
    return { errors: parseShaderLog(log) };
  }
  return { program };
}

function getContext(canvas: HTMLCanvasElement, preserve: boolean): GL | null {
  const attrs: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: preserve,
    powerPreference: "default",
  };
  return (
    (canvas.getContext("webgl2", attrs) as WebGL2RenderingContext | null) ??
    (canvas.getContext("webgl", attrs) as WebGLRenderingContext | null)
  );
}

/** Full-screen triangle bound to attribute 0. */
function makeQuad(gl: GL) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  return buf;
}

function applyValues(
  gl: GL,
  program: WebGLProgram,
  locs: Map<string, WebGLUniformLocation | null>,
  values: UniformValues,
) {
  for (const [name, value] of Object.entries(values)) {
    let loc = locs.get(name);
    if (loc === undefined) {
      loc = gl.getUniformLocation(program, name);
      locs.set(name, loc);
    }
    if (!loc) continue;
    if (typeof value === "string") gl.uniform3fv(loc, hexToRgb(value));
    else gl.uniform1f(loc, value);
  }
}

let probe: boolean | null = null;
/** Cached WebGL support check (client only). */
export function hasWebGL(): boolean {
  if (probe !== null) return probe;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    probe = !!gl;
    (gl?.getExtension("WEBGL_lose_context") as WEBGL_lose_context | null)?.loseContext();
  } catch {
    probe = false;
  }
  return probe;
}

/* ─── Main stage renderer ─── */

export type RendererStats = { fps: number; width: number; height: number; time: number };

export class ShaderRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: GL;
  private buffer: WebGLBuffer | null = null;
  private program: WebGLProgram | null = null;
  private locs = new Map<string, WebGLUniformLocation | null>();
  private source = "";
  private values: UniformValues = {};
  private maxDpr: number;

  time = 0;
  private speed = 1;
  private playing = true;
  private onScreen = true;
  private lost = false;
  private raf = 0;
  private pendingDraw = 0;
  private last = 0;

  private mouse: [number, number] = [0.5, 0.5];
  private mouseTarget: [number, number] = [0.5, 0.5];

  private frames = 0;
  private statsAt = 0;
  onStats?: (s: RendererStats) => void;

  private ro: ResizeObserver;
  private io: IntersectionObserver;

  constructor(canvas: HTMLCanvasElement, opts: { maxDpr?: number } = {}) {
    const gl = getContext(canvas, false);
    if (!gl) throw new Error("WebGL is not available.");
    this.canvas = canvas;
    this.gl = gl;
    this.maxDpr = opts.maxDpr ?? 2;
    this.buffer = makeQuad(gl);

    canvas.addEventListener("webglcontextlost", this.handleLost);
    canvas.addEventListener("webglcontextrestored", this.handleRestored);
    document.addEventListener("visibilitychange", this.sync);

    // device-pixel-content-box gives exact physical pixels where supported.
    this.ro = new ResizeObserver((entries) => {
      const e = entries[0];
      const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
      let w: number;
      let h: number;
      const dev = e.devicePixelContentBoxSize?.[0];
      if (dev && dpr === (window.devicePixelRatio || 1)) {
        w = dev.inlineSize;
        h = dev.blockSize;
      } else {
        w = Math.round(e.contentRect.width * dpr);
        h = Math.round(e.contentRect.height * dpr);
      }
      this.setSize(Math.max(1, w), Math.max(1, h));
    });
    try {
      this.ro.observe(canvas, { box: "device-pixel-content-box" });
    } catch {
      this.ro.observe(canvas);
    }
    this.io = new IntersectionObserver(([e]) => {
      this.onScreen = e.isIntersecting;
      this.sync();
    });
    this.io.observe(canvas);
  }

  get currentSource() {
    return this.source;
  }

  compile(src: string): CompileResult {
    if (this.lost) return { ok: false, errors: [{ line: null, message: "WebGL context was lost; waiting for it to come back." }] };
    const t0 = performance.now();
    const r = buildProgram(this.gl, src);
    if ("errors" in r) return { ok: false, errors: r.errors };
    if (this.program) this.gl.deleteProgram(this.program);
    this.program = r.program;
    this.locs.clear();
    this.source = src;
    this.gl.useProgram(r.program);
    applyValues(this.gl, r.program, this.locs, this.values);
    this.sync();
    this.requestDraw();
    return { ok: true, ms: performance.now() - t0 };
  }

  setValues(values: UniformValues) {
    this.values = values;
    if (this.program && !this.lost) applyValues(this.gl, this.program, this.locs, values);
    this.requestDraw();
  }

  setPlaying(playing: boolean) {
    this.playing = playing;
    this.sync();
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  restart() {
    this.time = 0;
    this.requestDraw();
  }

  /** x, y in 0–1 with y up; null eases back to the centre. */
  setPointer(x: number | null, y?: number) {
    this.mouseTarget = x === null ? [0.5, 0.5] : [x, y ?? 0.5];
    if (!this.raf) {
      this.mouse = [...this.mouseTarget];
      this.requestDraw();
    }
  }

  private setSize(w: number, h: number) {
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    // Draw synchronously so a resize never shows a cleared frame.
    this.draw();
    if (!this.raf) this.emitStats(0);
  }

  private get running() {
    return this.playing && this.onScreen && !document.hidden && !!this.program && !this.lost;
  }

  private sync = () => {
    if (this.running && !this.raf) {
      this.last = performance.now();
      this.statsAt = this.last;
      this.frames = 0;
      this.raf = requestAnimationFrame(this.tick);
    } else if (!this.running && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.emitStats(0);
    }
  };

  private tick = (now: number) => {
    this.raf = 0;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.time += dt * this.speed;
    const k = 1 - Math.exp(-dt * 6);
    this.mouse[0] += (this.mouseTarget[0] - this.mouse[0]) * k;
    this.mouse[1] += (this.mouseTarget[1] - this.mouse[1]) * k;
    this.draw();
    this.frames++;
    if (now - this.statsAt > 500) {
      this.emitStats((this.frames * 1000) / (now - this.statsAt));
      this.frames = 0;
      this.statsAt = now;
    }
    if (this.running) this.raf = requestAnimationFrame(this.tick);
  };

  private emitStats(fps: number) {
    this.onStats?.({ fps, width: this.canvas.width, height: this.canvas.height, time: this.time });
  }

  requestDraw() {
    if (this.raf || this.pendingDraw) return;
    this.pendingDraw = requestAnimationFrame(() => {
      this.pendingDraw = 0;
      this.draw();
      this.emitStats(0);
    });
  }

  private draw() {
    const { gl, program } = this;
    if (!program || this.lost) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const loc = (n: string) => {
      let l = this.locs.get(n);
      if (l === undefined) {
        l = gl.getUniformLocation(program, n);
        this.locs.set(n, l);
      }
      return l;
    };
    gl.uniform1f(loc("u_time"), this.time);
    gl.uniform2f(loc("u_resolution"), this.canvas.width, this.canvas.height);
    gl.uniform2f(loc("u_mouse"), this.mouse[0], this.mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Render one frame at the given pixel size and return it as a PNG blob. */
  capture(width?: number, height?: number): Promise<Blob | null> {
    const { canvas, gl } = this;
    const ow = canvas.width;
    const oh = canvas.height;
    if (width && height) {
      const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
      const max = Math.min(dims[0], dims[1], gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number);
      const s = Math.min(1, max / Math.max(width, height));
      canvas.width = Math.round(width * s);
      canvas.height = Math.round(height * s);
    }
    this.draw();
    // toBlob snapshots the bitmap synchronously, so restoring right after is safe.
    const p = new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (width && height) {
      canvas.width = ow;
      canvas.height = oh;
      this.draw();
    }
    return p;
  }

  private handleLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.program = null;
    this.sync();
  };

  private handleRestored = () => {
    this.lost = false;
    this.locs.clear();
    this.buffer = makeQuad(this.gl);
    if (this.source) this.compile(this.source);
  };

  destroy() {
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.pendingDraw);
    this.raf = 0;
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener("visibilitychange", this.sync);
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleRestored);
    const { gl } = this;
    if (this.program) gl.deleteProgram(this.program);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    this.program = null;
    // Free the GPU context now instead of waiting for GC.
    (gl.getExtension("WEBGL_lose_context") as WEBGL_lose_context | null)?.loseContext();
  }
}

/* ─── Shared thumbnail renderer ─── */

type Job = { target: HTMLCanvasElement; key: string; source: string; values: UniformValues; time: number };

class PreviewHub {
  private canvas = document.createElement("canvas");
  private gl: GL;
  private programs = new Map<string, { program: WebGLProgram; locs: Map<string, WebGLUniformLocation | null> } | null>();
  private queue = new Map<HTMLCanvasElement, Job>();
  private raf = 0;

  constructor() {
    const gl = getContext(this.canvas, true);
    if (!gl) throw new Error("WebGL is not available.");
    this.gl = gl;
    makeQuad(gl);
  }

  /** Paint now (used for hover loops). */
  render(job: Job) {
    const { gl, canvas } = this;
    let entry = this.programs.get(job.key);
    if (entry === undefined) {
      const r = buildProgram(gl, job.source);
      entry = "program" in r ? { program: r.program, locs: new Map() } : null;
      this.programs.set(job.key, entry);
    }
    if (!entry) return;
    const { width: w, height: h } = job.target;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.useProgram(entry.program);
    applyValues(gl, entry.program, entry.locs, {
      ...job.values,
      u_time: job.time,
    });
    const res = gl.getUniformLocation(entry.program, "u_resolution");
    gl.uniform2f(res, w, h);
    const mouse = gl.getUniformLocation(entry.program, "u_mouse");
    gl.uniform2f(mouse, 0.62, 0.58);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const ctx = job.target.getContext("2d");
    ctx?.drawImage(canvas, 0, 0);
  }

  /** Paint later, one tile per frame, so twelve compiles never land at once. */
  enqueue(job: Job) {
    this.queue.set(job.target, job);
    if (!this.raf) this.raf = requestAnimationFrame(this.flush);
  }

  cancel(target: HTMLCanvasElement) {
    this.queue.delete(target);
  }

  private flush = () => {
    this.raf = 0;
    const next = this.queue.entries().next();
    if (next.done) return;
    const [target, job] = next.value;
    this.queue.delete(target);
    if (target.isConnected) this.render(job);
    if (this.queue.size) this.raf = requestAnimationFrame(this.flush);
  };

  destroy() {
    cancelAnimationFrame(this.raf);
    this.queue.clear();
    for (const e of this.programs.values()) if (e) this.gl.deleteProgram(e.program);
    this.programs.clear();
    (this.gl.getExtension("WEBGL_lose_context") as WEBGL_lose_context | null)?.loseContext();
  }
}

let hub: PreviewHub | null = null;
let hubRefs = 0;

export function acquirePreviewHub(): PreviewHub | null {
  if (!hub) {
    try {
      hub = new PreviewHub();
    } catch {
      return null;
    }
  }
  hubRefs++;
  return hub;
}

export function releasePreviewHub() {
  hubRefs = Math.max(0, hubRefs - 1);
  if (hubRefs === 0 && hub) {
    hub.destroy();
    hub = null;
  }
}

export type { PreviewHub };
