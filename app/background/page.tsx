"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ─── */
type PresetType = 'gradient' | 'grid';
type EditorMode = 'presets' | 'custom';

interface ColorStop {
  color: string;
  position: number;
}

/* ─── Preset Data ─── */
const gradients = [
  { name: 'Sunset',     css: 'linear-gradient(135deg, #f97316, #ec4899)' },
  { name: 'Ocean',      css: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
  { name: 'Midnight',   css: 'linear-gradient(135deg, #1e1b4b, #7c3aed, #1e1b4b)' },
  { name: 'Cyberpunk',  css: 'linear-gradient(135deg, #c026d3, #7c3aed)' },
  { name: 'Candy',      css: 'linear-gradient(135deg, #f9a8d4, #c084fc, #818cf8)' },
  { name: 'Aurora',     css: 'linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)' },
  { name: 'Lava',       css: 'linear-gradient(135deg, #dc2626, #f97316, #facc15)' },
  { name: 'Frost',      css: 'linear-gradient(135deg, #e0f2fe, #bae6fd, #7dd3fc)' },
  { name: 'Neon',       css: 'linear-gradient(135deg, #22d3ee, #a855f7, #ec4899)' },
  { name: 'Forest',     css: 'linear-gradient(135deg, #065f46, #059669, #34d399)' },
  { name: 'Peach',      css: 'linear-gradient(135deg, #fdba74, #fb923c, #f472b6)' },
  { name: 'Night Sky',  css: 'linear-gradient(135deg, #0f172a, #1e3a5f, #7c3aed, #0f172a)' },
];

const grids = [
  { name: 'Dot SM',       css: 'radial-gradient(circle, #6b728080 1px, transparent 1px)', size: '16px 16px', bg: '' },
  { name: 'Dot LG',       css: 'radial-gradient(circle, #6b728080 1.5px, transparent 1.5px)', size: '28px 28px', bg: '' },
  { name: 'Square',       css: 'linear-gradient(to right, #80808018 1px, transparent 1px), linear-gradient(to bottom, #80808018 1px, transparent 1px)', size: '24px 24px', bg: '' },
  { name: 'Blueprint',    css: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', size: '20px 20px', bg: '#1e3a5f' },
  { name: 'Dense',        css: 'linear-gradient(to right, #80808012 1px, transparent 1px), linear-gradient(to bottom, #80808012 1px, transparent 1px)', size: '12px 12px', bg: '' },
  { name: 'Cross',        css: 'radial-gradient(circle, transparent 3px, #80808010 3px, #80808010 3.5px, transparent 3.5px), linear-gradient(to right, #80808018 1px, transparent 1px), linear-gradient(to bottom, #80808018 1px, transparent 1px)', size: '32px 32px', bg: '' },
  { name: 'Diamond',      css: 'linear-gradient(45deg, #80808015 25%, transparent 25%), linear-gradient(-45deg, #80808015 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808015 75%), linear-gradient(-45deg, transparent 75%, #80808015 75%)', size: '30px 30px', bg: '' },
  { name: 'Isometric',    css: 'linear-gradient(30deg, #80808015 12%, transparent 12.5%, transparent 87%, #80808015 87.5%, #80808015), linear-gradient(150deg, #80808015 12%, transparent 12.5%, transparent 87%, #80808015 87.5%, #80808015), linear-gradient(30deg, #80808015 12%, transparent 12.5%, transparent 87%, #80808015 87.5%, #80808015), linear-gradient(150deg, #80808015 12%, transparent 12.5%, transparent 87%, #80808015 87.5%, #80808015)', size: '40px 70px', bg: '' },
  { name: 'Striped',      css: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #80808012 10px, #80808012 11px)', size: '', bg: '' },
  { name: 'Graph Paper',  css: 'linear-gradient(to right, #80808030 1px, transparent 1px), linear-gradient(to bottom, #80808030 1px, transparent 1px), linear-gradient(to right, #80808010 1px, transparent 1px), linear-gradient(to bottom, #80808010 1px, transparent 1px)', size: '60px 60px, 60px 60px, 12px 12px, 12px 12px', bg: '' },
];

/* ─── Small Reusable Components ─── */
function Slider({ label, value, onChange, min, max, unit = '' }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; unit?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
        <span className="font-mono text-neutral-700 dark:text-neutral-300">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(+e.target.value)}
        className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-neutral-400" />
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      <span className="shrink-0">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-neutral-600 cursor-pointer bg-transparent p-0" />
      <span className="font-mono text-neutral-700 dark:text-neutral-300 text-[11px]">{value}</span>
    </label>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-lg'
          : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }`}>
      {children}
    </button>
  );
}

/* ─── Gradient Custom Editor ─── */
function GradientEditor({ onCssChange }: { onCssChange: (css: string) => void }) {
  const [angle, setAngle] = useState(135);
  const [gradType, setGradType] = useState<'linear' | 'radial' | 'conic'>('linear');
  const [stops, setStops] = useState<ColorStop[]>([
    { color: '#6366f1', position: 0 },
    { color: '#a855f7', position: 50 },
    { color: '#ec4899', position: 100 },
  ]);

  const buildCss = useCallback(() => {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    const stopsStr = sorted.map(s => `${s.color} ${s.position}%`).join(', ');
    if (gradType === 'radial') return `radial-gradient(circle, ${stopsStr})`;
    if (gradType === 'conic') return `conic-gradient(from ${angle}deg, ${stopsStr})`;
    return `linear-gradient(${angle}deg, ${stopsStr})`;
  }, [angle, gradType, stops]);

  useEffect(() => { onCssChange(buildCss()); }, [buildCss, onCssChange]);

  const updateStop = (i: number, key: keyof ColorStop, val: string | number) => {
    setStops(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Gradient Type */}
      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Type</p>
        <div className="flex gap-2">
          {(['linear', 'radial', 'conic'] as const).map(t => (
            <button key={t} onClick={() => setGradType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                gradType === t
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Angle (only for linear/conic) */}
      {gradType !== 'radial' && (
        <Slider label="Angle" value={angle} onChange={setAngle} min={0} max={360} unit="°" />
      )}

      {/* Color Stops */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Color Stops</p>
          {stops.length < 6 && (
            <button onClick={() => setStops(prev => [...prev, { color: '#ffffff', position: 100 }])}
              className="text-xs text-indigo-500 hover:text-indigo-400 font-medium">+ Add</button>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {stops.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <input type="color" value={s.color} onChange={e => updateStop(i, 'color', e.target.value)}
                className="w-8 h-8 rounded-lg border border-neutral-300 dark:border-neutral-600 cursor-pointer bg-transparent p-0 shrink-0" />
              <input type="range" min={0} max={100} value={s.position} onChange={e => updateStop(i, 'position', +e.target.value)}
                className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow
                  [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-neutral-300" />
              <span className="text-[11px] font-mono w-8 text-right text-neutral-500">{s.position}%</span>
              {stops.length > 2 && (
                <button onClick={() => setStops(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-neutral-400 hover:text-red-400 text-lg leading-none">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live gradient bar preview */}
      <div className="h-6 rounded-xl" style={{ background: buildCss() }} />
    </div>
  );
}

/* ─── Grid Custom Editor ─── */
function GridEditor({ onStyleChange }: { onStyleChange: (bg: string, css: string, size: string) => void }) {
  const [gridType, setGridType] = useState<'dot' | 'line' | 'cross'>('dot');
  const [cellSize, setCellSize] = useState(24);
  const [lineColor, setLineColor] = useState('#6b7280');
  const [lineOpacity, setLineOpacity] = useState(30);
  const [lineWidth, setLineWidth] = useState(1);
  const [bgColor, setBgColor] = useState('#0a0a0a');

  const buildGrid = useCallback(() => {
    const c = lineColor;
    const a = (lineOpacity / 100).toFixed(2);
    const hex = c + Math.round(lineOpacity * 2.55).toString(16).padStart(2, '0');

    if (gridType === 'dot') {
      return {
        css: `radial-gradient(circle, ${hex} ${lineWidth}px, transparent ${lineWidth}px)`,
        size: `${cellSize}px ${cellSize}px`,
      };
    }
    if (gridType === 'cross') {
      return {
        css: `linear-gradient(to right, ${hex} ${lineWidth}px, transparent ${lineWidth}px), linear-gradient(to bottom, ${hex} ${lineWidth}px, transparent ${lineWidth}px), radial-gradient(circle, ${hex} ${lineWidth + 0.5}px, transparent ${lineWidth + 0.5}px)`,
        size: `${cellSize}px ${cellSize}px, ${cellSize}px ${cellSize}px, ${cellSize}px ${cellSize}px`,
      };
    }
    // line
    return {
      css: `linear-gradient(to right, ${hex} ${lineWidth}px, transparent ${lineWidth}px), linear-gradient(to bottom, ${hex} ${lineWidth}px, transparent ${lineWidth}px)`,
      size: `${cellSize}px ${cellSize}px`,
    };
  }, [gridType, cellSize, lineColor, lineOpacity, lineWidth]);

  useEffect(() => {
    const g = buildGrid();
    onStyleChange(bgColor, g.css, g.size);
  }, [buildGrid, bgColor, onStyleChange]);

  return (
    <div className="flex flex-col gap-5">
      {/* Grid Type */}
      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Pattern</p>
        <div className="flex gap-2">
          {(['dot', 'line', 'cross'] as const).map(t => (
            <button key={t} onClick={() => setGridType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                gridType === t
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}>{t}</button>
          ))}
        </div>
      </div>

      <Slider label="Cell Size" value={cellSize} onChange={setCellSize} min={8} max={64} unit="px" />
      <Slider label="Line Width" value={lineWidth} onChange={setLineWidth} min={1} max={4} unit="px" />
      <Slider label="Opacity" value={lineOpacity} onChange={setLineOpacity} min={5} max={100} unit="%" />

      <ColorInput label="Line Color" value={lineColor} onChange={setLineColor} />
      <ColorInput label="Background" value={bgColor} onChange={setBgColor} />
    </div>
  );
}

/* ─── Copy Button ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-all">
      {copied ? '✓ Copied' : 'Copy CSS'}
    </button>
  );
}

/* ─── Main Page ─── */
export default function BackgroundPage() {
  const [activeType, setActiveType] = useState<PresetType>('gradient');
  const [editorMode, setEditorMode] = useState<EditorMode>('presets');

  // For presets
  const [previewStyle, setPreviewStyle] = useState<React.CSSProperties>({
    background: gradients[0].css,
  });
  const [cssOutput, setCssOutput] = useState(gradients[0].css);

  // For custom gradient
  const [customGradCss, setCustomGradCss] = useState('');
  // For custom grid
  const [customGridBg, setCustomGridBg] = useState('#0a0a0a');
  const [customGridCss, setCustomGridCss] = useState('');
  const [customGridSize, setCustomGridSize] = useState('');

  const selectGradientPreset = (css: string) => {
    setPreviewStyle({ background: css });
    setCssOutput(css);
  };

  const selectGridPreset = (g: typeof grids[0]) => {
    const style: React.CSSProperties = {
      backgroundImage: g.css,
      ...(g.size ? { backgroundSize: g.size } : {}),
      ...(g.bg ? { backgroundColor: g.bg } : { backgroundColor: '#1a1a2e' }),
    };
    setPreviewStyle(style);
    let out = `background-image: ${g.css};`;
    if (g.size) out += `\nbackground-size: ${g.size};`;
    if (g.bg) out += `\nbackground-color: ${g.bg};`;
    setCssOutput(out);
  };

  const handleCustomGrad = useCallback((css: string) => {
    setCustomGradCss(css);
    if (editorMode === 'custom' && activeType === 'gradient') {
      setPreviewStyle({ background: css });
      setCssOutput(`background: ${css};`);
    }
  }, [editorMode, activeType]);

  const handleCustomGrid = useCallback((bg: string, css: string, size: string) => {
    setCustomGridBg(bg);
    setCustomGridCss(css);
    setCustomGridSize(size);
    if (editorMode === 'custom' && activeType === 'grid') {
      setPreviewStyle({
        backgroundColor: bg,
        backgroundImage: css,
        backgroundSize: size,
      });
      setCssOutput(`background-color: ${bg};\nbackground-image: ${css};\nbackground-size: ${size};`);
    }
  }, [editorMode, activeType]);

  // Sync preview when switching modes/types
  useEffect(() => {
    if (editorMode === 'custom') {
      if (activeType === 'gradient' && customGradCss) {
        setPreviewStyle({ background: customGradCss });
        setCssOutput(`background: ${customGradCss};`);
      } else if (activeType === 'grid' && customGridCss) {
        setPreviewStyle({ backgroundColor: customGridBg, backgroundImage: customGridCss, backgroundSize: customGridSize });
        setCssOutput(`background-color: ${customGridBg};\nbackground-image: ${customGridCss};\nbackground-size: ${customGridSize};`);
      }
    }
  }, [editorMode, activeType]);

  return (
    <div className="min-h-screen p-6 sm:p-12 lg:p-20 flex flex-col items-center transition-colors">
      {/* Header */}
      <header className="max-w-4xl w-full text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-bold mb-4 dark:text-white">
          Background Playground
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          className="text-neutral-500 dark:text-neutral-400 text-lg">
          Craft the perfect backdrop — pick a preset or build your own.
        </motion.p>
      </header>

      {/* Top Tabs: Gradient / Grid + Presets / Custom */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        <div className="flex gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900">
          <TabButton active={activeType === 'gradient'} onClick={() => setActiveType('gradient')}>Gradients</TabButton>
          <TabButton active={activeType === 'grid'} onClick={() => setActiveType('grid')}>Grids</TabButton>
        </div>
        <div className="flex gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900">
          <TabButton active={editorMode === 'presets'} onClick={() => setEditorMode('presets')}>Presets</TabButton>
          <TabButton active={editorMode === 'custom'} onClick={() => setEditorMode('custom')}>Custom Canvas</TabButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 max-w-6xl w-full">
        {/* Preview */}
        <div className="flex flex-col gap-6">
          <motion.div
            layout
            className="w-full aspect-video rounded-3xl shadow-2xl border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden"
            style={previewStyle}
            transition={{ layout: { duration: 0.4 } }}
          />

          {/* CSS Output */}
          <div className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm dark:text-white">CSS Output</h3>
              <CopyButton text={`.custom-bg {\n  ${cssOutput.replace(/\n/g, '\n  ')};\n}`} />
            </div>
            <pre className="bg-neutral-100 dark:bg-neutral-950 p-4 rounded-xl text-xs font-mono text-neutral-600 dark:text-neutral-300 overflow-x-auto whitespace-pre-wrap">
              <code>{`.custom-bg {\n  ${cssOutput};\n}`}</code>
            </pre>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {editorMode === 'presets' ? (
              <motion.div key="presets" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6">
                {activeType === 'gradient' ? (
                  <section>
                    <h3 className="font-bold mb-4 dark:text-white text-sm">Gradient Presets</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {gradients.map(g => (
                        <button key={g.name} onClick={() => selectGradientPreset(g.css)}
                          className={`group p-2.5 rounded-xl border-2 transition-all text-left ${
                            cssOutput === g.css
                              ? 'border-neutral-900 dark:border-white shadow-lg scale-[1.02]'
                              : 'border-transparent bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:scale-[1.02]'
                          }`}>
                          <div className="w-full h-10 rounded-lg mb-1.5 transition-transform group-hover:scale-[1.03]"
                            style={{ background: g.css }} />
                          <span className="text-[11px] font-medium dark:text-white">{g.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : (
                  <section>
                    <h3 className="font-bold mb-4 dark:text-white text-sm">Grid Presets</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {grids.map(g => (
                        <button key={g.name} onClick={() => selectGridPreset(g)}
                          className={`group p-2.5 rounded-xl border-2 transition-all text-left ${
                            cssOutput.includes(g.css.slice(0, 30))
                              ? 'border-neutral-900 dark:border-white shadow-lg scale-[1.02]'
                              : 'border-transparent bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:scale-[1.02]'
                          }`}>
                          <div className="w-full h-10 rounded-lg mb-1.5 border border-neutral-200 dark:border-neutral-700"
                            style={{
                              backgroundImage: g.css,
                              ...(g.size ? { backgroundSize: g.size } : {}),
                              backgroundColor: g.bg || '#1a1a2e',
                            }} />
                          <span className="text-[11px] font-medium dark:text-white">{g.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            ) : (
              <motion.div key="custom" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <h3 className="font-bold mb-5 dark:text-white text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Custom {activeType === 'gradient' ? 'Gradient' : 'Grid'} Canvas
                </h3>
                {activeType === 'gradient' ? (
                  <GradientEditor onCssChange={handleCustomGrad} />
                ) : (
                  <GridEditor onStyleChange={handleCustomGrid} />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Tip */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 dark:border-indigo-500/10">
            <h4 className="text-sm font-bold mb-1 dark:text-white">💡 Tip</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {editorMode === 'presets'
                ? 'Click any preset to preview it. Copy the generated CSS and drop it into your project.'
                : 'Adjust the controls to create your perfect background. Changes update the preview in real-time.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
