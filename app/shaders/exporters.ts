import { hexToRgb, isGLSL3, usesMouse, type Control, type UniformValues } from "./engine";

const escapeTemplate = (s: string) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const num = (n: number) => String(Math.round(n * 1000) / 1000);

export const componentName = (name: string) =>
  name
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("")
    .replace(/^(\d)/, "Shader$1") + "Shader";

/* A self-contained React component that runs the shader with the current
   uniform values: DPR-aware sizing, pauses off-screen and in hidden tabs,
   honours prefers-reduced-motion and cleans up on unmount. */
export function reactComponent(opts: {
  name: string;
  source: string;
  controls: Control[];
  values: UniformValues;
  speed: number;
}): string {
  const { source, controls, values, speed } = opts;
  const name = componentName(opts.name);
  const v3 = isGLSL3(source);
  const mouse = usesMouse(source);

  const uniformLines = controls
    .map((c) => {
      const v = values[c.name] ?? c.def;
      const val = typeof v === "string" ? `[${hexToRgb(v).map(num).join(", ")}]` : num(v);
      const note = typeof v === "string" ? ` // ${v}` : "";
      return `  ${c.name}: ${val},${note}`;
    })
    .join("\n");

  const vertex = v3
    ? "#version 300 es\\nin vec2 a_position;\\nvoid main() { gl_Position = vec4(a_position, 0.0, 1.0); }"
    : "attribute vec2 a_position;\\nvoid main() { gl_Position = vec4(a_position, 0.0, 1.0); }";

  const mouseSetup = mouse
    ? `
    // Smoothed pointer position in 0–1 (y up), relative to the canvas.
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const mouse = [0.5, 0.5];
    const target = [0.5, 0.5];
    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target[0] = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      target[1] = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
`
    : "";

  const mouseDraw = mouse
    ? `
      const k = 1 - Math.exp(-dt * 6);
      mouse[0] += (target[0] - mouse[0]) * k;
      mouse[1] += (target[1] - mouse[1]) * k;
      gl.uniform2f(uMouse, mouse[0], mouse[1]);`
    : "";

  const mouseCleanup = mouse ? `\n      window.removeEventListener("pointermove", onPointer);` : "";

  return `"use client";

import { useEffect, useRef, type CSSProperties } from "react";

const FRAGMENT = /* glsl */ \`${escapeTemplate(source)}\`;

const VERTEX = "${vertex}";

// Values tuned in the MotionKit shader playground.
const UNIFORMS: Record<string, number | number[]> = {
${uniformLines || "  // (no custom uniforms)"}
};

const SPEED = ${num(speed)};

export default function ${name}({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("${v3 ? "webgl2" : "webgl"}", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    }) as WebGLRenderingContext | null;
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
      }
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.bindAttribLocation(program, 0, "a_position");
    gl.linkProgram(program);
    gl.useProgram(program);

    // One triangle that covers the whole canvas.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    for (const [name, value] of Object.entries(UNIFORMS)) {
      const loc = gl.getUniformLocation(program, name);
      if (Array.isArray(value)) gl.uniform3fv(loc, value);
      else gl.uniform1f(loc, value);
    }
    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
${mouseSetup}
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let time = 0;
    let last = performance.now();
    let raf = 0;
    let onScreen = true;

    const draw = (dt = 0) => {${mouseDraw}
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Match the canvas buffer to its CSS size × devicePixelRatio (capped at 2).
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += dt * SPEED;
      draw(dt);
      raf = requestAnimationFrame(frame);
    };

    // Only animate while visible: on screen, tab in front, motion allowed.
    const update = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!still && onScreen && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", update);
    update();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", update);${mouseCleanup}
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
`;
}
