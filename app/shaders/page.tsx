"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Shader Presets ─── */
interface ShaderPreset {
  name: string;
  description: string;
  fragment: string;
  uniforms?: Record<string, number>;
}

const VERT = `attribute vec2 a_position;
void main(){ gl_Position=vec4(a_position,0.0,1.0); }`;

const presets: ShaderPreset[] = [
  {
    name: "Aurora",
    description: "Flowing northern lights",
    fragment: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
void main(){
  vec2 uv=(gl_FragCoord.xy-u_resolution*.5)/u_resolution.y;
  float t=u_time*.4;
  vec3 col=vec3(0);
  for(float i=1.;i<6.;i++){
    uv.y+=sin(uv.x*i*1.5+t*i*.3)*.15/i;
    float d=abs(uv.y)*(40.+i*10.);
    col+=vec3(.2/d,.4/d,.6/d)/i;
  }
  col=pow(col,vec3(.8));
  gl_FragColor=vec4(col,1);
}`,
  },
  {
    name: "Plasma",
    description: "Classic plasma waves",
    fragment: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  float t=u_time*.5;
  float v=sin(uv.x*10.+t);
  v+=sin((uv.y*10.+t)/2.);
  v+=sin((uv.x*10.+uv.y*10.+t)/2.);
  float cx=uv.x+.5*sin(t/5.);
  float cy=uv.y+.5*cos(t/3.);
  v+=sin(sqrt(100.*(cx*cx+cy*cy)+1.)+t);
  v=v/2.;
  vec3 col=vec3(sin(v*3.14159),sin(v*3.14159+2.094),sin(v*3.14159+4.189));
  col=col*.5+.5;
  gl_FragColor=vec4(col,1);
}`,
  },
  {
    name: "Nebula",
    description: "Deep space nebula clouds",
    fragment: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.,a=.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p*=2.;a*=.5;}
  return v;
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  float t=u_time*.15;
  float n=fbm(uv*3.+t);
  float n2=fbm(uv*5.-t*.7+n);
  vec3 c1=vec3(.1,.0,.2);
  vec3 c2=vec3(.4,.1,.6);
  vec3 c3=vec3(.1,.3,.8);
  vec3 col=mix(c1,c2,n);
  col=mix(col,c3,n2*.6);
  col+=vec3(.8,.4,.2)*pow(n2,3.)*.5;
  gl_FragColor=vec4(col,1);
}`,
  },
  {
    name: "Warp Grid",
    description: "Warped perspective grid",
    fragment: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_resolution)/u_resolution.y;
  float t=u_time*.3;
  vec2 p=uv*3.;
  p.y+=t;
  p+=.5*sin(p.yx*1.5+t);
  vec2 g=fract(p)-.5;
  float d=length(g);
  float m=smoothstep(.35,.3,d);
  vec3 col=vec3(m)*.3;
  col+=vec3(.2,.5,.9)*smoothstep(.05,.0,abs(d-.3))*.8;
  col+=vec3(.9,.3,.5)*smoothstep(.05,.0,abs(d-.15))*.4;
  gl_FragColor=vec4(col,1);
}`,
  },
  {
    name: "Liquid Metal",
    description: "Metallic fluid simulation",
    fragment: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_resolution)/u_resolution.y;
  float t=u_time*.4;
  float d=length(uv);
  float a=atan(uv.y,uv.x);
  float f=sin(a*3.+t)*sin(a*5.-t*.7)*.5+.5;
  f+=sin(d*10.-t*2.)*.2;
  f=pow(f,1.5);
  vec3 col=mix(vec3(.05,.05,.1),vec3(.6,.7,.8),f);
  col+=vec3(.9,.9,1.)*pow(max(0.,1.-d*2.),3.)*.3;
  col+=vec3(.3,.5,.7)*smoothstep(.5,.0,d)*.2;
  gl_FragColor=vec4(col,1);
}`,
  },
  {
    name: "Voronoi",
    description: "Animated cell patterns",
    fragment: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
vec2 hash2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution*4.;
  float t=u_time*.3;
  vec2 ip=floor(uv),fp=fract(uv);
  float md=8.;
  vec2 mr;
  for(int j=-1;j<=1;j++)
  for(int i=-1;i<=1;i++){
    vec2 nb=vec2(float(i),float(j));
    vec2 o=hash2(ip+nb);
    o=.5+.5*sin(t+6.2831*o);
    vec2 r=nb+o-fp;
    float d=dot(r,r);
    if(d<md){md=d;mr=r;}
  }
  md=sqrt(md);
  vec3 col=vec3(.05,.02,.1);
  col+=vec3(.3,.1,.5)*smoothstep(.0,.4,md);
  col+=vec3(.1,.5,.9)*(1.-md)*.3;
  col+=vec3(.9,.3,.5)*pow(1.-md,4.)*.5;
  gl_FragColor=vec4(col,1);
}`,
  },
  {
    name: "Ocean Waves",
    description: "Stylized water surface",
    fragment: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_resolution)/u_resolution.y;
  float t=u_time*.3;
  float w=0.;
  for(float i=1.;i<8.;i++){
    w+=sin(uv.x*i*2.+t*i*.5+uv.y*i)*.5/i;
    w+=cos(uv.y*i*1.5-t*i*.3+uv.x*i*.7)*.5/i;
  }
  vec3 deep=vec3(.02,.05,.15);
  vec3 mid=vec3(.05,.2,.4);
  vec3 top=vec3(.3,.6,.8);
  float f=w*.5+.5;
  vec3 col=mix(deep,mid,smoothstep(.3,.5,f));
  col=mix(col,top,smoothstep(.6,.8,f));
  col+=vec3(1)*pow(max(f-.75,0.)*4.,3.)*.2;
  gl_FragColor=vec4(col,1);
}`,
  },
  {
    name: "Fire",
    description: "Animated fire effect",
    fragment: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  uv.y=1.-uv.y;
  float t=u_time*1.5;
  float n=0.;
  n+=noise(vec2(uv.x*4.,uv.y*3.-t))*.5;
  n+=noise(vec2(uv.x*8.,uv.y*6.-t*1.2))*.25;
  n+=noise(vec2(uv.x*16.,uv.y*12.-t*1.5))*.125;
  float f=n*(1.-uv.y);
  f=pow(f,1.2)*2.;
  vec3 col=mix(vec3(0),vec3(.8,.2,0),smoothstep(.1,.4,f));
  col=mix(col,vec3(1,.6,0),smoothstep(.4,.7,f));
  col=mix(col,vec3(1,1,.5),smoothstep(.7,.95,f));
  gl_FragColor=vec4(col,1);
}`,
  },
  {
    name: "Matrix Rain",
    description: "Digital rain effect",
    fragment: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
float hash(float n){return fract(sin(n)*43758.5453);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  float cols=30.;
  float col_id=floor(uv.x*cols);
  float speed=hash(col_id*13.7)*.5+.5;
  float offset=hash(col_id*7.3);
  float y=fract(-u_time*speed*.3+offset);
  float trail=smoothstep(0.,.4,1.-abs(uv.y-y)*3.);
  trail*=smoothstep(0.,.02,uv.y);
  float bright=trail*(.5+.5*hash(floor(uv.y*40.)+col_id+floor(u_time*5.)));
  vec3 c=vec3(.1,.9,.3)*bright;
  c+=vec3(.3,1.,.5)*pow(trail,4.)*.5;
  gl_FragColor=vec4(c,1);
}`,
  },
];

/* ─── WebGL Helpers ─── */
function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(log || "Shader compile error");
  }
  return s;
}

function createProgram(gl: WebGLRenderingContext, vert: string, frag: string) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) throw new Error("Failed to compile shaders");
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || "Link error");
  }
  return prog;
}

/* ─── ShaderCanvas Component ─── */
function ShaderCanvas({
  fragment,
  className = "",
  style,
}: {
  fragment: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const progRef = useRef<WebGLProgram | null>(null);
  const errRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    errRef.current = false;

    try {
      const prog = createProgram(gl, VERT, fragment);
      progRef.current = prog;
    } catch {
      errRef.current = true;
      return;
    }

    const prog = progRef.current!;
    gl.useProgram(prog);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const parent = canvas.parentElement;
      const w = parent ? parent.clientWidth : canvas.clientWidth;
      const h = parent ? parent.clientHeight : canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement || canvas);

    const loop = () => {
      if (errRef.current) return;
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      gl.deleteProgram(prog);
    };
  }, [fragment]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        transition: "none",
        contain: "strict",
        ...style,
      }}
    />
  );
}

/* ─── Small UI Components ─── */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-lg"
          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-all"
    >
      {copied ? "✓ Copied" : "Copy GLSL"}
    </button>
  );
}

/* ─── Custom Editor ─── */
function ShaderEditor({
  onFragmentChange,
}: {
  onFragmentChange: (frag: string) => void;
}) {
  const [code, setCode] = useState(`precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.5;
  
  vec3 col = vec3(0.0);
  col.r = sin(uv.x * 6.28 + t) * 0.5 + 0.5;
  col.g = sin(uv.y * 6.28 + t * 1.3) * 0.5 + 0.5;
  col.b = sin((uv.x + uv.y) * 3.14 + t * 0.7) * 0.5 + 0.5;
  
  gl_FragColor = vec4(col, 1.0);
}`);
  const [error, setError] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const tryCompile = useCallback(
    (src: string) => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl");
      if (!gl) return;
      try {
        const prog = createProgram(gl, VERT, src);
        gl.deleteProgram(prog);
        setError("");
        onFragmentChange(src);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Compile error");
      }
      canvas.remove();
    },
    [onFragmentChange]
  );

  const handleChange = (val: string) => {
    setCode(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => tryCompile(val), 600);
  };

  useEffect(() => {
    tryCompile(code);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${error ? "bg-red-400" : "bg-green-400"} animate-pulse`} />
        <span className="text-xs font-medium dark:text-white">Fragment Shader</span>
      </div>
      <textarea
        value={code}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        className="w-full h-64 p-4 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-700 dark:text-neutral-300 resize-y outline-none focus:border-indigo-500 transition-colors"
      />
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap">
          {error}
        </div>
      )}
      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
        Available uniforms: <code className="text-indigo-400">u_time</code>,{" "}
        <code className="text-indigo-400">u_resolution</code>,{" "}
        <code className="text-indigo-400">u_mouse</code>
      </p>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ShadersPage() {
  const [editorMode, setEditorMode] = useState<"presets" | "custom">("presets");
  const [activeFragment, setActiveFragment] = useState(presets[0].fragment);
  const [selectedName, setSelectedName] = useState(presets[0].name);

  const selectPreset = (p: ShaderPreset) => {
    setActiveFragment(p.fragment);
    setSelectedName(p.name);
  };

  const handleCustomFragment = useCallback((frag: string) => {
    setActiveFragment(frag);
    setSelectedName("Custom");
  }, []);

  return (
    <div className="min-h-screen p-6 sm:p-12 lg:p-20 flex flex-col items-center transition-colors">
      {/* Header */}
      <header className="max-w-4xl w-full text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-bold mb-4 dark:text-white"
        >
          Shader Playground
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-neutral-500 dark:text-neutral-400 text-lg"
        >
          GPU-powered background effects — pick a preset or write your own GLSL.
        </motion.p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        <div className="flex gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900">
          <TabButton
            active={editorMode === "presets"}
            onClick={() => setEditorMode("presets")}
          >
            Presets
          </TabButton>
          <TabButton
            active={editorMode === "custom"}
            onClick={() => setEditorMode("custom")}
          >
            Custom GLSL
          </TabButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 max-w-6xl w-full">
        {/* Preview */}
        <div className="flex flex-col gap-6">
          <div
            className="w-full aspect-video rounded-3xl shadow-2xl border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden relative"
          >
            <ShaderCanvas
              key={activeFragment}
              fragment={activeFragment}
              className="absolute inset-0"
            />
            {/* Label overlay */}
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white text-xs font-medium">
              {selectedName}
            </div>
          </div>

          {/* Code Output */}
          <div className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm dark:text-white">
                Fragment Shader
              </h3>
              <CopyButton text={activeFragment} />
            </div>
            <pre className="bg-neutral-100 dark:bg-neutral-950 p-4 rounded-xl text-xs font-mono text-neutral-600 dark:text-neutral-300 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
              <code>{activeFragment}</code>
            </pre>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {editorMode === "presets" ? (
              <motion.div
                key="presets"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <section>
                  <h3 className="font-bold mb-4 dark:text-white text-sm">
                    Shader Presets
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {presets.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => selectPreset(p)}
                        className={`group p-3 rounded-xl border-2 transition-all text-left ${
                          selectedName === p.name
                            ? "border-neutral-900 dark:border-white shadow-lg scale-[1.02]"
                            : "border-transparent bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:scale-[1.02]"
                        }`}
                      >
                        {/* Mini preview */}
                        <div className="w-full h-16 rounded-lg mb-2 overflow-hidden">
                          <ShaderCanvas fragment={p.fragment} />
                        </div>
                        <span className="text-[12px] font-semibold dark:text-white block">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          {p.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="custom"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800"
              >
                <ShaderEditor onFragmentChange={handleCustomFragment} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tip */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 dark:border-indigo-500/10">
            <h4 className="text-sm font-bold mb-1 dark:text-white">💡 Tip</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {editorMode === "presets"
                ? "Click any preset to preview it. Each shader runs on the GPU in real-time. Copy the GLSL code to use in your own projects."
                : "Write GLSL fragment shaders with uniforms u_time, u_resolution, and u_mouse. Changes compile live — errors appear below the editor."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
