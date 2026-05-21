"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
      <span className="font-mono text-neutral-700 dark:text-neutral-300 text-[11px] uppercase">{value}</span>
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

function CopyButton({ text, label = "Copy Code" }: { text: string, label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer">
      {copied ? '✓ Copied' : label}
    </button>
  );
}

/* ─── Main Page ─── */
export default function SvgMakerPage() {
  const [editorMode, setEditorMode] = useState<'canvas' | 'image'>('canvas');
  const [codeMode, setCodeMode] = useState<'jsx' | 'raw'>('jsx');
  const [outputCode, setOutputCode] = useState('');
  const [rawSvgCode, setRawSvgCode] = useState('');

  // Canvas State
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [paths, setPaths] = useState<{ d: string; color: string; width: number; dash: string }[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeDash, setStrokeDash] = useState<'none' | '10 10' | '2 8'>('none');
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Image State
  const [imgData, setImgData] = useState<string>('');
  const [imgFilter, setImgFilter] = useState<'none' | 'grayscale' | 'sepia' | 'blur' | 'invert'>('none');
  const [imgRounding, setImgRounding] = useState(0);
  const [imgOpacity, setImgOpacity] = useState(100);

  // Generate JSX output
  useEffect(() => {
    if (editorMode === 'canvas') {
      const pathsRaw = paths.map((p) => 
        `    <path d="${p.d}" stroke="${p.color}" stroke-width="${p.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"${p.dash !== 'none' ? ` stroke-dasharray="${p.dash}"` : ''} />`
      ).join('\n');
      
      const pathsJsx = paths.map((p) => 
        `    <path d="${p.d}" stroke="${p.color}" strokeWidth="${p.width}" fill="none" strokeLinecap="round" strokeLinejoin="round"${p.dash !== 'none' ? ` strokeDasharray="${p.dash}"` : ''} />`
      ).join('\n');
      
      const currRaw = currentPath ? `\n    <path d="${currentPath}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"${strokeDash !== 'none' ? ` stroke-dasharray="${strokeDash}"` : ''} />` : '';
      const currJsx = currentPath ? `\n    <path d="${currentPath}" stroke="${strokeColor}" strokeWidth="${strokeWidth}" fill="none" strokeLinecap="round" strokeLinejoin="round"${strokeDash !== 'none' ? ` strokeDasharray="${strokeDash}"` : ''} />` : '';

      const raw = `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">\n${pathsRaw}${currRaw}\n</svg>`;
      const jsx = `const CustomSvg = () => (\n  <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">\n${pathsJsx}${currJsx}\n  </svg>\n);`;

      setRawSvgCode(raw);
      setOutputCode(codeMode === 'jsx' ? jsx : raw);
    } else {
      if (!imgData) {
        setOutputCode('// Upload an image first to generate ASCII SVG pattern');
        setRawSvgCode('');
        return;
      }
      
      let filterJsx = '';
      let filterRaw = '';
      let filterDef = '';
      
      if (imgFilter !== 'none') {
        filterJsx = ` filter="url(#my-filter)"`;
        filterRaw = ` filter="url(#my-filter)"`;
        if (imgFilter === 'grayscale') filterDef = `<filter id="my-filter"><feColorMatrix type="matrix" values="0.333 0.333 0.333 0 0  0.333 0.333 0.333 0 0  0.333 0.333 0.333 0 0  0 0 0 1 0"/></filter>`;
        if (imgFilter === 'sepia') filterDef = `<filter id="my-filter"><feColorMatrix type="matrix" values="0.393 0.769 0.189 0 0  0.349 0.686 0.168 0 0  0.272 0.534 0.131 0 0  0 0 0 1 0"/></filter>`;
        if (imgFilter === 'blur') filterDef = `<filter id="my-filter"><feGaussianBlur stdDeviation="4"/></filter>`;
        if (imgFilter === 'invert') filterDef = `<filter id="my-filter"><feComponentTransfer><feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/></feComponentTransfer></filter>`;
      }

      const clipDef = imgRounding > 0 ? `<clipPath id="my-clip"><rect width="100%" height="100%" rx="${imgRounding}" /></clipPath>` : '';
      const clipJsx = imgRounding > 0 ? ` clipPath="url(#my-clip)"` : '';
      const clipRaw = imgRounding > 0 ? ` clip-path="url(#my-clip)"` : '';
      const opacStr = imgOpacity < 100 ? ` opacity="${(imgOpacity / 100).toFixed(2)}"` : '';

      const defs = filterDef || clipDef ? `\n    <defs>\n      ${filterDef}\n      ${clipDef}\n    </defs>` : '';

      const raw = `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" style="color: currentColor;">${defs}\n  <g${filterRaw}${clipRaw}${opacStr}>\n${imgData}\n  </g>\n</svg>`;
      const jsx = `const AsciiSvg = () => (\n  <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-black dark:text-white">${defs}\n    <g${filterJsx}${clipJsx}${opacStr}>\n${imgData}\n    </g>\n  </svg>\n);`;

      setRawSvgCode(raw);
      setOutputCode(codeMode === 'jsx' ? jsx : raw);
    }
  }, [editorMode, codeMode, paths, currentPath, strokeColor, strokeWidth, strokeDash, imgData, imgFilter, imgRounding, imgOpacity]);

  // Canvas Handlers
  const getCoords = (e: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const viewBoxWidth = 800;
    const viewBoxHeight = 450;
    const x = ((e.clientX - rect.left) / rect.width) * viewBoxWidth;
    const y = ((e.clientY - rect.top) / rect.height) * viewBoxHeight;
    return { x: Math.round(x), y: Math.round(y) };
  };

  const startDrawing = (e: React.PointerEvent) => {
    setIsDrawing(true);
    const { x, y } = getCoords(e);
    if (tool === 'brush') {
      setCurrentPath(`M ${x} ${y}`);
    } else {
      eraseNear(x, y);
    }
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    if (tool === 'brush') {
      setCurrentPath(prev => `${prev} L ${x} ${y}`);
    } else {
      eraseNear(x, y);
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (tool === 'brush' && currentPath) {
      setPaths(prev => [...prev, { d: currentPath, color: strokeColor, width: strokeWidth, dash: strokeDash }]);
      setCurrentPath('');
    }
  };
  
  const eraseNear = (px: number, py: number) => {
    setPaths(prev => prev.filter(p => {
      const points = p.d.match(/[ML]\s*([-\d.]+)\s+([-\d.]+)/g);
      if (!points) return true;
      for (const pt of points) {
        const match = pt.match(/[ML]\s*([-\d.]+)\s+([-\d.]+)/);
        if (match) {
          const x = parseFloat(match[1]);
          const y = parseFloat(match[2]);
          if (Math.hypot(px - x, py - y) < 20) return false; // remove path if close
        }
      }
      return true; // keep path
    }));
  };
  
  const handleUndo = () => setPaths(prev => prev.slice(0, -1));
  const handleClear = () => setPaths([]);

  // Image Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          const w = 80;
          const h = 45;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          
          let asciiSvg = '';
          const asciiChars = ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'];
          
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const r = data[idx];
              const g = data[idx+1];
              const b = data[idx+2];
              const a = data[idx+3];
              if (a < 128) continue;
              
              const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
              const charIdx = Math.floor(brightness * (asciiChars.length - 1));
              const char = asciiChars[charIdx];
              
              const px = x * 10 + 5;
              const py = y * 10 + 8;
              
              asciiSvg += `      <text x="${px}" y="${py}" font-family="monospace" font-size="10" fill="currentColor" text-anchor="middle">${char}</text>\n`;
            }
          }
          setImgData(asciiSvg);
        };
        img.src = ev.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };
  
  const downloadSvgFile = () => {
    if (!rawSvgCode) return;
    const blob = new Blob([rawSvgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `motionkit-${editorMode}-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-6 sm:p-12 lg:p-20 flex flex-col items-center transition-colors">
      <header className="max-w-4xl w-full text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-bold mb-4 dark:text-white">
          SVG Studio
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          className="text-neutral-500 dark:text-neutral-400 text-lg">
          Craft production-ready SVG components with drawing tools or powerful ASCII image conversion.
        </motion.p>
      </header>

      <div className="flex flex-wrap justify-center gap-3 mb-10">
        <div className="flex gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900">
          <TabButton active={editorMode === 'canvas'} onClick={() => setEditorMode('canvas')}>Canvas Editor</TabButton>
          <TabButton active={editorMode === 'image'} onClick={() => setEditorMode('image')}>ASCII Converter</TabButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 max-w-6xl w-full">
        {/* Preview Area */}
        <div className="flex flex-col gap-6">
          <div
            className="w-full aspect-video rounded-3xl shadow-xl border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden bg-neutral-50 dark:bg-[#111] relative select-none flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:20px_20px]"
            style={{ contain: 'strict', boxSizing: 'border-box' }}
          >
            {editorMode === 'canvas' ? (
              <svg 
                ref={svgRef}
                viewBox="0 0 800 450" 
                preserveAspectRatio="none"
                className="w-full h-full cursor-crosshair touch-none absolute inset-0"
                style={{ transition: 'none', willChange: 'auto' }}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={endDrawing}
                onPointerLeave={endDrawing}
              >
                {paths.map((p, i) => (
                  <path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} strokeDasharray={p.dash !== 'none' ? p.dash : undefined} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {currentPath && (
                  <path d={currentPath} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDash !== 'none' ? strokeDash : undefined} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            ) : (
              <svg viewBox="0 0 800 450" className="w-full h-full pointer-events-none absolute inset-0 text-black dark:text-white">
                  <defs>
                    {imgFilter === 'grayscale' && <filter id="preview-grayscale"><feColorMatrix type="matrix" values="0.333 0.333 0.333 0 0  0.333 0.333 0.333 0 0  0.333 0.333 0.333 0 0  0 0 0 1 0"/></filter>}
                    {imgFilter === 'sepia' && <filter id="preview-sepia"><feColorMatrix type="matrix" values="0.393 0.769 0.189 0 0  0.349 0.686 0.168 0 0  0.272 0.534 0.131 0 0  0 0 0 1 0"/></filter>}
                    {imgFilter === 'blur' && <filter id="preview-blur"><feGaussianBlur stdDeviation="4"/></filter>}
                    {imgFilter === 'invert' && <filter id="preview-invert"><feComponentTransfer><feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/></feComponentTransfer></filter>}
                    {imgRounding > 0 && <clipPath id="preview-rounded"><rect width="100%" height="100%" rx={imgRounding} /></clipPath>}
                  </defs>
                  {imgData ? (
                    <g 
                      dangerouslySetInnerHTML={{ __html: imgData }}
                      filter={imgFilter !== 'none' ? `url(#preview-${imgFilter})` : undefined}
                      clipPath={imgRounding > 0 ? "url(#preview-rounded)" : undefined}
                      opacity={imgOpacity / 100}
                    />
                  ) : (
                    <rect width="100%" height="100%" fill="transparent" />
                  )}
              </svg>
            )}
            
            {editorMode === 'image' && !imgData && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-neutral-400 dark:text-neutral-500 font-medium px-4 py-2 bg-white/50 dark:bg-black/50 rounded-full backdrop-blur-md shadow-sm">Upload an image to preview ASCII pattern</span>
              </div>
            )}
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col h-full max-h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2 p-1 rounded-lg bg-neutral-200 dark:bg-neutral-950">
                <button onClick={() => setCodeMode('jsx')} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${codeMode === 'jsx' ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>JSX</button>
                <button onClick={() => setCodeMode('raw')} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${codeMode === 'raw' ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>SVG</button>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={outputCode} />
                <button onClick={downloadSvgFile} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-sm">
                  Download .svg
                </button>
              </div>
            </div>
            <pre className="bg-neutral-100 dark:bg-neutral-950 p-4 rounded-xl text-[11px] sm:text-xs font-mono text-neutral-600 dark:text-neutral-300 overflow-y-auto whitespace-pre-wrap flex-1 border border-neutral-200 dark:border-neutral-800/50">
              <code>{outputCode}</code>
            </pre>
          </div>
        </div>

        {/* Controls Area */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {editorMode === 'canvas' ? (
              <motion.div key="canvas-ctrls" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold dark:text-white text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Canvas Controls
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={handleUndo} disabled={paths.length === 0} className="px-2.5 py-1 text-xs font-medium bg-neutral-200 dark:bg-neutral-800 rounded-md disabled:opacity-50 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors">Undo</button>
                    <button onClick={handleClear} disabled={paths.length === 0} className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-md disabled:opacity-50 hover:bg-red-200 transition-colors">Clear</button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Tool</p>
                  <div className="flex gap-2">
                    <button onClick={() => setTool('brush')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tool === 'brush' ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'}`}>Brush</button>
                    <button onClick={() => setTool('eraser')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tool === 'eraser' ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'}`}>Eraser</button>
                  </div>
                </div>
                
                <ColorInput label="Color" value={strokeColor} onChange={setStrokeColor} />
                <Slider label="Stroke Width" value={strokeWidth} onChange={setStrokeWidth} min={1} max={40} unit="px" />
                
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Brush Type</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['none', '10 10', '2 8'] as const).map(d => (
                      <button key={d} onClick={() => setStrokeDash(d)}
                        className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                          strokeDash === d
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                        }`}>
                        {d === 'none' ? 'Solid' : d === '10 10' ? 'Dashed' : 'Dotted'}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="img-ctrls" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-6">
                <h3 className="font-bold dark:text-white text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  ASCII Generator Settings
                </h3>

                <div className="flex flex-col gap-2 p-4 bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800 border-dashed relative">
                  <input type="file" accept="image/*" onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="text-center pointer-events-none">
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Click to Upload Image</p>
                    <p className="text-[10px] text-neutral-400">JPG, PNG, GIF, WebP</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">SVG Filters</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['none', 'grayscale', 'sepia', 'blur', 'invert'] as const).map(f => (
                      <button key={f} onClick={() => setImgFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                          imgFilter === f
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                        }`}>{f}</button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Slider label="Corner Radius (rx)" value={imgRounding} onChange={setImgRounding} min={0} max={200} unit="px" />
                  <Slider label="Opacity" value={imgOpacity} onChange={setImgOpacity} min={10} max={100} unit="%" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 dark:border-indigo-500/10">
            <h4 className="text-sm font-bold mb-1 dark:text-white">💡 Pro Tip</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-3">
              Switch between <strong>JSX</strong> for Next.js/React projects, or <strong>SVG</strong> for vanilla HTML.
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Use the <strong className="text-indigo-600 dark:text-indigo-400">Download .svg</strong> button to save the raw file to your system!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
