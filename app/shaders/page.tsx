"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Check,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  SkipBack,
  Sparkles,
  Undo2,
} from "lucide-react";
import PageHeader from "../compoents/ui/PageHeader";
import SegmentedTabs from "../compoents/ui/SegmentedTabs";
import MorePlaygrounds from "../compoents/ui/MorePlaygrounds";
import CodeEditor, { type CodeEditorHandle } from "./CodeEditor";
import PresetTile, { controlsFor } from "./PresetTile";
import {
  bakeDefaults,
  hasWebGL,
  parseControls,
  resolveValues,
  ShaderRenderer,
  type CompileResult,
  type Control,
  type RendererStats,
  type UniformValue,
  type UniformValues,
} from "./engine";
import { componentName, reactComponent } from "./exporters";
import { DEFAULT_PRESET_ID, presets, templates } from "./presets";
import "./shaders.css";

type Mode = "presets" | "custom";
type CodeTab = "glsl" | "react";
type ExportSize = "view" | "1080p" | "4k";

const DRAFT_KEY = "mk-shader-draft";
const SIZES: Record<ExportSize, { label: string; w?: number; h?: number }> = {
  view: { label: "Canvas" },
  "1080p": { label: "1080p", w: 1920, h: 1080 },
  "4k": { label: "4K", w: 3840, h: 2160 },
};

const noopSubscribe = () => () => {};

/* prefers-reduced-motion with a server snapshot, so hydration always matches
   and the real value applies right after. */
const RM_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (cb: () => void) => {
  const mq = window.matchMedia(RM_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(RM_QUERY).matches,
    () => false,
  );

function CopyIcon({ done }: { done: boolean }) {
  return (
    <span className="mk-swap" data-state={done ? "b" : "a"}>
      <Copy size={14} className="mk-swap-a" />
      <Check size={14} className="mk-swap-b" />
    </span>
  );
}

function RangeControl({
  control,
  value,
  onChange,
}: {
  control: Extract<Control, { kind: "range" }>;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - control.min) / (control.max - control.min)) * 100;
  const digits = control.step >= 1 ? 0 : control.step >= 0.1 ? 1 : 2;
  const id = `sh-${control.name}`;
  return (
    <div className="mk-field">
      <div className="mk-field-row">
        <label htmlFor={id}>{control.label}</label>
        <span className="mk-value">{value.toFixed(digits)}</span>
      </div>
      <input
        id={id}
        type="range"
        className="mk-range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        style={{ "--p": `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function ColorControl({
  control,
  value,
  onChange,
}: {
  control: Extract<Control, { kind: "color" }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="sh-color">
      <span>{control.label}</span>
      <label className="sh-color-input">
        <span className="sh-color-chip" style={{ background: value }} />
        <span className="mk-value">{value}</span>
        <input
          type="color"
          value={value}
          aria-label={control.label}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
        />
      </label>
    </div>
  );
}

export default function ShadersPage() {
  const reduceMotion = useReducedMotion();
  const supported = useSyncExternalStore(noopSubscribe, hasWebGL, () => true);

  const [mode, setMode] = useState<Mode>("presets");
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [presetValues, setPresetValues] = useState<Record<string, UniformValues>>({});
  const [customCode, setCustomCode] = useState(templates[0].source);
  const [customGood, setCustomGood] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<UniformValues>({});
  const [status, setStatus] = useState<CompileResult | null>(null);
  const [undo, setUndo] = useState<string | null>(null);
  const [docId, setDocId] = useState(0);
  const [playOverride, setPlayOverride] = useState<boolean | null>(null);
  const [speed, setSpeed] = useState(1);
  const [codeTab, setCodeTab] = useState<CodeTab>("glsl");
  const [exportSize, setExportSize] = useState<ExportSize>("view");
  const [exporting, setExporting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const playing = playOverride ?? !reduceMotion;

  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLSpanElement>(null);
  const rendererRef = useRef<ShaderRenderer | null>(null);
  const editorRef = useRef<CodeEditorHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const draftLoaded = useRef(false);
  const playingRef = useRef(playing);

  const preset = presets.find((p) => p.id === presetId) ?? presets[0];
  const showingCustom = mode === "custom" && customGood !== null;
  const source = showingCustom ? customGood : preset.source;
  const customControls = useMemo(() => (customGood ? parseControls(customGood) : []), [customGood]);
  const controls = showingCustom ? customControls : controlsFor(preset);
  const overrides = showingCustom ? customValues : presetValues[presetId];
  const values = useMemo(() => resolveValues(controls, overrides), [controls, overrides]);
  const displayName = showingCustom ? "Custom shader" : preset.name;

  /* ─── Renderer lifecycle ─── */

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // A fresh canvas per mount: a context lost on unmount can't be reused.
    const canvas = document.createElement("canvas");
    canvas.className = "sh-gl";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    let r: ShaderRenderer;
    try {
      r = new ShaderRenderer(canvas);
    } catch {
      canvas.remove();
      return;
    }
    r.onStats = ({ fps, width, height }: RendererStats) => {
      const el = statsRef.current;
      if (!el) return;
      const size = `${width}×${height}`;
      el.textContent = fps > 0 ? `${Math.round(fps)} fps · ${size}` : `${playingRef.current ? "Idle" : "Paused"} · ${size}`;
    };
    rendererRef.current = r;
    return () => {
      rendererRef.current = null;
      r.destroy();
      canvas.remove();
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setValues(values);
  }, [values]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r && r.currentSource !== source) r.compile(source);
  }, [source]);

  useEffect(() => {
    playingRef.current = playing;
    rendererRef.current?.setPlaying(playing);
  }, [playing]);

  useEffect(() => {
    rendererRef.current?.setSpeed(speed);
  }, [speed]);

  useEffect(
    () => () => {
      clearTimeout(debounceRef.current);
      clearTimeout(copyTimer.current);
    },
    [],
  );

  /* ─── Fullscreen ─── */

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement && document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (el && document.fullscreenEnabled && el.requestFullscreen) {
      el.requestFullscreen().catch(() => setExpanded(true));
    } else {
      setExpanded(true);
    }
  };

  /* ─── Custom GLSL ─── */

  const compileCustom = useCallback((code: string) => {
    const r = rendererRef.current;
    if (!r) return;
    const res = r.compile(code);
    setStatus(res);
    if (res.ok) setCustomGood(code);
    try {
      localStorage.setItem(DRAFT_KEY, code);
    } catch {}
  }, []);

  const onCodeChange = (code: string) => {
    setCustomCode(code);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => compileCustom(code), 350);
  };

  const compileNow = () => {
    clearTimeout(debounceRef.current);
    compileCustom(customCode);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m !== "custom") return;
    setCodeTab("glsl");
    let code = customCode;
    if (!draftLoaded.current) {
      draftLoaded.current = true;
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          code = draft;
          setCustomCode(draft);
        }
      } catch {}
    }
    compileCustom(code);
  };

  const replaceCustom = (code: string) => {
    if (customCode !== code) setUndo(customCode);
    draftLoaded.current = true;
    clearTimeout(debounceRef.current);
    setCustomCode(code);
    setCustomValues({});
    setDocId((n) => n + 1);
    setMode("custom");
    setCodeTab("glsl");
    compileCustom(code);
  };

  const editPresetCopy = () => replaceCustom(bakeDefaults(preset.source, controls, values));

  const undoReplace = () => {
    if (undo === null) return;
    const code = undo;
    setUndo(null);
    setCustomCode(code);
    setDocId((n) => n + 1);
    compileCustom(code);
  };

  /* ─── Controls ─── */

  const setValue = (name: string, v: UniformValue) => {
    if (showingCustom) setCustomValues((prev) => ({ ...prev, [name]: v }));
    else setPresetValues((prev) => ({ ...prev, [presetId]: { ...prev[presetId], [name]: v } }));
  };

  const resetControls = () => {
    if (showingCustom) setCustomValues({});
    else
      setPresetValues((prev) => {
        const next = { ...prev };
        delete next[presetId];
        return next;
      });
    setSpeed(1);
  };

  /* ─── Export ─── */

  const glslOut = useMemo(() => bakeDefaults(source, controls, values), [source, controls, values]);
  const reactOut = useMemo(
    () =>
      codeTab === "react" || copied === "react"
        ? reactComponent({ name: showingCustom ? "Custom" : preset.name, source: glslOut, controls, values, speed })
        : "",
    [codeTab, copied, showingCustom, preset.name, glslOut, controls, values, speed],
  );

  const copy = (kind: string, text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(kind);
        clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(null), 1600);
      },
      () => {},
    );
  };

  const copyGlsl = () => copy("glsl", mode === "custom" ? customCode : glslOut);
  const copyReact = () =>
    copy(
      "react",
      reactComponent({ name: showingCustom ? "Custom" : preset.name, source: glslOut, controls, values, speed }),
    );

  const downloadPng = async (size: ExportSize = exportSize) => {
    const r = rendererRef.current;
    if (!r || exporting) return;
    setExporting(true);
    const { w, h } = SIZES[size];
    try {
      const blob = await r.capture(w, h);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = componentName(displayName).replace(/Shader$/, "").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
      a.href = url;
      a.download = `${slug || "shader"}${w ? `-${w}x${h}` : ""}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setExporting(false);
    }
  };

  /* ─── Render ─── */

  const errors = useMemo(() => (status && !status.ok ? status.errors : []), [status]);
  const errorLines = useMemo(
    () => errors.map((e) => e.line).filter((l): l is number => l !== null),
    [errors],
  );
  const isFull = fullscreen || expanded;
  const animateThumbs = !reduceMotion;

  const playbackControls = (
    <>
      <div className="flex items-center gap-2">
        <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => setPlayOverride(!playing)}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => rendererRef.current?.restart()}>
          <SkipBack size={14} />
          Restart
        </button>
      </div>
      <div className="mt-4">
        <RangeControl
          control={{ kind: "range", name: "speed", label: "Speed", min: 0, max: 3, step: 0.05, def: 1 }}
          value={speed}
          onChange={setSpeed}
        />
      </div>
    </>
  );

  return (
    <main className="mk-page">
      <PageHeader
        icon={<Sparkles size={13} />}
        title="Shader playground"
        description="GPU backgrounds you can tune live. Start from a preset or write your own GLSL, then copy it as a React component."
      >
        <SegmentedTabs
          label="Mode"
          items={[
            { value: "presets", label: "Presets" },
            { value: "custom", label: "Custom GLSL" },
          ]}
          value={mode}
          onChange={switchMode}
        />
      </PageHeader>

      <div className="mk-workspace sh-workspace" data-mode={mode}>
        <div className="mk-stack-col sh-main">
          {/* Stage */}
          <div className="sh-stage-wrap">
            <div
              ref={stageRef}
              className="mk-canvas sh-stage"
              data-expanded={expanded}
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                rendererRef.current?.setPointer(
                  (e.clientX - rect.left) / rect.width,
                  1 - (e.clientY - rect.top) / rect.height,
                );
              }}
              onPointerLeave={() => rendererRef.current?.setPointer(null)}
            >
              <div ref={hostRef} className="sh-host" />
              {!supported && (
                <div className="sh-fallback">
                  WebGL isn’t available in this browser, so shaders can’t run here. You can still browse and copy the code.
                </div>
              )}
              <div className="sh-overlay sh-overlay-top">
                <span className="mk-badge">{displayName}</span>
                <span className="mk-badge" ref={statsRef} aria-live="off">
                  …
                </span>
              </div>
              <div className="sh-overlay sh-overlay-bottom">
                <div className="sh-btns">
                  <button
                    type="button"
                    className="mk-icon-btn"
                    aria-label={playing ? "Pause" : "Play"}
                    title={playing ? "Pause" : "Play"}
                    onClick={() => setPlayOverride(!playing)}
                  >
                    {playing ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    type="button"
                    className="mk-icon-btn"
                    aria-label="Restart from zero"
                    title="Restart"
                    onClick={() => rendererRef.current?.restart()}
                  >
                    <SkipBack size={14} />
                  </button>
                </div>
                <div className="sh-btns">
                  <button
                    type="button"
                    className="mk-icon-btn"
                    aria-label="Download PNG of this frame"
                    title="Download PNG"
                    onClick={() => downloadPng("view")}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    className="mk-icon-btn"
                    aria-label={isFull ? "Exit full screen" : "Full screen"}
                    title={isFull ? "Exit full screen" : "Full screen"}
                    onClick={toggleFullscreen}
                  >
                    {isFull ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Code */}
          <section className="mk-panel sh-code-panel">
            <div className="mk-panel-head sh-code-head">
              <SegmentedTabs
                label="Code view"
                size="sm"
                items={[
                  { value: "glsl", label: mode === "custom" ? "Editor" : "GLSL" },
                  { value: "react", label: "React" },
                ]}
                value={codeTab}
                onChange={setCodeTab}
              />
              <div className="flex items-center gap-2">
                {mode === "presets" && codeTab === "glsl" && (
                  <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={editPresetCopy}>
                    <PenLine size={14} />
                    <span className="hidden sm:inline">Edit a copy</span>
                    <span className="sm:hidden">Edit</span>
                  </button>
                )}
                <button
                  type="button"
                  className="mk-btn mk-btn-ghost mk-btn-sm"
                  onClick={codeTab === "react" ? copyReact : copyGlsl}
                >
                  <CopyIcon done={copied === codeTab} />
                  {copied === codeTab ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {codeTab === "react" ? (
              <pre className="mk-code sh-pre">
                <code>{reactOut}</code>
              </pre>
            ) : mode === "custom" ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="sh-status" role="status">
                    <span className="sh-dot" data-error={errors.length > 0} />
                    {status === null
                      ? "Compiling…"
                      : status.ok
                        ? `Compiled in ${Math.max(1, Math.round(status.ms))} ms`
                        : `${errors.length} ${errors.length === 1 ? "error" : "errors"} · ${
                            customGood ? "last working shader still running" : "showing the preset until it compiles"
                          }`}
                  </span>
                  <span className="text-[12px] text-mk-faint">Auto-compiles as you type · ⌘S to compile now</span>
                </div>
                <CodeEditor
                  key={docId}
                  ref={editorRef}
                  value={customCode}
                  onChange={onCodeChange}
                  onSubmit={compileNow}
                  errorLines={errorLines}
                />
                {errors.length > 0 && (
                  <div className="sh-errors">
                    {errors.slice(0, 6).map((e, i) => (
                      <button
                        key={`${e.line}-${i}`}
                        type="button"
                        className="sh-error"
                        onClick={() => e.line && editorRef.current?.focusLine(e.line)}
                      >
                        {e.line !== null && <span className="sh-error-line">Line {e.line}</span>}
                        <span>{e.message}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="sh-help" id="sh-editor-help">
                  Built-ins: <code>u_time</code>, <code>u_resolution</code>, <code>u_mouse</code> (0–1). Add{" "}
                  <code>{"// @range 0 1 0.5"}</code> after a <code>float</code> uniform or <code>{"// @color #ff6b4a"}</code>{" "}
                  after a <code>vec3</code> to get a control. <code>#version 300 es</code> works too. Tab indents; press
                  Esc then Tab to leave the editor.
                </p>
              </>
            ) : (
              <pre className="mk-code sh-pre">
                <code>{glslOut}</code>
              </pre>
            )}
          </section>
        </div>

        {/* Side panel */}
        <aside className="mk-stack-col sh-side">
          {mode === "presets" ? (
            <section className="mk-panel">
              <div className="mk-panel-head">
                <h2 className="mk-panel-title">Presets</h2>
                <span className="text-[12px] text-mk-faint">{presets.length} shaders</span>
              </div>
              <div className="sh-presets-scroll">
                <div className="sh-presets">
                  {presets.map((p) => (
                    <PresetTile
                      key={p.id}
                      preset={p}
                      active={p.id === presetId}
                      overrides={presetValues[p.id]}
                      animate={animateThumbs}
                      onSelect={() => setPresetId(p.id)}
                    />
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="mk-panel">
              <div className="mk-panel-head">
                <h2 className="mk-panel-title">Starter templates</h2>
                {undo !== null && (
                  <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={undoReplace}>
                    <Undo2 size={14} />
                    Undo
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="mk-option sh-template"
                    data-active={customCode === t.source}
                    onClick={() => replaceCustom(t.source)}
                  >
                    <span className="mk-option-title">{t.name}</span>
                    <span className="mk-option-desc">{t.description}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Controls</h2>
              <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={resetControls}>
                <RotateCcw size={14} />
                Reset
              </button>
            </div>
            {playbackControls}
            <div className="sh-divider" />
            {controls.length ? (
              <div className="flex flex-col gap-4">
                {controls.map((c) =>
                  c.kind === "range" ? (
                    <RangeControl
                      key={c.name}
                      control={c}
                      value={values[c.name] as number}
                      onChange={(v) => setValue(c.name, v)}
                    />
                  ) : (
                    <ColorControl
                      key={c.name}
                      control={c}
                      value={values[c.name] as string}
                      onChange={(v) => setValue(c.name, v)}
                    />
                  ),
                )}
              </div>
            ) : (
              <p className="m-0 text-[12.5px] leading-relaxed text-mk-muted">
                No tunable uniforms yet. Add <code className="font-mono text-mk-text">{"// @range 0 1 0.5"}</code> after a
                float uniform to get a slider here.
              </p>
            )}
          </section>

          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Export</h2>
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" className="mk-btn mk-btn-primary w-full justify-center" onClick={copyReact}>
                <CopyIcon done={copied === "react"} />
                {copied === "react" ? "Copied React component" : "Copy React component"}
              </button>
              <button type="button" className="mk-btn mk-btn-ghost w-full justify-center" onClick={copyGlsl}>
                <CopyIcon done={copied === "glsl"} />
                {copied === "glsl" ? "Copied GLSL" : "Copy GLSL"}
              </button>
            </div>
            <div className="sh-divider" />
            <p className="mk-section-label">Image</p>
            <div className="flex items-center gap-2">
              <div className="mk-chips flex-1" role="radiogroup" aria-label="PNG size">
                {(Object.keys(SIZES) as ExportSize[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={exportSize === k}
                    className="mk-chip"
                    data-active={exportSize === k}
                    onClick={() => setExportSize(k)}
                  >
                    {SIZES[k].label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mk-btn mk-btn-ghost mk-btn-sm"
                onClick={() => downloadPng()}
                disabled={exporting || !supported}
              >
                <Download size={14} />
                PNG
              </button>
            </div>
          </section>

          <div className="mk-tip">
            <Sparkles size={15} className="mt-0.5 flex-none text-mk-accent" />
            <span>
              The React export is self-contained: it sizes for retina screens, pauses off-screen and in background tabs,
              and holds still for <strong>reduced motion</strong>.
            </span>
          </div>
        </aside>
      </div>

      <MorePlaygrounds current="/shaders" />
    </main>
  );
}
