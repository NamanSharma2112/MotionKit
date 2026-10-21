"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Lightbulb, Plus, Type, X } from "lucide-react";
import PageHeader from "../compoents/ui/PageHeader";
import SegmentedTabs from "../compoents/ui/SegmentedTabs";
import MorePlaygrounds from "../compoents/ui/MorePlaygrounds";
import { ColorField, CopyButton, RangeField } from "../svg/controls";
import { bgToCss, bgToStyle, bgToTailwind, grainLayer, gradientPresets, gridPresets, type Bg, type Preset } from "./presets";

type Kind = "gradient" | "grid";
type Mode = "presets" | "custom";
type Output = "css" | "tailwind";
type GradType = "linear" | "radial" | "conic";
type GridPattern = "dot" | "line" | "cross";
type Stop = { id: number; color: string; position: number };

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const STOP_SWATCHES = ["#6366f1", "#a855f7", "#ec4899", "#f97316", "#facc15", "#10b981", "#06b6d4", "#ffffff"];
const LINE_SWATCHES = ["#6b7280", "#ffffff", "#0b0b0c", "#1f6bff", "#a855f7"];
const BG_SWATCHES = ["#0e0e10", "#ffffff", "#f6f6f7", "#0b1020", "#1e3a5f"];

const alphaHex = (pct: number) =>
  Math.round(pct * 2.55)
    .toString(16)
    .padStart(2, "0");

function buildGradient(type: GradType, angle: number, stops: Stop[]): Bg {
  const s = [...stops]
    .sort((a, b) => a.position - b.position)
    .map((st) => `${st.color} ${st.position}%`)
    .join(", ");
  const image =
    type === "radial" ? `radial-gradient(circle, ${s})` : type === "conic" ? `conic-gradient(from ${angle}deg, ${s})` : `linear-gradient(${angle}deg, ${s})`;
  return { layers: [{ image }] };
}

function buildGrid(pattern: GridPattern, cell: number, width: number, color: string, opacity: number, bgColor: string): Bg {
  const c = color + alphaHex(opacity);
  const size = `${cell}px ${cell}px`;
  const lines = `linear-gradient(to right, ${c} ${width}px, transparent ${width}px), linear-gradient(to bottom, ${c} ${width}px, transparent ${width}px)`;
  const image =
    pattern === "dot"
      ? `radial-gradient(circle, ${c} ${width}px, transparent ${width}px)`
      : pattern === "cross"
        ? `${lines}, radial-gradient(circle, ${c} ${width + 0.5}px, transparent ${width + 0.5}px)`
        : lines;
  return { color: bgColor, layers: [{ image, size }] };
}

function PresetGrid({ presets, activeId, onPick }: { presets: Preset[]; activeId: string; onPick: (p: Preset) => void }) {
  const groups = [...new Set(presets.map((p) => p.group))];
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g}>
          <p className="mk-section-label">{g}</p>
          <div className="grid grid-cols-3 gap-2">
            {presets
              .filter((p) => p.group === g)
              .map((p) => (
                <button key={p.id} type="button" className="mk-option" data-active={activeId === p.id} onClick={() => onPick(p)} aria-pressed={activeId === p.id}>
                  <span className="block h-14 w-full rounded-[9px] border border-mk-border" style={bgToStyle(p.bg, "var(--mk-surface-2)")} />
                  <span className="mk-option-title truncate">{p.name}</span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BackgroundPage() {
  const reduceMotion = useReducedMotion();
  const [kind, setKind] = useState<Kind>("gradient");
  const [mode, setMode] = useState<Mode>("presets");
  const [output, setOutput] = useState<Output>("css");
  const [gradientId, setGradientId] = useState(gradientPresets[0].id);
  const [gridId, setGridId] = useState(gridPresets[0].id);
  const [grain, setGrain] = useState(false);
  const [grainAmount, setGrainAmount] = useState(25);
  const [sample, setSample] = useState(false);

  // Custom gradient
  const [gradType, setGradType] = useState<GradType>("linear");
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<Stop[]>([
    { id: 1, color: "#6366f1", position: 0 },
    { id: 2, color: "#a855f7", position: 50 },
    { id: 3, color: "#ec4899", position: 100 },
  ]);
  const [activeStop, setActiveStop] = useState(1);

  // Custom grid
  const [pattern, setPattern] = useState<GridPattern>("dot");
  const [cell, setCell] = useState(24);
  const [lineWidth, setLineWidth] = useState(1);
  const [lineColor, setLineColor] = useState("#6b7280");
  const [lineOpacity, setLineOpacity] = useState(30);
  const [gridBg, setGridBg] = useState("#0e0e10");

  const base: Bg = useMemo(() => {
    if (mode === "presets") {
      const list = kind === "gradient" ? gradientPresets : gridPresets;
      const id = kind === "gradient" ? gradientId : gridId;
      return (list.find((p) => p.id === id) ?? list[0]).bg;
    }
    return kind === "gradient" ? buildGradient(gradType, angle, stops) : buildGrid(pattern, cell, lineWidth, lineColor, lineOpacity, gridBg);
  }, [mode, kind, gradientId, gridId, gradType, angle, stops, pattern, cell, lineWidth, lineColor, lineOpacity, gridBg]);

  const bg: Bg = useMemo(() => (grain ? { ...base, layers: [grainLayer(+(grainAmount / 100).toFixed(2)), ...base.layers] } : base), [base, grain, grainAmount]);
  const code = output === "css" ? bgToCss(bg, { noteTransparent: kind === "grid" }) : bgToTailwind(bg);
  const presetName = mode === "presets" ? (kind === "gradient" ? gradientPresets : gridPresets).find((p) => p.id === (kind === "gradient" ? gradientId : gridId))?.name : "Custom";
  // Presets crossfade; custom edits update in place so sliders stay immediate.
  const layerKey = mode === "presets" ? `${kind}-${kind === "gradient" ? gradientId : gridId}` : `custom-${kind}`;

  const stop = stops.find((s) => s.id === activeStop) ?? stops[0];
  const updateStop = (id: number, patch: Partial<Stop>) => setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const addStop = () => {
    const id = Math.max(...stops.map((s) => s.id)) + 1;
    setStops((prev) => [...prev, { id, color: "#ffffff", position: 100 }]);
    setActiveStop(id);
  };
  const removeStop = (id: number) => {
    const next = stops.filter((s) => s.id !== id);
    setStops(next);
    if (activeStop === id) setActiveStop(next[0].id);
  };

  const panelMotion = {
    initial: { opacity: 0, transform: reduceMotion ? "none" : "translateY(6px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { duration: 0.22, ease: EASE_OUT },
  };

  const codePanel = (
    <section className="mk-panel">
      <div className="mk-panel-head flex-wrap">
        <div className="flex items-center gap-3 [&_.mk-tabs-wrap]:mb-0!">
          <h2 className="mk-panel-title">Code</h2>
          <SegmentedTabs
            label="Output format"
            size="sm"
            value={output}
            onChange={setOutput}
            items={[
              { value: "css", label: "CSS" },
              { value: "tailwind", label: "Tailwind" },
            ]}
          />
        </div>
        <CopyButton text={code} label={output === "css" ? "Copy CSS" : "Copy Tailwind"} />
      </div>
      <pre className="mk-code max-h-[280px] whitespace-pre-wrap! [overflow-wrap:anywhere]">
        <code>{code}</code>
      </pre>
    </section>
  );

  return (
    <main className="mk-page">
      <PageHeader title="Background playground" description="Gradients, meshes and subtle grid patterns. Pick a preset or build your own, then copy CSS or Tailwind classes.">
        <SegmentedTabs
          label="Background type"
          value={kind}
          onChange={setKind}
          items={[
            { value: "gradient", label: "Gradients" },
            { value: "grid", label: "Grids" },
          ]}
        />
        <SegmentedTabs
          label="Editor"
          value={mode}
          onChange={setMode}
          items={[
            { value: "presets", label: "Presets" },
            { value: "custom", label: "Custom" },
          ]}
        />
      </PageHeader>

      <div className="mk-workspace">
        {/* ── Preview + output ── */}
        <div className="mk-stack-col">
          <div className="relative aspect-video w-full overflow-hidden rounded-[20px] border border-mk-border bg-mk-surface shadow-mk-sm">
            <AnimatePresence initial={false}>
              <motion.div
                key={layerKey}
                className="absolute inset-0"
                style={bgToStyle(bg, "var(--mk-surface)") as CSSProperties}
                initial={{ opacity: 0, zIndex: 1 }}
                animate={{ opacity: 1, zIndex: 1 }}
                exit={{ opacity: 1, zIndex: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.25, ease: EASE_OUT }}
              />
            </AnimatePresence>

            {sample && (
              <div className="absolute inset-0 z-[2] grid place-items-center p-6">
                <div className="max-w-[340px] rounded-2xl border border-white/40 bg-white/70 px-6 py-5 text-center text-[#0b0b0c] shadow-mk-md backdrop-blur-md">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6b6b70]">Sample content</p>
                  <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">Ship something lovely</p>
                  <p className="mt-1 text-[13px] text-[#6b6b70]">Check how text and cards sit on top of the background.</p>
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute left-3 top-3 z-[3]">
              <span className="mk-badge">{presetName}</span>
            </div>
            <div className="absolute right-3 top-3 z-[3]">
              <button
                type="button"
                className="mk-icon-btn"
                onClick={() => setSample((v) => !v)}
                aria-pressed={sample}
                aria-label={sample ? "Hide sample content" : "Show sample content"}
                title={sample ? "Hide sample content" : "Show sample content"}
                data-active={sample}
                style={sample ? { color: "var(--mk-accent)" } : undefined}
              >
                <Type size={14} />
              </button>
            </div>
          </div>

          <div className="hidden min-[1025px]:block">{codePanel}</div>
        </div>

        {/* ── Side panel ── */}
        <div className="mk-stack-col">
          {mode === "presets" ? (
            <motion.section key={`presets-${kind}`} {...panelMotion} className="mk-panel">
              <div className="mk-panel-head">
                <h2 className="mk-panel-title">{kind === "gradient" ? "Gradient presets" : "Grid presets"}</h2>
                <span className="mk-badge">{(kind === "gradient" ? gradientPresets : gridPresets).length}</span>
              </div>
              {kind === "gradient" ? (
                <PresetGrid presets={gradientPresets} activeId={gradientId} onPick={(p) => setGradientId(p.id)} />
              ) : (
                <PresetGrid presets={gridPresets} activeId={gridId} onPick={(p) => setGridId(p.id)} />
              )}
            </motion.section>
          ) : kind === "gradient" ? (
            <motion.section key="custom-gradient" {...panelMotion} className="mk-panel flex flex-col gap-5">
              <h2 className="mk-panel-title">Custom gradient</h2>
              <div className="mk-field">
                <p className="mk-section-label mb-0!">Type</p>
                <div className="mk-chips">
                  {(["linear", "radial", "conic"] as const).map((t) => (
                    <button key={t} type="button" className="mk-chip flex-1 capitalize" data-active={gradType === t} onClick={() => setGradType(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {gradType !== "radial" && <RangeField label="Angle" value={angle} onChange={setAngle} min={0} max={360} unit="°" />}

              <div className="mk-field">
                <div className="mk-field-row">
                  <span>Colour stops</span>
                  {stops.length < 6 && (
                    <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm h-7! px-2.5!" onClick={addStop}>
                      <Plus size={13} /> Add
                    </button>
                  )}
                </div>
                {/* Stop bar: click a handle to edit that stop */}
                <div className="relative mb-2 mt-1 h-8 rounded-[9px] border border-mk-border" style={{ background: buildGradient("linear", 90, stops).layers[0].image }}>
                  {stops.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-mk-md"
                      style={{ left: `calc(10px + (100% - 20px) * ${s.position / 100})`, background: s.color, outline: s.id === stop.id ? "2px solid var(--mk-text)" : "none", outlineOffset: 1 }}
                      onClick={() => setActiveStop(s.id)}
                      aria-label={`Edit stop at ${s.position}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-4 rounded-[14px] border border-mk-border bg-mk-surface-2 p-3">
                  <ColorField
                    label={
                      <span className="flex items-center gap-2">
                        Stop {stops.findIndex((s) => s.id === stop.id) + 1}
                        {stops.length > 2 && (
                          <button type="button" className="text-mk-faint transition-colors hover:text-mk-text" onClick={() => removeStop(stop.id)} aria-label="Remove stop" title="Remove stop">
                            <X size={13} />
                          </button>
                        )}
                      </span>
                    }
                    value={stop.color}
                    onChange={(c) => updateStop(stop.id, { color: c })}
                    swatches={STOP_SWATCHES}
                  />
                  <RangeField label="Position" value={stop.position} onChange={(v) => updateStop(stop.id, { position: v })} min={0} max={100} unit="%" />
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section key="custom-grid" {...panelMotion} className="mk-panel flex flex-col gap-5">
              <h2 className="mk-panel-title">Custom grid</h2>
              <div className="mk-field">
                <p className="mk-section-label mb-0!">Pattern</p>
                <div className="mk-chips">
                  {(["dot", "line", "cross"] as const).map((t) => (
                    <button key={t} type="button" className="mk-chip flex-1 capitalize" data-active={pattern === t} onClick={() => setPattern(t)}>
                      {t === "dot" ? "Dots" : t === "line" ? "Lines" : "Cross"}
                    </button>
                  ))}
                </div>
              </div>
              <RangeField label="Cell size" value={cell} onChange={setCell} min={8} max={64} unit="px" />
              <RangeField label="Line width" value={lineWidth} onChange={setLineWidth} min={1} max={4} unit="px" />
              <RangeField label="Line opacity" value={lineOpacity} onChange={setLineOpacity} min={5} max={100} unit="%" />
              <ColorField label="Line colour" value={lineColor} onChange={setLineColor} swatches={LINE_SWATCHES} />
              <ColorField label="Background" value={gridBg} onChange={setGridBg} swatches={BG_SWATCHES} />
            </motion.section>
          )}

          <section className="mk-panel flex flex-col gap-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="mk-panel-title block">Grain overlay</span>
                <span className="text-[12.5px] text-mk-muted">Film noise on top, as an SVG data URI.</span>
              </span>
              <input type="checkbox" className="mk-check" checked={grain} onChange={(e) => setGrain(e.target.checked)} />
            </label>
            {grain && <RangeField label="Amount" value={grainAmount} onChange={setGrainAmount} min={5} max={60} unit="%" />}
          </section>

          <div className="mk-tip">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-mk-accent" />
            <p className="m-0">
              {mode === "presets" && kind === "grid" ? (
                <>
                  <strong>Theme-friendly.</strong> Most grid presets use a translucent grey and no background colour, so they sit nicely on both light and dark
                  pages.
                </>
              ) : mode === "presets" ? (
                <>
                  <strong>Mesh gradients</strong> are just stacked radial gradients over a base colour. Copy the CSS or the Tailwind classes; no images needed.
                </>
              ) : (
                <>
                  <strong>Live editing.</strong> Every change updates the preview and the code. Toggle the <strong>T</strong> button on the preview to check
                  contrast with real content.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 min-[1025px]:hidden">{codePanel}</div>

      <MorePlaygrounds current="/background" />
    </main>
  );
}
