"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  CopyPlus,
  Eye,
  EyeOff,
  Layers,
  MousePointerClick,
  PanelTop,
  Plus,
  RotateCcw,
  SunMedium,
  Tag,
  TextCursorInput,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import PageHeader from "../compoents/ui/PageHeader";
import SegmentedTabs from "../compoents/ui/SegmentedTabs";
import MorePlaygrounds from "../compoents/ui/MorePlaygrounds";
import PreviewElement from "./PreviewElement";
import { ColorRow, Range } from "./controls";
import {
  BORDER_SWATCHES,
  DEFAULT_PRESET,
  MAX_DIST,
  PRESETS,
  SURFACE_SWATCHES,
  SWATCHES,
  aimLayers,
  borderCss,
  boxShadow,
  buildCss,
  buildTailwind,
  newId,
  primaryOffset,
  px,
  scaleLayers,
  smoothLayers,
  withIds,
  type Border,
  type BorderStyle,
  type Layer,
  type Paint,
  type Preset,
  type PreviewKind,
  type SmoothParams,
} from "./shadow-lib";

const EASE = [0.23, 1, 0.32, 1] as const;

const KINDS: { value: PreviewKind; label: string; icon: React.ReactNode }[] = [
  { value: "button", label: "Button", icon: <MousePointerClick size={15} /> },
  { value: "card", label: "Card", icon: <PanelTop size={15} /> },
  { value: "input", label: "Input", icon: <TextCursorInput size={15} /> },
  { value: "badge", label: "Badge", icon: <Tag size={15} /> },
  { value: "profile", label: "Profile", icon: <UserRound size={15} /> },
];

const BORDER_STYLES: BorderStyle[] = ["none", "solid", "dashed", "dotted", "double"];
const BG_SWATCHES = ["#ffffff", "#f4f4f5", "#e0e5ec", "#111113", "#1f2937"];

const INITIAL_LAYERS = withIds(DEFAULT_PRESET.layers, "init");
const DEFAULT_SMOOTH: SmoothParams = { count: 5, distance: 24, softness: 1.6, darkness: 0.28, color: "#0b0b0c" };

/** Canvas size via ResizeObserver (used to place the light-source handle). */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }, []);
  return [copied, copy] as const;
}

function PresetTile({ preset, active, onPick }: { preset: Preset; active: boolean; onPick: () => void }) {
  const layers = scaleLayers(withIds(preset.layers, "p"), 0.45);
  const bg = !preset.background || preset.background === "auto" ? "var(--mk-surface-2)" : preset.background;
  const surface = !preset.surface || preset.surface === "auto" ? "var(--sh-el, var(--mk-surface))" : preset.surface;
  return (
    <button type="button" className="mk-option" data-active={active} onClick={onPick}>
      <span className="grid h-[60px] place-items-center rounded-[10px]" style={{ background: bg }}>
        <span
          className="h-7 w-11"
          style={{
            background: surface,
            boxShadow: boxShadow(layers),
            border: preset.border.style === "none" ? "none" : `${Math.max(1, preset.border.width * 0.6)}px ${preset.border.style === "double" ? "solid" : preset.border.style} ${preset.border.color}`,
            borderRadius: preset.border.radius * 0.5,
          }}
        />
      </span>
      <span className="mk-option-title">{preset.name}</span>
      <span className="mk-option-desc">{preset.desc}</span>
    </button>
  );
}

export default function ShadowPage() {
  const reduce = useReducedMotion();

  const [layers, setLayers] = useState<Layer[]>(INITIAL_LAYERS);
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_LAYERS[INITIAL_LAYERS.length - 1].id);
  const [border, setBorder] = useState<Border>(DEFAULT_PRESET.border);
  const [kind, setKind] = useState<PreviewKind>("card");
  const [background, setBackground] = useState<Paint>("auto");
  const [surface, setSurface] = useState<Paint>("auto");
  const [presetName, setPresetName] = useState<string | null>(DEFAULT_PRESET.name);
  const [lightOn, setLightOn] = useState(false);
  const [angle, setAngle] = useState(Math.PI / 2); // shadow direction, radians
  const [smooth, setSmooth] = useState<SmoothParams>(DEFAULT_SMOOTH);
  const [tab, setTab] = useState<"css" | "tailwind">("css");
  const [easeChanges, setEaseChanges] = useState(false);
  const easeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [copied, copy] = useCopy();

  const [canvasRef, size] = useSize<HTMLDivElement>();
  const drag = useRef<{ base: Layer[] } | null>(null);

  useEffect(() => () => clearTimeout(easeTimer.current), []);

  /** Animate the shadow only for discrete jumps (presets, reset), never while dragging. */
  const softly = () => {
    if (reduce) return;
    setEaseChanges(true);
    clearTimeout(easeTimer.current);
    easeTimer.current = setTimeout(() => setEaseChanges(false), 320);
  };

  const editLayers = (fn: (l: Layer[]) => Layer[]) => {
    setLayers(fn);
    setPresetName(null);
  };
  const editBorder = <K extends keyof Border>(key: K, v: Border[K]) => {
    setBorder((b) => ({ ...b, [key]: v }));
    setPresetName(null);
  };

  const selected = layers.find((l) => l.id === selectedId) ?? null;
  const selectedIndex = selected ? layers.indexOf(selected) : -1;

  const updateSelected = <K extends keyof Layer>(key: K, v: Layer[K]) =>
    editLayers((ls) => ls.map((l) => (l.id === selectedId ? { ...l, [key]: v } : l)));

  const applyPreset = (p: Preset) => {
    const next = withIds(p.layers);
    softly();
    setLayers(next);
    setSelectedId(next[next.length - 1]?.id ?? null);
    setBorder(p.border);
    setSurface(p.surface ?? "auto");
    setBackground(p.background ?? "auto");
    setPresetName(p.name);
    const o = primaryOffset(next);
    if (o && o.dist > 0) setAngle(o.angle);
  };

  const addLayer = () => {
    const l: Layer = { id: newId(), x: 0, y: 6, blur: 16, spread: -4, opacity: 0.12, color: "#0b0b0c", inset: false, visible: true };
    editLayers((ls) => {
      const at = selectedIndex >= 0 ? selectedIndex + 1 : ls.length;
      return [...ls.slice(0, at), l, ...ls.slice(at)];
    });
    setSelectedId(l.id);
  };
  const duplicateLayer = () => {
    if (!selected) return;
    const l = { ...selected, id: newId() };
    editLayers((ls) => [...ls.slice(0, selectedIndex + 1), l, ...ls.slice(selectedIndex + 1)]);
    setSelectedId(l.id);
  };
  const deleteLayer = () => {
    if (!selected) return;
    const rest = layers.filter((l) => l.id !== selected.id);
    editLayers(() => rest);
    setSelectedId(rest[Math.min(selectedIndex, rest.length - 1)]?.id ?? null);
  };
  const moveLayer = (dir: -1 | 1) => {
    const to = selectedIndex + dir;
    if (selectedIndex < 0 || to < 0 || to >= layers.length) return;
    editLayers((ls) => {
      const next = [...ls];
      [next[selectedIndex], next[to]] = [next[to], next[selectedIndex]];
      return next;
    });
  };

  const updateSmooth = <K extends keyof SmoothParams>(key: K, v: SmoothParams[K]) => {
    const params = { ...smooth, [key]: v };
    setSmooth(params);
    const next = withIds(smoothLayers(params, angle));
    setLayers(next);
    setSelectedId(next[next.length - 1].id);
    setPresetName(null);
  };

  const reset = () => applyPreset(DEFAULT_PRESET);

  /* ── light source ─────────────────────────────── */
  // The handle travels on an ellipse that fits the canvas; INNER keeps it clear of the element.
  const Rx = Math.max(60, size.w / 2 - 28);
  const Ry = Math.max(60, size.h / 2 - 28);
  const INNER = 0.55;
  const primary = primaryOffset(layers);
  const shadowAngle = primary && primary.dist > 0.01 ? primary.angle : angle;
  const dist = primary?.dist ?? 0;
  const lightDir = shadowAngle + Math.PI;
  const edge = 1 / Math.hypot(Math.cos(lightDir) / Rx, Math.sin(lightDir) / Ry);
  const handleR = edge * (INNER + Math.min(dist / MAX_DIST, 1) * (1 - INNER));
  const handle = { x: size.w / 2 + Math.cos(lightDir) * handleR, y: size.h / 2 + Math.sin(lightDir) * handleR };
  const degrees = Math.round((((shadowAngle * 180) / Math.PI) % 360 + 360) % 360);

  const aim = (base: Layer[], a: number, d: number) => {
    const clamped = Math.max(1, Math.min(MAX_DIST, d));
    setLayers(aimLayers(base, a, clamped));
    setAngle(a);
    setPresetName(null);
  };

  const onHandleDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { base: layers };
  };
  const onHandleMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const vx = e.clientX - (rect.left + rect.width / 2);
    const vy = e.clientY - (rect.top + rect.height / 2);
    const f = Math.hypot(vx / Rx, vy / Ry);
    const d = ((f - INNER) / (1 - INNER)) * MAX_DIST;
    aim(drag.current.base, Math.atan2(vy, vx) + Math.PI, d);
  };
  const onHandleUp = () => {
    drag.current = null;
  };
  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = (10 * Math.PI) / 180;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, 2],
      ArrowDown: [0, -2],
    };
    const m = map[e.key];
    if (!m) return;
    e.preventDefault();
    aim(layers, shadowAngle + m[0], Math.max(1, dist) + m[1]);
  };

  /* ── output ───────────────────────────────────── */
  const css = useMemo(() => buildCss(layers, border), [layers, border]);
  const tw = useMemo(() => buildTailwind(layers, border), [layers, border]);
  const code = tab === "css" ? css : tw;
  const visibleCount = layers.filter((l) => l.visible).length;

  const elementStyle: CSSProperties = {
    boxShadow: boxShadow(layers),
    border: borderCss(border),
    borderRadius: border.radius,
    transition: easeChanges
      ? "box-shadow 280ms var(--ease-out), border-radius 280ms var(--ease-out), border-color 200ms ease, background-color 200ms ease"
      : undefined,
  };

  const canvasBg: CSSProperties = background === "auto" ? {} : { backgroundColor: background };

  return (
    <main className="mk-page">
      <PageHeader
        icon={<Layers size={13} />}
        title="Shadow studio"
        description="Stack soft, realistic box shadows layer by layer, aim them with a light source, then copy the CSS or Tailwind class."
      />

      <div className="mk-workspace">
        {/* ── Left: preview + output ── */}
        <div className="mk-stack-col lg:sticky lg:top-20">
          <div className="mk-toolbar" role="toolbar" aria-label="Preview">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                className="mk-tool"
                data-active={kind === k.value}
                aria-pressed={kind === k.value}
                onClick={() => setKind(k.value)}
              >
                {k.icon}
                <span className="max-sm:hidden">{k.label}</span>
              </button>
            ))}
            <span className="mk-toolbar-sep" />
            <button
              type="button"
              className="mk-tool"
              data-active={lightOn}
              aria-pressed={lightOn}
              onClick={() => setLightOn((v) => !v)}
              title="Drag the light to aim every layer"
            >
              <SunMedium size={15} />
              <span className="max-sm:hidden">Light source</span>
            </button>
            <button type="button" className="mk-tool ml-auto" onClick={reset} aria-label="Reset" title="Reset">
              <RotateCcw size={15} />
            </button>
          </div>

          <div
            ref={canvasRef}
            className="mk-canvas grid [--sh-el:var(--mk-surface)] dark:[--sh-el:#26262b] h-[clamp(300px,calc(100vh-480px),440px)] place-items-center max-sm:h-[340px]"
            style={canvasBg}
          >
            <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5">
              <span className="mk-badge">
                {visibleCount} {visibleCount === 1 ? "layer" : "layers"}
              </span>
              {lightOn && (
                <span className="mk-badge">
                  {degrees}° · {px(dist)}
                </span>
              )}
            </div>

            {lightOn && size.w > 0 && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                <ellipse
                  cx={size.w / 2}
                  cy={size.h / 2}
                  rx={Rx}
                  ry={Ry}
                  fill="none"
                  stroke="var(--mk-border-strong)"
                  strokeDasharray="3 5"
                />
                <line
                  x1={size.w / 2}
                  y1={size.h / 2}
                  x2={handle.x}
                  y2={handle.y}
                  stroke="var(--mk-accent)"
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              </svg>
            )}

            <motion.div
              key={kind}
              className="relative z-[1]"
              initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              <PreviewElement kind={kind} surface={surface} style={elementStyle} />
            </motion.div>

            {lightOn && size.w > 0 && (
              <button
                type="button"
                className="absolute z-[2] grid h-9 w-9 cursor-grab touch-none place-items-center rounded-full border border-mk-border-strong bg-mk-surface text-[#f59e0b] shadow-mk-md outline-none transition-[box-shadow] duration-150 focus-visible:shadow-[0_0_0_3px_var(--mk-accent-soft)] active:cursor-grabbing"
                style={{ left: handle.x - 18, top: handle.y - 18 }}
                aria-label={`Light source: shadow at ${degrees} degrees, ${Math.round(dist)} pixels. Arrow keys rotate and change distance.`}
                onPointerDown={onHandleDown}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
                onKeyDown={onHandleKey}
              >
                <SunMedium size={18} strokeWidth={2.25} />
              </button>
            )}
          </div>


          <div className="mk-panel">
            <div className="mk-panel-head flex-wrap">
              <h2 className="mk-panel-title">Code</h2>
              <div className="flex items-center gap-2 [&_.mk-tabs-wrap]:mb-0">
                <SegmentedTabs
                  label="Output format"
                  size="sm"
                  value={tab}
                  onChange={setTab}
                  items={[
                    { value: "css", label: "CSS" },
                    { value: "tailwind", label: "Tailwind" },
                  ]}
                />
                <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => copy(code)}>
                  <span className="mk-swap" data-state={copied ? "b" : "a"}>
                    <Copy size={14} className="mk-swap-a" />
                    <Check size={14} className="mk-swap-b" />
                  </span>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <pre className={`mk-code max-h-[220px] ${tab === "tailwind" ? "whitespace-pre-wrap break-all" : ""}`}>{code}</pre>
          </div>
        </div>

        {/* ── Right: side panel ── */}
        <aside className="mk-stack-col">
          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Presets</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 [--sh-el:var(--mk-surface)] dark:[--sh-el:#26262b]">
              {PRESETS.map((p) => (
                <PresetTile key={p.name} preset={p} active={presetName === p.name} onPick={() => applyPreset(p)} />
              ))}
            </div>
          </section>

          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Layers</h2>
              <div className="flex gap-1">
                <button type="button" className="mk-icon-btn" onClick={addLayer} aria-label="Add layer" title="Add layer">
                  <Plus size={15} />
                </button>
                <button type="button" className="mk-icon-btn disabled:opacity-40" onClick={duplicateLayer} disabled={!selected} aria-label="Duplicate layer" title="Duplicate">
                  <CopyPlus size={15} />
                </button>
                <button type="button" className="mk-icon-btn disabled:opacity-40" onClick={() => moveLayer(-1)} disabled={selectedIndex <= 0} aria-label="Move layer up" title="Move up">
                  <ArrowUp size={15} />
                </button>
                <button type="button" className="mk-icon-btn disabled:opacity-40" onClick={() => moveLayer(1)} disabled={selectedIndex < 0 || selectedIndex >= layers.length - 1} aria-label="Move layer down" title="Move down">
                  <ArrowDown size={15} />
                </button>
                <button type="button" className="mk-icon-btn disabled:opacity-40" onClick={deleteLayer} disabled={!selected} aria-label="Delete layer" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {layers.length === 0 ? (
              <p className="m-0 rounded-[12px] bg-mk-surface-2 px-3 py-4 text-center text-[12.5px] text-mk-muted">
                No layers yet. Add one or pick a preset.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Shadow layers">
                <AnimatePresence initial={false}>
                  {layers.map((l, i) => {
                    const active = l.id === selectedId;
                    return (
                      <motion.li
                        key={l.id}
                        layout={reduce ? false : "position"}
                        initial={{ opacity: 0, y: reduce ? 0 : -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.2, ease: EASE }}
                        className={`flex items-center gap-1 rounded-[11px] border pr-1 transition-colors duration-150 ${
                          active ? "border-mk-border-strong bg-mk-surface-2" : "border-transparent hover:bg-mk-surface-2"
                        }`}
                      >
                        <button
                          type="button"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-mk-muted transition-colors duration-150 hover:text-mk-text"
                          onClick={() => editLayers((ls) => ls.map((x) => (x.id === l.id ? { ...x, visible: !x.visible } : x)))}
                          aria-label={l.visible ? `Hide layer ${i + 1}` : `Show layer ${i + 1}`}
                          aria-pressed={!l.visible}
                        >
                          {l.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <button
                          type="button"
                          className={`flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left ${l.visible ? "" : "opacity-50"}`}
                          onClick={() => setSelectedId(l.id)}
                          aria-current={active}
                        >
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-mk-border-strong"
                            style={{
                              background: l.inset ? "transparent" : l.color,
                              boxShadow: l.inset ? `inset 0 0 0 4px ${l.color}` : undefined,
                              opacity: 0.35 + l.opacity * 0.65,
                            }}
                          />
                          <span className="text-[13px] font-medium text-mk-text">Layer {i + 1}</span>
                          <span className="ml-auto truncate font-mono text-[11.5px] text-mk-muted">
                            {l.inset && "inset "}
                            {[l.x, l.y, l.blur, l.spread].map((v) => Math.round(v * 10) / 10).join(" ")}
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}

            {selected && (
              <div className="mt-4 flex flex-col gap-3.5 border-t border-mk-border pt-4">
                <div className="mk-field-row">
                  <span className="text-[13px] font-medium text-mk-text">Layer {selectedIndex + 1}</span>
                  <label className="flex cursor-pointer select-none items-center gap-2">
                    <input
                      type="checkbox"
                      className="mk-check"
                      checked={selected.inset}
                      onChange={(e) => updateSelected("inset", e.target.checked)}
                    />
                    Inset
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  <Range label="X" value={selected.x} min={-MAX_DIST} max={MAX_DIST} onChange={(v) => updateSelected("x", v)} />
                  <Range label="Y" value={selected.y} min={-MAX_DIST} max={MAX_DIST} onChange={(v) => updateSelected("y", v)} />
                  <Range label="Blur" value={selected.blur} min={0} max={120} onChange={(v) => updateSelected("blur", v)} />
                  <Range label="Spread" value={selected.spread} min={-40} max={40} onChange={(v) => updateSelected("spread", v)} />
                </div>
                <Range
                  label="Opacity"
                  value={selected.opacity}
                  min={0}
                  max={1}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => updateSelected("opacity", v)}
                />
                <ColorRow label="Colour" value={selected.color} swatches={SWATCHES} onChange={(v) => updateSelected("color", v)} />
              </div>
            )}
          </section>

          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title flex items-center gap-2">
                <Wand2 size={15} className="text-mk-muted" />
                Smooth shadow
              </h2>
            </div>
            <p className="-mt-2 mb-4 text-[12.5px] leading-relaxed text-mk-muted">
              Generates eased layers whose offsets double each step. Moving a slider replaces the layer list; direction follows the light source.
            </p>
            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <Range label="Layers" value={smooth.count} min={2} max={8} unit="" onChange={(v) => updateSmooth("count", v)} />
                <Range label="Distance" value={smooth.distance} min={2} max={MAX_DIST} onChange={(v) => updateSmooth("distance", v)} />
                <Range
                  label="Softness"
                  value={smooth.softness}
                  min={0.5}
                  max={3}
                  step={0.1}
                  format={(v) => `${v.toFixed(1)}×`}
                  onChange={(v) => updateSmooth("softness", v)}
                />
                <Range
                  label="Darkness"
                  value={smooth.darkness}
                  min={0.04}
                  max={0.8}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => updateSmooth("darkness", v)}
                />
              </div>
              <ColorRow label="Colour" value={smooth.color} swatches={SWATCHES.slice(0, 6)} onChange={(v) => updateSmooth("color", v)} />
            </div>
          </section>

          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Border &amp; radius</h2>
            </div>
            <div className="flex flex-col gap-3.5">
              <div className="mk-field gap-2">
                <span className="mk-field-row">Style</span>
                <div className="mk-chips">
                  {BORDER_STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="mk-chip capitalize"
                      data-active={border.style === s}
                      onClick={() => editBorder("style", s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className={border.style === "none" ? "opacity-40" : undefined} inert={border.style === "none"}>
                <div className="flex flex-col gap-3.5">
                  <Range label="Width" value={border.width} min={1} max={12} onChange={(v) => editBorder("width", v)} />
                  <ColorRow label="Colour" value={border.color} swatches={BORDER_SWATCHES} onChange={(v) => editBorder("color", v)} />
                </div>
              </div>
              <Range label="Radius" value={border.radius} min={0} max={64} onChange={(v) => editBorder("radius", v)} />
            </div>
          </section>
          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Preview colours</h2>
            </div>
            <div className="flex flex-col gap-3.5">
              <ColorRow label="Background" value={background} swatches={BG_SWATCHES} allowAuto onChange={setBackground} />
              <ColorRow label="Element" value={surface} swatches={SURFACE_SWATCHES} allowAuto onChange={setSurface} />
            </div>
          </section>
        </aside>
      </div>

      <MorePlaygrounds current="/shadow" />
    </main>
  );
}
