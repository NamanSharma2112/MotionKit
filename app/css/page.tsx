"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { Check, Code2, Copy, Pause, Play, RotateCcw, SquareDashed } from "lucide-react";
import PageHeader from "../compoents/ui/PageHeader";
import MorePlaygrounds from "../compoents/ui/MorePlaygrounds";
import { ColorRow, Range } from "./controls";
import {
  DEFAULTS,
  EASINGS,
  GROUP_KEYS,
  PRESETS,
  SWATCHES,
  backgroundOf,
  buildCss,
  filterOf,
  transformOf,
  type Group,
  type Preset,
  type Props,
} from "./css-lib";

const HOLD = 900; // pause at each end of the transition loop, ms

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

const styleOf = (p: Props, k = 1): CSSProperties => ({
  width: p.width * k,
  height: p.height * k,
  borderRadius: p.radius * k,
  background: backgroundOf(p),
  transform: transformOf({ ...p, tx: p.tx * k, ty: p.ty * k }),
  filter: filterOf({ ...p, blur: p.blur * k }),
  opacity: p.opacity,
});

function Section({ title, onReset, children }: { title: string; onReset?: () => void; children: ReactNode }) {
  return (
    <section className="mk-panel">
      <div className="mk-panel-head">
        <h2 className="mk-panel-title">{title}</h2>
        {onReset && (
          <button type="button" className="mk-icon-btn" onClick={onReset} aria-label={`Reset ${title.toLowerCase()}`} title="Reset">
            <RotateCcw size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function PresetTile({ preset, active, onPick }: { preset: Preset; active: boolean; onPick: () => void }) {
  const p = { ...DEFAULTS, ...preset.props };
  return (
    <button type="button" className="mk-option" data-active={active} onClick={onPick}>
      <span className="grid h-[64px] place-items-center overflow-hidden rounded-[10px] bg-mk-surface-2">
        <span className="block" style={styleOf(p, 0.24)} />
      </span>
      <span className="mk-option-title">{preset.name}</span>
      <span className="mk-option-desc">{preset.desc}</span>
    </button>
  );
}

export default function CSSPlaygroundPage() {
  const reduce = useReducedMotion();
  const [props, setProps] = useState<Props>(DEFAULTS);
  const [presetName, setPresetName] = useState<string | null>("Default");
  const [animate, setAnimate] = useState(false);
  const [phase, setPhase] = useState<"from" | "to">("to");
  const [duration, setDuration] = useState(500);
  const [easing, setEasing] = useState<string>(EASINGS[0].value);
  const [outline, setOutline] = useState(true);
  const [soft, setSoft] = useState(false);
  const softTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [copied, copy] = useCopy();

  const looping = animate && !reduce;
  const shownPhase = looping ? phase : "to";

  // Alternate between the defaults and the current values while the loop is on.
  useEffect(() => {
    if (!looping) return;
    const id = setInterval(() => setPhase((p) => (p === "to" ? "from" : "to")), duration + HOLD);
    return () => clearInterval(id);
  }, [looping, duration]);

  useEffect(() => () => clearTimeout(softTimer.current), []);

  const set = <K extends keyof Props>(key: K, v: Props[K]) => {
    setProps((p) => ({ ...p, [key]: v }));
    setPresetName(null);
  };

  /** Ease discrete jumps (presets, resets); slider drags stay 1:1. */
  const softly = () => {
    if (reduce) return;
    setSoft(true);
    clearTimeout(softTimer.current);
    softTimer.current = setTimeout(() => setSoft(false), 320);
  };

  const applyPreset = (preset: Preset) => {
    softly();
    setProps({ ...DEFAULTS, ...preset.props });
    setPresetName(preset.name);
  };

  const resetGroup = (g: Group) => {
    softly();
    setProps((p) => {
      const next = { ...p } as Record<keyof Props, unknown>;
      for (const k of GROUP_KEYS[g]) next[k] = DEFAULTS[k];
      return next as Props;
    });
    setPresetName(null);
  };

  const toggleAnimate = () => {
    if (!animate) setPhase("from");
    setAnimate(!animate);
  };

  const shown: Props = shownPhase === "from" ? { ...DEFAULTS, angle: props.angle, c1: props.c1, c2: props.c2 } : props;
  const transitionProps = "transform, filter, opacity, border-radius, width, height";
  const elementStyle: CSSProperties = {
    ...styleOf(shown),
    transitionProperty: looping || soft ? transitionProps : "none",
    transitionDuration: looping ? `${duration}ms` : "280ms",
    transitionTimingFunction: looping ? easing : "var(--ease-out)",
  };

  const css = useMemo(() => buildCss(props, { on: animate, duration, easing }), [props, animate, duration, easing]);
  const pct = (v: number) => `${Math.round(v)}%`;

  return (
    <main className="mk-page">
      <PageHeader
        icon={<Code2 size={13} />}
        title="CSS playground"
        description="Shape, transform, filter and fill one element, watch it transition, then copy the CSS."
      />

      <div className="mk-workspace">
        {/* ── Left: preview + code ── */}
        <div className="mk-stack-col lg:sticky lg:top-20">
          <div className="mk-toolbar" role="toolbar" aria-label="Preview">
            <button
              type="button"
              className="mk-tool"
              data-active={animate}
              aria-pressed={animate}
              onClick={toggleAnimate}
            >
              {animate ? <Pause size={15} /> : <Play size={15} />}
              Animate transition
            </button>
            <span className="mk-toolbar-sep" />
            <button
              type="button"
              className="mk-tool"
              data-active={outline}
              aria-pressed={outline}
              onClick={() => setOutline((v) => !v)}
              title="Show the untransformed default box"
            >
              <SquareDashed size={15} />
              <span className="max-sm:hidden">Origin</span>
            </button>
            <button
              type="button"
              className="mk-tool ml-auto"
              onClick={() => applyPreset(PRESETS[0])}
              aria-label="Reset all"
              title="Reset all"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {animate && reduce && (
            <p className="mk-tip m-0">
              Reduced motion is on, so the loop is paused. The transition is still included in the CSS below.
            </p>
          )}

          <div className="mk-canvas grid h-[clamp(320px,calc(100vh-470px),460px)] place-items-center max-sm:h-[360px]">
            <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5">
              <span className="mk-badge">
                {Math.round(props.width)}×{Math.round(props.height)}
              </span>
              {looping && (
                <span className="mk-badge">
                  <span
                    className="h-1.5 w-1.5 rounded-full transition-colors duration-200"
                    style={{ background: shownPhase === "to" ? "var(--mk-accent)" : "var(--mk-faint)" }}
                  />
                  {shownPhase === "to" ? "Your values" : "Default"}
                </span>
              )}
            </div>

            {outline && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-[1.5px] border-dashed border-mk-border-strong"
                style={{ width: DEFAULTS.width, height: DEFAULTS.height, borderRadius: DEFAULTS.radius }}
              />
            )}

            <div
              className="relative grid place-items-center text-[13px] font-semibold tracking-tight text-white/90"
              style={elementStyle}
            >
              .element
            </div>
          </div>

          <div className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Generated CSS</h2>
              <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => copy(css)}>
                <span className="mk-swap" data-state={copied ? "b" : "a"}>
                  <Copy size={14} className="mk-swap-a" />
                  <Check size={14} className="mk-swap-b" />
                </span>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mk-code max-h-[260px]">{css}</pre>
          </div>
        </div>

        {/* ── Right: controls ── */}
        <aside className="mk-stack-col">
          <section className="mk-panel">
            <div className="mk-panel-head">
              <h2 className="mk-panel-title">Presets</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <PresetTile key={p.name} preset={p} active={presetName === p.name} onPick={() => applyPreset(p)} />
              ))}
            </div>
          </section>

          <Section title="Shape" onReset={() => resetGroup("shape")}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <Range label="Width" value={props.width} min={60} max={280} onChange={(v) => set("width", v)} />
              <Range label="Height" value={props.height} min={60} max={280} onChange={(v) => set("height", v)} />
            </div>
            <Range label="Radius" value={props.radius} min={0} max={140} onChange={(v) => set("radius", v)} />
          </Section>

          <Section title="Transform" onReset={() => resetGroup("transform")}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <Range label="Rotate" value={props.rotate} min={-180} max={180} unit="°" onChange={(v) => set("rotate", v)} />
              <Range
                label="Scale"
                value={props.scale}
                min={0.5}
                max={1.5}
                step={0.01}
                format={(v) => `${v.toFixed(2)}×`}
                onChange={(v) => set("scale", v)}
              />
              <Range label="Skew X" value={props.skewX} min={-40} max={40} unit="°" onChange={(v) => set("skewX", v)} />
              <Range label="Skew Y" value={props.skewY} min={-40} max={40} unit="°" onChange={(v) => set("skewY", v)} />
              <Range label="Move X" value={props.tx} min={-100} max={100} onChange={(v) => set("tx", v)} />
              <Range label="Move Y" value={props.ty} min={-100} max={100} onChange={(v) => set("ty", v)} />
            </div>
          </Section>

          <Section title="Effects" onReset={() => resetGroup("effects")}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <Range label="Blur" value={props.blur} min={0} max={20} step={0.5} onChange={(v) => set("blur", v)} />
              <Range
                label="Opacity"
                value={props.opacity}
                min={0}
                max={1}
                step={0.01}
                format={(v) => pct(v * 100)}
                onChange={(v) => set("opacity", v)}
              />
              <Range label="Brightness" value={props.brightness} min={40} max={160} format={pct} onChange={(v) => set("brightness", v)} />
              <Range label="Saturate" value={props.saturate} min={0} max={250} format={pct} onChange={(v) => set("saturate", v)} />
            </div>
          </Section>

          <Section title="Fill" onReset={() => resetGroup("fill")}>
            <Range label="Gradient angle" value={props.angle} min={0} max={360} unit="°" onChange={(v) => set("angle", v)} />
            <ColorRow label="From" value={props.c1} swatches={SWATCHES} onChange={(v) => set("c1", v)} />
            <ColorRow label="To" value={props.c2} swatches={SWATCHES} onChange={(v) => set("c2", v)} />
          </Section>

          <Section title="Transition">
            <label className="mk-field-row cursor-pointer select-none">
              <span>Animate between default and current</span>
              <input type="checkbox" className="mk-check" checked={animate} onChange={toggleAnimate} />
            </label>
            <Range label="Duration" value={duration} min={150} max={1200} step={50} unit="ms" onChange={setDuration} />
            <div className="mk-field gap-2">
              <span className="mk-field-row">Easing</span>
              <div className="mk-chips">
                {EASINGS.map((e) => (
                  <button
                    key={e.name}
                    type="button"
                    className="mk-chip"
                    data-active={easing === e.value}
                    onClick={() => setEasing(e.value)}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          </Section>
        </aside>
      </div>

      <MorePlaygrounds current="/css" />
    </main>
  );
}
