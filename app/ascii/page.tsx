"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  Bomb,
  Camera,
  CameraOff,
  Check,
  CloudRain,
  Code,
  Copy,
  Download,
  Film,
  ImageUp,
  Keyboard,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  Tornado,
  TriangleAlert,
  Waves,
  Zap,
} from "lucide-react";
import PageHeader from "../compoents/ui/PageHeader";
import MorePlaygrounds from "../compoents/ui/MorePlaygrounds";
import { EXAMPLE_H, EXAMPLE_W, EXAMPLES, type Example, type ExampleId } from "./examples";
import {
  AsciiEngine,
  CHAR_SETS,
  exampleSource,
  imageSource,
  isLightColor,
  videoSource,
  type AnimationType,
  type AsciiSettings,
  type AsciiSource,
  type CharSetKey,
  type ColorMode,
  type EngineInfo,
} from "./engine";

/* ─── Options ─── */

const STYLES: { key: AnimationType; label: string; desc: string; Icon: typeof Waves }[] = [
  { key: "wave", label: "Wave", desc: "Rows ripple and shimmer", Icon: Waves },
  { key: "typewriter", label: "Typewriter", desc: "Types itself out", Icon: Keyboard },
  { key: "rain", label: "Matrix rain", desc: "Glowing trails fall", Icon: CloudRain },
  { key: "pulse", label: "Pulse", desc: "Breathing scale", Icon: Activity },
  { key: "cascade", label: "Cascade", desc: "Diagonal reveal", Icon: ScanLine },
  { key: "glitch", label: "Glitch", desc: "Scrambles and tears", Icon: Zap },
  { key: "spiral", label: "Spiral", desc: "Swirls in from centre", Icon: Tornado },
  { key: "explode", label: "Explode", desc: "Scatters and reforms", Icon: Bomb },
];

const CHARSET_LABELS: Record<CharSetKey, string> = {
  standard: "Standard",
  detailed: "Detailed",
  blocks: "Blocks",
  minimal: "Minimal",
  binary: "Binary",
  dots: "Dots",
  braille: "Braille",
};

const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: "mono", label: "Mono" },
  { value: "original", label: "Original" },
  { value: "gradient", label: "Gradient" },
  { value: "tint", label: "Tint" },
];

const TINTS = ["#3dff9a", "#4d8dff", "#ff6fb1", "#ffb547", "#c9a7ff"];
const BACKGROUNDS = [
  { value: "#0a0a0f", label: "Ink" },
  { value: "#101626", label: "Navy" },
  { value: "#04130b", label: "Terminal" },
  { value: "#f5f1e8", label: "Paper" },
  { value: "#ffffff", label: "White" },
];

type Base = Omit<AsciiSettings, "playing" | "cols">;

const DEFAULTS: Base = {
  style: "wave",
  speed: 1,
  fontScale: 0.9,
  contrast: 1.15,
  brightness: 0,
  invert: false,
  charSet: "standard",
  colorMode: "original",
  tint: TINTS[0],
  background: "#0a0a0f",
  animateSource: true,
};

type SourceState = { kind: "example"; id: ExampleId } | { kind: "image"; name: string } | { kind: "camera" };
type Notice = { text: string } | null;
type ExportKey = "text" | "png" | "clip" | "react";

const CLIP_SECONDS = 4;

/* prefers-reduced-motion, hydration-safe (server assumes motion is fine). */
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCE_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}

/* ─── Small controls ─── */

function Range({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="mk-field">
      <span className="mk-field-row">
        <span>{label}</span>
        <span className="mk-value">{display}</span>
      </span>
      <input
        type="range"
        className="mk-range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--p": `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}

function ColorPicker({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const custom = !options.some((o) => o.value.toLowerCase() === value.toLowerCase());
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.label}
          title={o.label}
          className="mk-swatch"
          data-active={o.value.toLowerCase() === value.toLowerCase()}
          style={{ background: o.value }}
          onClick={() => onChange(o.value)}
        />
      ))}
      <label
        className="mk-swatch relative grid place-items-center overflow-hidden"
        data-active={custom}
        title="Custom colour"
        style={{
          background: custom
            ? value
            : "conic-gradient(from 90deg, #ff5f5f, #ffd25f, #5fff8f, #5fc8ff, #9a5fff, #ff5fd2, #ff5f5f)",
        }}
      >
        <span className="sr-only">Custom colour</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <span className="mk-value ml-auto uppercase text-mk-muted">{value}</span>
    </div>
  );
}

function ExportButton({
  onClick,
  done,
  icon,
  children,
  disabled,
}: {
  onClick: () => void;
  done: boolean;
  icon: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm justify-start" onClick={onClick} disabled={disabled}>
      <span className="mk-swap" data-state={done ? "b" : "a"}>
        <span className="mk-swap-a grid place-items-center">{icon}</span>
        <Check size={14} className="mk-swap-b" />
      </span>
      {children}
    </button>
  );
}

/* Example tile: a still of the example's source art. */
function ExampleTile({ example, active, onSelect }: { example: Example; active: boolean; onSelect: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = EXAMPLE_W;
    canvas.height = EXAMPLE_H;
    example.paint(ctx, EXAMPLE_W, EXAMPLE_H, 1.2);
  }, [example]);

  return (
    <button type="button" className="mk-option" data-active={active} onClick={onSelect} aria-pressed={active}>
      <canvas ref={canvasRef} aria-hidden className="block aspect-video w-full rounded-[9px] bg-black" />
      <span className="mk-option-title">{example.title}</span>
    </button>
  );
}

/* Drag-and-drop helper shared by the stage and the side-panel dropzone. */
function useFileDrop(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const handlers = {
    onDragEnter: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current++;
      setDragging(true);
    },
    onDragOver: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/")) ?? e.dataTransfer.files[0];
      if (file) onFile(file);
    },
  };
  return { dragging, handlers };
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function reactSnippet(text: string, s: AsciiSettings) {
  const color = s.colorMode === "tint" ? s.tint : isLightColor(s.background) ? "#141418" : "#ececf0";
  const art = text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return [
    `/* ASCII art exported from the MotionKit ASCII animator.`,
    `   Lines fade in one after another; reduced motion shows it instantly. */`,
    `const ART = \`${art}\`;`,
    ``,
    `export default function AsciiArt() {`,
    `  return (`,
    `    <pre`,
    `      aria-label="ASCII art"`,
    `      style={{`,
    `        margin: 0,`,
    `        padding: 24,`,
    `        borderRadius: 16,`,
    `        overflow: "auto",`,
    `        background: "${s.background}",`,
    `        color: "${color}",`,
    `        font: "600 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",`,
    `      }}`,
    `    >`,
    `      <style>{\``,
    `        @keyframes ascii-line-in { from { opacity: 0; transform: translateY(4px); } }`,
    `        .ascii-line { display: block; animation: ascii-line-in 500ms cubic-bezier(0.23, 1, 0.32, 1) both; }`,
    `        @media (prefers-reduced-motion: reduce) { .ascii-line { animation: none; } }`,
    `      \`}</style>`,
    `      {ART.split("\\n").map((line, i) => (`,
    `        <span key={i} className="ascii-line" style={{ animationDelay: \`\${i * 30}ms\` }}>`,
    `          {line || " "}`,
    `        </span>`,
    `      ))}`,
    `    </pre>`,
    `  );`,
    `}`,
    ``,
  ].join("\n");
}

/* ─── Page ─── */

export default function AsciiAnimatorPage() {
  const reduceMotion = useReducedMotion();
  const [base, setBase] = useState<Base>(DEFAULTS);
  // null = automatic (plays unless the visitor prefers reduced motion / fits the stage width)
  const [playIntent, setPlayIntent] = useState<boolean | null>(null);
  const [colsIntent, setColsIntent] = useState<number | null>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [source, setSource] = useState<SourceState>({ kind: "example", id: "orb" });
  const [info, setInfo] = useState<EngineInfo>({ cols: 0, rows: 0, cellH: 0 });
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const [notice, setNotice] = useState<Notice>(null);
  const [done, setDone] = useState<ExportKey | null>(null);
  const [recording, setRecording] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const playing = playIntent ?? !reduceMotion;
  const autoCols = stageWidth > 0 && stageWidth < 560 ? 84 : 120;
  const cols = colsIntent ?? autoCols;
  const settings = useMemo<AsciiSettings>(() => ({ ...base, playing, cols }), [base, playing, cols]);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsciiEngine | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const beforeCameraRef = useRef<{ src: AsciiSource; state: SourceState } | null>(null);
  const currentSrcRef = useRef<AsciiSource | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settingsRef = useRef(settings);

  const update = (patch: Partial<Base>) => setBase((b) => ({ ...b, ...patch }));

  /* Engine lifecycle */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const engine = new AsciiEngine(canvas, settingsRef.current);
    engine.onInfo = setInfo;
    const first = exampleSource(EXAMPLES[0]);
    currentSrcRef.current = first;
    engine.setSource(first);
    engineRef.current = engine;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      engine.resize(width, height);
      setStageWidth(width);
    });
    ro.observe(stage);

    const io = new IntersectionObserver(([entry]) => engine.setOnscreen(entry.isIntersecting));
    io.observe(stage);

    const onVis = () => engine.setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    const onFs = () => setFullscreen(document.fullscreenElement === stage);
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFs);
      engine.destroy();
      engineRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    engineRef.current?.setSettings(settings);
  }, [settings]);

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  const flash = (key: ExportKey) => {
    setDone(key);
    clearTimeout(doneTimer.current);
    doneTimer.current = setTimeout(() => setDone(null), 1600);
  };

  /* Sources */
  const applySource = useCallback((src: AsciiSource, state: SourceState) => {
    currentSrcRef.current = src;
    engineRef.current?.setSource(src);
    setSource(state);
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const selectExample = (ex: Example) => {
    stopStream();
    setCamera("off");
    beforeCameraRef.current = null;
    setNotice(null);
    applySource(exampleSource(ex), { kind: "example", id: ex.id });
  };

  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setNotice({ text: `“${file.name}” isn’t an image. Try a PNG, JPG, WebP or GIF.` });
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCamera("off");
        beforeCameraRef.current = null;
        setNotice(null);
        applySource(imageSource(img), { kind: "image", name: file.name || "Pasted image" });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        setNotice({ text: "That image couldn’t be read. Try another file." });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [applySource],
  );

  // Paste an image from the clipboard anywhere on the page.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      loadFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadFile]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice({ text: "Camera isn’t available here. It needs a secure (HTTPS) page and a browser with camera support." });
      return;
    }
    setCamera("starting");
    setNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      streamRef.current = stream;
      if (currentSrcRef.current) beforeCameraRef.current = { src: currentSrcRef.current, state: source };
      applySource(videoSource(video), { kind: "camera" });
      setCamera("on");
      setPlayIntent(true);
    } catch (err) {
      setCamera("off");
      const name = (err as DOMException)?.name;
      setNotice({
        text:
          name === "NotAllowedError" || name === "SecurityError"
            ? "Camera access was blocked. Allow it from your browser’s address bar, then try again."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "No camera was found on this device."
              : name === "NotReadableError"
                ? "Your camera is busy in another app. Close it and try again."
                : "The camera couldn’t start. Try again, or use an image instead.",
      });
    }
  };

  const stopCamera = () => {
    stopStream();
    setCamera("off");
    const prev = beforeCameraRef.current;
    beforeCameraRef.current = null;
    if (prev) applySource(prev.src, prev.state);
    else applySource(exampleSource(EXAMPLES[0]), { kind: "example", id: EXAMPLES[0].id });
  };

  const stageDrop = useFileDrop(loadFile);
  const zoneDrop = useFileDrop(loadFile);

  /* Playback */
  const togglePlay = () => setPlayIntent(!playing);
  const replay = () => {
    engineRef.current?.replay();
    setPlayIntent(true);
  };
  const chooseStyle = (style: AnimationType) => {
    update({ style });
    engineRef.current?.replay();
    setPlayIntent(true);
  };
  const toggleFullscreen = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else stage.requestFullscreen?.().catch(() => {});
  };

  /* Export */
  const copyText = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      await navigator.clipboard.writeText(engine.toText());
      flash("text");
    } catch {
      setNotice({ text: "Clipboard access was blocked by the browser." });
    }
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      download(blob, "motionkit-ascii.png");
      flash("png");
    }, "image/png");
  };

  const recordClip = () => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine || recording !== null) return;
    if (typeof MediaRecorder === "undefined" || !("captureStream" in canvas)) {
      setNotice({ text: "Recording isn’t supported in this browser. Download a PNG instead." });
      return;
    }
    const mime = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    let recorder: MediaRecorder;
    try {
      const stream = canvas.captureStream(60);
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined);
    } catch {
      setNotice({ text: "Recording isn’t supported in this browser." });
      return;
    }
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      engine.setKeepAlive(false);
      clearInterval(timer);
      setRecording(null);
      const type = recorder.mimeType || mime || "video/webm";
      download(new Blob(chunks, { type }), `motionkit-ascii.${type.includes("mp4") ? "mp4" : "webm"}`);
      flash("clip");
    };
    engine.setKeepAlive(true);
    engine.replay();
    setPlayIntent(true);
    const started = performance.now();
    setRecording(0);
    const timer = setInterval(() => setRecording(Math.min(1, (performance.now() - started) / (CLIP_SECONDS * 1000))), 100);
    recorder.start();
    setTimeout(() => recorder.state !== "inactive" && recorder.stop(), CLIP_SECONDS * 1000);
  };

  const copyReact = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      await navigator.clipboard.writeText(reactSnippet(engine.toText(), settings));
      flash("react");
    } catch {
      setNotice({ text: "Clipboard access was blocked by the browser." });
    }
  };

  /* Labels */
  const sourceLabel =
    source.kind === "example"
      ? EXAMPLES.find((e) => e.id === source.id)?.title ?? "Example"
      : source.kind === "image"
        ? source.name
        : "Camera";
  const fontPx = info.cellH ? Math.max(1, Math.round(info.cellH * base.fontScale)) : 0;

  return (
    <div className="mk-page">
      <PageHeader
        title="ASCII animator"
        description="Turn an image, a built-in example or your camera into animated text art, then export it."
      />

      <div className="mk-workspace">
        {/* ── Main column ── */}
        <div className="mk-stack-col">
          <div
            ref={stageRef}
            tabIndex={0}
            role="img"
            aria-label={`ASCII animation of ${sourceLabel}. Space to play or pause, R to replay.`}
            className="relative aspect-[16/10] select-none overflow-hidden rounded-[20px] border border-mk-border shadow-mk-md outline-none focus-visible:ring-2 focus-visible:ring-mk-accent max-sm:aspect-[4/3] [&:fullscreen]:aspect-auto [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
            style={{ background: base.background }}
            onKeyDown={(e) => {
              if (e.key === " ") {
                e.preventDefault();
                togglePlay();
              } else if (e.key === "r" || e.key === "R") {
                replay();
              }
            }}
            {...stageDrop.handlers}
          >
            <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

            <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
              <span className="mk-badge max-w-[60%] truncate">
                <span className="truncate">{sourceLabel}</span>
                {info.cols > 0 && <span className="text-mk-faint">{info.cols}×{info.rows}</span>}
              </span>
              {recording !== null ? (
                <span className="mk-badge">
                  <Film size={12} className="text-[#e5484d]" />
                  {(recording * CLIP_SECONDS).toFixed(1)}s / {CLIP_SECONDS}s
                </span>
              ) : camera === "on" ? (
                <span className="mk-badge">
                  <Camera size={12} />
                  Live
                </span>
              ) : !playing ? (
                <span className="mk-badge">
                  <Pause size={12} />
                  Paused
                </span>
              ) : null}
            </div>

            {/* Drag-over state */}
            <div
              aria-hidden={!stageDrop.dragging}
              data-on={stageDrop.dragging}
              className="pointer-events-none absolute inset-3 grid place-items-center rounded-[14px] border-2 border-dashed border-mk-accent bg-mk-bg/80 opacity-0 backdrop-blur-sm transition-opacity duration-150 data-[on=true]:opacity-100"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-mk-accent-soft text-mk-accent">
                  <ImageUp size={20} />
                </span>
                <p className="text-sm font-medium text-mk-text">Drop to convert</p>
                <p className="text-xs text-mk-muted">PNG, JPG, WebP or GIF</p>
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="mk-toolbar" role="toolbar" aria-label="Playback">
            <button type="button" className="mk-tool" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
              <span className="max-[380px]:hidden">{playing ? "Pause" : "Play"}</span>
            </button>
            <button type="button" className="mk-tool" onClick={replay} aria-label="Replay">
              <RotateCcw size={15} />
              <span className="max-[380px]:hidden">Replay</span>
            </button>
            <span className="mk-toolbar-sep" />
            <button type="button" className="mk-tool" onClick={() => fileRef.current?.click()} aria-label="Upload image">
              <ImageUp size={15} />
              <span className="max-sm:hidden">Upload</span>
            </button>
            <button
              type="button"
              className="mk-tool"
              data-active={camera === "on"}
              onClick={camera === "on" ? stopCamera : startCamera}
              disabled={camera === "starting"}
              aria-label={camera === "on" ? "Stop camera" : "Use camera"}
            >
              {camera === "starting" ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : camera === "on" ? (
                <CameraOff size={15} />
              ) : (
                <Camera size={15} />
              )}
              <span className="max-sm:hidden">{camera === "on" ? "Stop camera" : "Camera"}</span>
            </button>
            <span className="ml-auto hidden px-2 text-xs text-mk-faint md:inline">Drop or paste an image onto the stage</span>
            <button
              type="button"
              className="mk-tool max-md:ml-auto"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>

          {/* Animation styles */}
          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Animation style</h2>
              <span className="text-xs text-mk-muted">{STYLES.find((s) => s.key === base.style)?.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STYLES.map(({ key, label, desc, Icon }) => {
                const active = base.style === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className="mk-option"
                    data-active={active}
                    aria-pressed={active}
                    onClick={() => chooseStyle(key)}
                  >
                    <span
                      className={`grid h-12 place-items-center rounded-[9px] transition-colors duration-150 ${
                        active ? "bg-mk-accent-soft text-mk-accent" : "bg-mk-surface-2 text-mk-muted"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="mk-option-title">{label}</span>
                    <span className="mk-option-desc">{desc}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Side panel ── */}
        <aside className="mk-stack-col">
          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Source</h2>
              <span className="max-w-[55%] truncate text-xs text-mk-muted">
                {source.kind === "example" ? "Example" : source.kind === "image" ? "Your image" : "Camera"}
              </span>
            </div>

            <p className="mk-section-label">Examples</p>
            <div className="grid grid-cols-3 gap-2">
              {EXAMPLES.map((ex) => (
                <ExampleTile
                  key={ex.id}
                  example={ex}
                  active={source.kind === "example" && source.id === ex.id}
                  onSelect={() => selectExample(ex)}
                />
              ))}
            </div>

            {source.kind === "example" && (
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12.5px] text-mk-muted">
                <input
                  type="checkbox"
                  className="mk-check"
                  checked={base.animateSource}
                  onChange={(e) => update({ animateSource: e.target.checked })}
                />
                Animate the example itself
              </label>
            )}

            <div className="mt-5">
              <p className="mk-section-label">Your own</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="mk-dropzone w-full"
              data-drag={zoneDrop.dragging}
              onClick={() => fileRef.current?.click()}
              {...zoneDrop.handlers}
            >
              <ImageUp size={18} className="text-mk-text" />
              <span className="font-medium text-mk-text">
                {source.kind === "image" ? "Replace image" : "Drop an image or browse"}
              </span>
              <span className="text-xs">
                {source.kind === "image" ? <span className="break-all">{source.name}</span> : "PNG, JPG, WebP, GIF, or paste from clipboard"}
              </span>
            </button>
            <button
              type="button"
              className="mk-btn mk-btn-ghost mk-btn-sm mt-2 w-full justify-center"
              onClick={camera === "on" ? stopCamera : startCamera}
              disabled={camera === "starting"}
            >
              {camera === "starting" ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : camera === "on" ? (
                <CameraOff size={14} />
              ) : (
                <Camera size={14} />
              )}
              {camera === "on" ? "Stop camera" : camera === "starting" ? "Waiting for permission…" : "Use camera"}
            </button>
            {notice && (
              <div className="mk-tip mt-3" role="status">
                <TriangleAlert size={15} className="mt-px shrink-0 text-mk-text" />
                <span>{notice.text}</span>
              </div>
            )}
          </section>

          <section className="mk-panel flex flex-col gap-4">
            <h2 className="mk-panel-title">Conversion</h2>
            <Range
              label="Columns"
              value={cols}
              display={`${cols}`}
              min={24}
              max={200}
              onChange={(v) => setColsIntent(v)}
            />
            <Range
              label="Contrast"
              value={base.contrast}
              display={`${base.contrast.toFixed(2)}×`}
              min={0.5}
              max={2.5}
              step={0.05}
              onChange={(v) => update({ contrast: v })}
            />
            <Range
              label="Brightness"
              value={base.brightness}
              display={`${base.brightness > 0 ? "+" : ""}${Math.round(base.brightness * 100)}%`}
              min={-0.5}
              max={0.5}
              step={0.01}
              onChange={(v) => update({ brightness: v })}
            />
            <label className="flex cursor-pointer items-center justify-between gap-2 text-[12.5px] text-mk-muted">
              Invert
              <input
                type="checkbox"
                className="mk-check"
                checked={base.invert}
                onChange={(e) => update({ invert: e.target.checked })}
              />
            </label>
            <div>
              <p className="mk-section-label">Characters</p>
              <div className="mk-chips">
                {(Object.keys(CHAR_SETS) as CharSetKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="mk-chip"
                    data-active={base.charSet === k}
                    aria-pressed={base.charSet === k}
                    title={CHAR_SETS[k].join("")}
                    onClick={() => update({ charSet: k })}
                  >
                    {CHARSET_LABELS[k]}
                    <span className="font-mono text-[11px] opacity-60" aria-hidden>
                      {CHAR_SETS[k].filter((c) => c.trim() && c !== "⠀").slice(0, 3).join("")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="mk-panel flex flex-col gap-4">
            <h2 className="mk-panel-title">Appearance</h2>
            <Range
              label="Speed"
              value={base.speed}
              display={`${base.speed.toFixed(1)}×`}
              min={0.1}
              max={3}
              step={0.1}
              onChange={(v) => update({ speed: v })}
            />
            <Range
              label="Font size"
              value={base.fontScale}
              display={fontPx ? `${fontPx}px` : `${Math.round(base.fontScale * 100)}%`}
              min={0.4}
              max={1.6}
              step={0.05}
              onChange={(v) => update({ fontScale: v })}
            />
            <div>
              <p className="mk-section-label">Colour</p>
              <div className="mk-chips">
                {COLOR_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className="mk-chip"
                    data-active={base.colorMode === m.value}
                    aria-pressed={base.colorMode === m.value}
                    onClick={() => update({ colorMode: m.value })}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {base.colorMode === "tint" && (
                <div className="mt-3">
                  <ColorPicker
                    label="Tint colour"
                    options={TINTS.map((c) => ({ value: c, label: c }))}
                    value={base.tint}
                    onChange={(v) => update({ tint: v })}
                  />
                </div>
              )}
            </div>
            <div>
              <p className="mk-section-label">Background</p>
              <ColorPicker
                label="Background colour"
                options={BACKGROUNDS}
                value={base.background}
                onChange={(v) => update({ background: v })}
              />
            </div>
          </section>

          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Export</h2>
              <span className="text-xs text-mk-muted">Current frame</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ExportButton onClick={copyText} done={done === "text"} icon={<Copy size={14} />}>
                Copy text
              </ExportButton>
              <ExportButton onClick={downloadPng} done={done === "png"} icon={<Download size={14} />}>
                Save PNG
              </ExportButton>
              <ExportButton
                onClick={recordClip}
                done={done === "clip"}
                icon={<Film size={14} />}
                disabled={recording !== null}
              >
                {recording !== null ? `Recording ${Math.round(recording * 100)}%` : `Record ${CLIP_SECONDS}s`}
              </ExportButton>
              <ExportButton onClick={copyReact} done={done === "react"} icon={<Code size={14} />}>
                Copy React
              </ExportButton>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-mk-muted">
              Text and React copy the characters of the current frame. The clip records the stage as video.
            </p>
          </section>
        </aside>
      </div>

      <MorePlaygrounds current="/ascii" />
    </div>
  );
}
