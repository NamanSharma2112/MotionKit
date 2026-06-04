"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Eraser, PaintBucket, Hammer, Move, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';

/* ─── Types ─── */
type ShapeType = 'cube' | 'slab' | 'pyramid' | 'cylinder' | 'wedge';

interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  shape: ShapeType;
}

/* ─── Constants ─── */
const TW = 28; // tile half-width
const TH = 14; // tile half-height
const CH = 28; // standard cube height
const CX = 400; // svg center x
const CY = 100; // svg center y (moved up for better default view)

/* ─── Helpers ─── */
function shadeColor(color: string, percent: number) {
  let R = parseInt(color.substring(1,3),16);
  let G = parseInt(color.substring(3,5),16);
  let B = parseInt(color.substring(5,7),16);

  R = Math.round(R * (100 + percent) / 100);
  G = Math.round(G * (100 + percent) / 100);
  B = Math.round(B * (100 + percent) / 100);

  R = (R<255)?R:255;  
  G = (G<255)?G:255;  
  B = (B<255)?B:255;  

  return "#" + (R.toString(16).padStart(2,'0')) + (G.toString(16).padStart(2,'0')) + (B.toString(16).padStart(2,'0'));
}

export default function IsometricMakerPage() {
  // State
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [currentColor, setCurrentColor] = useState('#6366f1');
  const [currentShape, setCurrentShape] = useState<ShapeType>('cube');
  const [tool, setTool] = useState<'build' | 'destroy' | 'paint' | 'pan'>('build');
  const [gridSize, setGridSize] = useState(12);
  const [showGrid, setShowGrid] = useState(true);
  
  // Camera state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanRef = useRef({ x: 0, y: 0 });

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('motionkit-isometric');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setBlocks(parsed);
      } catch (e) {}
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('motionkit-isometric', JSON.stringify(blocks));
  }, [blocks]);

  // Generate grid floor
  const floorGrid = useMemo(() => {
    const grid = [];
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        grid.push({ x, y, z: 0 });
      }
    }
    return grid.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  }, [gridSize]);

  // Sort blocks for rendering (painters algorithm)
  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z));
  }, [blocks]);

  /* ─── Interactions ─── */
  const handleGridClick = (gx: number, gy: number, evt: React.MouseEvent) => {
    if (tool === 'pan') return;
    evt.preventDefault();
    evt.stopPropagation();
    if (tool === 'build') {
      const stack = blocks.filter(b => b.x === gx && b.y === gy);
      const z = stack.length > 0 ? Math.max(...stack.map(b => b.z + (b.shape === 'slab' ? 0.5 : 1))) : 1;
      const id = `b_${gx}_${gy}_${Date.now()}`;
      setBlocks([...blocks, { id, x: gx, y: gy, z, color: currentColor, shape: currentShape }]);
    }
  };

  const handleBlockClick = (id: string, bx: number, by: number, bz: number, bShape: ShapeType, evt: React.MouseEvent) => {
    if (tool === 'pan') return;
    evt.preventDefault();
    evt.stopPropagation();
    if (tool === 'destroy') {
      setBlocks(blocks.filter(b => b.id !== id));
    } else if (tool === 'build') {
      const z = bz + (bShape === 'slab' ? 0.5 : 1);
      const newId = `b_${bx}_${by}_${Date.now()}`;
      setBlocks([...blocks, { id: newId, x: bx, y: by, z, color: currentColor, shape: currentShape }]);
    } else if (tool === 'paint') {
      setBlocks(blocks.map(b => b.id === id ? { ...b, color: currentColor } : b));
    }
  };

  /* ─── Camera ─── */
  const handlePointerDown = (e: React.PointerEvent) => {
    if (tool === 'pan' || e.button === 1 || e.button === 2) { // Middle or right click also pans
      setIsPanning(true);
      lastPanRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanRef.current.x;
      const dy = e.clientY - lastPanRef.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.min(Math.max(0.2, z * zoomFactor), 5));
    }
  };

  /* ─── Export ─── */
  const generateSvgCode = () => {
    let svg = `<svg viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg">\n`;
    
    sortedBlocks.forEach(b => {
      const px = CX + (b.x - b.y) * TW;
      const py = CY + (b.x + b.y) * TH - ((b.z-1) * CH);
      
      const colorTop = shadeColor(b.color, 20);
      const colorLeft = b.color;
      const colorRight = shadeColor(b.color, -20);
      
      svg += `  <g id="${b.id}">\n`;
      
      if (b.shape === 'cube') {
        const topPts = `${px},${py - CH} ${px + TW},${py + TH - CH} ${px},${py + 2*TH - CH} ${px - TW},${py + TH - CH}`;
        const rightPts = `${px},${py + 2*TH - CH} ${px + TW},${py + TH - CH} ${px + TW},${py + TH} ${px},${py + 2*TH}`;
        const leftPts = `${px},${py + 2*TH - CH} ${px},${py + 2*TH} ${px - TW},${py + TH} ${px - TW},${py + TH - CH}`;
        svg += `    <polygon points="${leftPts}" fill="${colorLeft}" stroke="${colorLeft}" stroke-linejoin="round" />\n`;
        svg += `    <polygon points="${rightPts}" fill="${colorRight}" stroke="${colorRight}" stroke-linejoin="round" />\n`;
        svg += `    <polygon points="${topPts}" fill="${colorTop}" stroke="${colorTop}" stroke-linejoin="round" />\n`;
      } else if (b.shape === 'slab') {
        const HC = CH / 2;
        const topPts = `${px},${py - HC} ${px + TW},${py + TH - HC} ${px},${py + 2*TH - HC} ${px - TW},${py + TH - HC}`;
        const rightPts = `${px},${py + 2*TH - HC} ${px + TW},${py + TH - HC} ${px + TW},${py + TH} ${px},${py + 2*TH}`;
        const leftPts = `${px},${py + 2*TH - HC} ${px},${py + 2*TH} ${px - TW},${py + TH} ${px - TW},${py + TH - HC}`;
        svg += `    <polygon points="${leftPts}" fill="${colorLeft}" stroke="${colorLeft}" stroke-linejoin="round" />\n`;
        svg += `    <polygon points="${rightPts}" fill="${colorRight}" stroke="${colorRight}" stroke-linejoin="round" />\n`;
        svg += `    <polygon points="${topPts}" fill="${colorTop}" stroke="${colorTop}" stroke-linejoin="round" />\n`;
      } else if (b.shape === 'pyramid') {
        const rightPts = `${px},${py} ${px + TW},${py - TH} ${px},${py - TH - CH}`;
        const leftPts = `${px},${py} ${px},${py - TH - CH} ${px - TW},${py - TH}`;
        svg += `    <polygon points="${leftPts}" fill="${colorLeft}" stroke="${colorLeft}" stroke-linejoin="round" />\n`;
        svg += `    <polygon points="${rightPts}" fill="${colorRight}" stroke="${colorRight}" stroke-linejoin="round" />\n`;
      } else if (b.shape === 'cylinder') {
        const bodyPath = `M ${px - TW},${py - TH} L ${px - TW},${py - TH - CH} A ${TW} ${TH} 0 0 0 ${px + TW},${py - TH - CH} L ${px + TW},${py - TH} A ${TW} ${TH} 0 0 1 ${px - TW},${py - TH}`;
        svg += `    <path d="${bodyPath}" fill="${colorLeft}" />\n`;
        svg += `    <ellipse cx="${px}" cy="${py - TH - CH}" rx="${TW}" ry="${TH}" fill="${colorTop}" />\n`;
      } else if (b.shape === 'wedge') {
        const leftPts = `${px},${py} ${px},${py - CH} ${px - TW},${py - TH}`;
        const rightPts = `${px},${py} ${px + TW},${py - TH} ${px + TW},${py - TH - CH} ${px},${py - CH}`;
        const topPts = `${px - TW},${py - TH} ${px},${py - CH} ${px + TW},${py - TH - CH} ${px},${py - 2*TH}`;
        svg += `    <polygon points="${leftPts}" fill="${colorLeft}" stroke="${colorLeft}" stroke-linejoin="round" />\n`;
        svg += `    <polygon points="${rightPts}" fill="${colorRight}" stroke="${colorRight}" stroke-linejoin="round" />\n`;
        svg += `    <polygon points="${topPts}" fill="${colorTop}" stroke="${colorTop}" stroke-linejoin="round" />\n`;
      }
      
      svg += `  </g>\n`;
    });
    
    svg += `</svg>`;
    return svg;
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([generateSvgCode()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `motionkit-scene-${Date.now()}.svg`;
    a.click(); URL.revokeObjectURL(url);
  };

  /* ─── Renderers ─── */
  const renderBlock = (b: Block) => {
    const px = CX + (b.x - b.y) * TW;
    const py = CY + (b.x + b.y) * TH - ((b.z-1) * CH);
    
    const colorTop = shadeColor(b.color, 20);
    const colorLeft = b.color;
    const colorRight = shadeColor(b.color, -20);

    const isInteractive = tool !== 'pan';
    const classes = `transition-transform duration-200 ${isInteractive ? 'cursor-pointer' : ''} ${
      tool === 'destroy' ? 'hover:opacity-50' : 
      tool === 'paint' ? 'hover:brightness-110' : 
      tool === 'build' ? 'hover:-translate-y-1' : ''
    }`;

    let elements = null;

    if (b.shape === 'cube') {
      const topPts = `${px},${py - CH} ${px + TW},${py + TH - CH} ${px},${py + 2*TH - CH} ${px - TW},${py + TH - CH}`;
      const rightPts = `${px},${py + 2*TH - CH} ${px + TW},${py + TH - CH} ${px + TW},${py + TH} ${px},${py + 2*TH}`;
      const leftPts = `${px},${py + 2*TH - CH} ${px},${py + 2*TH} ${px - TW},${py + TH} ${px - TW},${py + TH - CH}`;
      elements = (
        <>
          <polygon points={leftPts} fill={colorLeft} stroke={colorLeft} strokeWidth={0.5} strokeLinejoin="round" />
          <polygon points={rightPts} fill={colorRight} stroke={colorRight} strokeWidth={0.5} strokeLinejoin="round" />
          <polygon points={topPts} fill={colorTop} stroke={colorTop} strokeWidth={0.5} strokeLinejoin="round" />
        </>
      );
    } else if (b.shape === 'slab') {
      const HC = CH / 2;
      const topPts = `${px},${py - HC} ${px + TW},${py + TH - HC} ${px},${py + 2*TH - HC} ${px - TW},${py + TH - HC}`;
      const rightPts = `${px},${py + 2*TH - HC} ${px + TW},${py + TH - HC} ${px + TW},${py + TH} ${px},${py + 2*TH}`;
      const leftPts = `${px},${py + 2*TH - HC} ${px},${py + 2*TH} ${px - TW},${py + TH} ${px - TW},${py + TH - HC}`;
      elements = (
        <>
          <polygon points={leftPts} fill={colorLeft} stroke={colorLeft} strokeWidth={0.5} strokeLinejoin="round" />
          <polygon points={rightPts} fill={colorRight} stroke={colorRight} strokeWidth={0.5} strokeLinejoin="round" />
          <polygon points={topPts} fill={colorTop} stroke={colorTop} strokeWidth={0.5} strokeLinejoin="round" />
        </>
      );
    } else if (b.shape === 'pyramid') {
      const rightPts = `${px},${py} ${px + TW},${py - TH} ${px},${py - TH - CH}`;
      const leftPts = `${px},${py} ${px},${py - TH - CH} ${px - TW},${py - TH}`;
      elements = (
        <>
          <polygon points={leftPts} fill={colorLeft} stroke={colorLeft} strokeWidth={0.5} strokeLinejoin="round" />
          <polygon points={rightPts} fill={colorRight} stroke={colorRight} strokeWidth={0.5} strokeLinejoin="round" />
        </>
      );
    } else if (b.shape === 'cylinder') {
      const bodyPath = `M ${px - TW},${py - TH} L ${px - TW},${py - TH - CH} A ${TW} ${TH} 0 0 0 ${px + TW},${py - TH - CH} L ${px + TW},${py - TH} A ${TW} ${TH} 0 0 1 ${px - TW},${py - TH}`;
      elements = (
        <>
          <path d={bodyPath} fill={colorLeft} />
          <ellipse cx={px} cy={py - TH - CH} rx={TW} ry={TH} fill={colorTop} />
        </>
      );
    } else if (b.shape === 'wedge') {
      const leftPts = `${px},${py} ${px},${py - CH} ${px - TW},${py - TH}`;
      const rightPts = `${px},${py} ${px + TW},${py - TH} ${px + TW},${py - TH - CH} ${px},${py - CH}`;
      const topPts = `${px - TW},${py - TH} ${px},${py - CH} ${px + TW},${py - TH - CH} ${px},${py - 2*TH}`;
      elements = (
        <>
          <polygon points={leftPts} fill={colorLeft} stroke={colorLeft} strokeWidth={0.5} strokeLinejoin="round" />
          <polygon points={rightPts} fill={colorRight} stroke={colorRight} strokeWidth={0.5} strokeLinejoin="round" />
          <polygon points={topPts} fill={colorTop} stroke={colorTop} strokeWidth={0.5} strokeLinejoin="round" />
        </>
      );
    }

    return (
      <g key={b.id} className={classes} onPointerDown={(e) => handleBlockClick(b.id, b.x, b.y, b.z, b.shape, e)}>
        {elements}
      </g>
    );
  };

  return (
    <div className="min-h-screen p-6 sm:p-12 lg:p-20 flex flex-col items-center transition-colors">
      <header className="max-w-4xl w-full text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-bold mb-4 dark:text-white">
          Isometric Studio
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          className="text-neutral-500 dark:text-neutral-400 text-lg">
          Build infinite 3D scenes using SVG blocks, cylinders, and pyramids. Auto-saves to your browser!
        </motion.p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 max-w-[1400px] w-full">
        {/* Editor Canvas */}
        <div className="flex flex-col gap-4">
          
          {/* Main Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex gap-2">
              <button onClick={() => setTool('build')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${tool === 'build' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}><Hammer size={16}/> Build</button>
              <button onClick={() => setTool('paint')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${tool === 'paint' ? 'bg-pink-600 text-white' : 'bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}><PaintBucket size={16}/> Paint</button>
              <button onClick={() => setTool('destroy')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${tool === 'destroy' ? 'bg-red-600 text-white' : 'bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}><Eraser size={16}/> Erase</button>
              <div className="w-px h-8 bg-neutral-300 dark:bg-neutral-700 mx-2" />
              <button onClick={() => setTool('pan')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${tool === 'pan' ? 'bg-neutral-800 text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}><Move size={16}/> Pan</button>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setZoom(z => z * 1.2)} className="p-2 rounded-xl bg-white dark:bg-black hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors shadow-sm"><ZoomIn size={18} className="dark:text-white"/></button>
              <button onClick={() => setZoom(z => z * 0.8)} className="p-2 rounded-xl bg-white dark:bg-black hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors shadow-sm"><ZoomOut size={18} className="dark:text-white"/></button>
              <button onClick={() => { setPan({x:0,y:0}); setZoom(1); }} className="px-3 py-2 rounded-xl bg-white dark:bg-black hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors shadow-sm text-xs font-bold dark:text-white">Reset View</button>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div 
            className="w-full bg-neutral-50 dark:bg-[#0a0a0a] rounded-3xl shadow-xl overflow-hidden border border-neutral-200/50 dark:border-neutral-800/50 relative select-none" 
            style={{ height: '70vh', minHeight: '500px' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
            onContextMenu={e => e.preventDefault()}
          >
            <div className="absolute top-4 right-4 text-xs font-mono px-3 py-1.5 bg-black/40 backdrop-blur-md text-white rounded-lg pointer-events-none z-10">
              Blocks: {blocks.length} | Zoom: {Math.round(zoom * 100)}%
            </div>

            <svg 
              className={`w-full h-full ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`} 
              preserveAspectRatio="xMidYMid meet"
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} className="origin-center transition-transform duration-75 ease-out">
                {/* Floor Grid */}
                {showGrid && (
                  <g id="floor">
                    {floorGrid.map(({x, y}) => {
                      const px = CX + (x - y) * TW;
                      const py = CY + (x + y) * TH;
                      const pts = `${px},${py} ${px + TW},${py + TH} ${px},${py + 2*TH} ${px - TW},${py + TH}`;
                      return (
                        <polygon 
                          key={`f_${x}_${y}`} 
                          points={pts} 
                          fill="transparent" 
                          stroke="currentColor" 
                          strokeOpacity="0.1" 
                          strokeWidth="1"
                          className={tool !== 'pan' ? 'cursor-pointer hover:fill-indigo-500/10 transition-colors duration-200' : ''}
                          onPointerDown={(e) => handleGridClick(x, y, e)}
                        />
                      );
                    })}
                  </g>
                )}

                {/* Blocks */}
                <g id="blocks">
                  {sortedBlocks.map(b => renderBlock(b))}
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Right Sidebar Controls */}
        <div className="flex flex-col gap-6">
          <div className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-6">
            <h3 className="font-bold dark:text-white text-sm flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Build Properties
            </h3>

            {/* Shape Selector */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Shape</p>
              <div className="grid grid-cols-2 gap-2">
                {(['cube', 'slab', 'pyramid', 'cylinder', 'wedge'] as const).map(s => (
                  <button 
                    key={s} 
                    onClick={() => setCurrentShape(s)}
                    className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${currentShape === s ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-indigo-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Block Color</p>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#ffffff', '#94a3b8', '#1e293b'].map(c => (
                  <button 
                    key={c} 
                    onClick={() => setCurrentColor(c)}
                    className={`w-full aspect-square rounded-full border-2 transition-transform shadow-sm ${currentColor === c ? 'scale-110 border-black dark:border-white' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <label className="flex items-center justify-between p-3 bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:border-indigo-400 transition-colors">
                <span className="text-xs font-semibold dark:text-white">Custom Color</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-neutral-400 uppercase">{currentColor}</span>
                  <input type="color" value={currentColor} onChange={e => setCurrentColor(e.target.value)}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent p-0" />
                </div>
              </label>
            </div>

            {/* Grid Settings */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Environment</p>
              <label className="flex items-center justify-between p-3 bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:border-indigo-400 transition-colors">
                <span className="text-xs font-semibold dark:text-white">Show Grid Floor</span>
                <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-100 border-transparent" />
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button 
                onClick={handleDownloadSvg}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                <Download size={18} /> Export SVG
              </button>
              
              <button 
                onClick={() => { if(confirm('Clear entire scene?')) setBlocks([]); }}
                className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2">
                <Trash2 size={18} /> Clear Scene
              </button>
            </div>
          </div>
          
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 dark:border-indigo-500/10">
            <h4 className="text-sm font-bold mb-1 dark:text-white">💡 Pro Tips</h4>
            <ul className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed space-y-2">
              <li>• Use <strong>Middle-Click</strong> or select the Pan tool to drag the canvas around.</li>
              <li>• Scroll with <strong>Ctrl/Cmd + Wheel</strong> to zoom in and out.</li>
              <li>• Your scene is auto-saved to your browser!</li>
              <li>• <strong>Slabs</strong> are half-height cubes, perfect for making stairs or flooring.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
