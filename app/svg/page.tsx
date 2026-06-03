"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ─── */
type ToolType = 'brush' | 'eraser' | 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'text' | 'select';

interface PathShape {
  type: 'path';
  d: string;
  color: string;
  width: number;
  dash: string;
  fill: string;
  opacity: number;
}

interface RectShape {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  width: number;
  fill: string;
  rx: number;
  opacity: number;
}

interface CircleShape {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
  color: string;
  width: number;
  fill: string;
  opacity: number;
}

interface EllipseShape {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  width: number;
  fill: string;
  opacity: number;
}

interface LineShape {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  dash: string;
  opacity: number;
}

interface PolygonShape {
  type: 'polygon';
  cx: number;
  cy: number;
  r: number;
  sides: number;
  color: string;
  width: number;
  fill: string;
  opacity: number;
}

interface TextShape {
  type: 'text';
  x: number;
  y: number;
  content: string;
  fontSize: number;
  color: string;
  fontWeight: string;
  opacity: number;
}

type Shape = PathShape | RectShape | CircleShape | EllipseShape | LineShape | PolygonShape | TextShape;

/* ─── Small Reusable Components ─── */
function Slider({ label, value, onChange, min, max, unit = '', step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; unit?: string; step?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
        <span className="font-mono text-neutral-700 dark:text-neutral-300">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}
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

function ToolBtn({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button onClick={onClick} title={title}
      className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
        active
          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md'
          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
      }`}>
      {children}
    </button>
  );
}

/* ─── Polygon Helper ─── */
function polygonPoints(cx: number, cy: number, r: number, sides: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

/* ─── SVG Code Generation ─── */
function shapeToSvg(shape: Shape, jsx: boolean): string {
  const sl = (camel: string, kebab: string, val: string | number) => jsx ? `${camel}="${val}"` : `${kebab}="${val}"`;

  switch (shape.type) {
    case 'path': {
      const dash = shape.dash !== 'none' ? ` ${sl('strokeDasharray', 'stroke-dasharray', shape.dash)}` : '';
      const fill = shape.fill !== 'none' ? ` fill="${shape.fill}"` : ' fill="none"';
      const op = shape.opacity < 1 ? ` opacity="${shape.opacity}"` : '';
      return `  <path d="${shape.d}" stroke="${shape.color}" ${sl('strokeWidth', 'stroke-width', shape.width)}${fill} ${sl('strokeLinecap', 'stroke-linecap', 'round')} ${sl('strokeLinejoin', 'stroke-linejoin', 'round')}${dash}${op} />`;
    }
    case 'rect': {
      const fill = shape.fill !== 'none' ? ` fill="${shape.fill}"` : ' fill="none"';
      const rx = shape.rx > 0 ? ` rx="${shape.rx}"` : '';
      const op = shape.opacity < 1 ? ` opacity="${shape.opacity}"` : '';
      return `  <rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" stroke="${shape.color}" ${sl('strokeWidth', 'stroke-width', shape.width)}${fill}${rx}${op} />`;
    }
    case 'circle': {
      const fill = shape.fill !== 'none' ? ` fill="${shape.fill}"` : ' fill="none"';
      const op = shape.opacity < 1 ? ` opacity="${shape.opacity}"` : '';
      return `  <circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" stroke="${shape.color}" ${sl('strokeWidth', 'stroke-width', shape.width)}${fill}${op} />`;
    }
    case 'ellipse': {
      const fill = shape.fill !== 'none' ? ` fill="${shape.fill}"` : ' fill="none"';
      const op = shape.opacity < 1 ? ` opacity="${shape.opacity}"` : '';
      return `  <ellipse cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}" stroke="${shape.color}" ${sl('strokeWidth', 'stroke-width', shape.width)}${fill}${op} />`;
    }
    case 'line': {
      const dash = shape.dash !== 'none' ? ` ${sl('strokeDasharray', 'stroke-dasharray', shape.dash)}` : '';
      const op = shape.opacity < 1 ? ` opacity="${shape.opacity}"` : '';
      return `  <line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${shape.color}" ${sl('strokeWidth', 'stroke-width', shape.width)}${sl('strokeLinecap', 'stroke-linecap', 'round')}${dash}${op} />`;
    }
    case 'polygon': {
      const pts = polygonPoints(shape.cx, shape.cy, shape.r, shape.sides);
      const fill = shape.fill !== 'none' ? ` fill="${shape.fill}"` : ' fill="none"';
      const op = shape.opacity < 1 ? ` opacity="${shape.opacity}"` : '';
      return `  <polygon points="${pts}" stroke="${shape.color}" ${sl('strokeWidth', 'stroke-width', shape.width)}${fill} ${sl('strokeLinejoin', 'stroke-linejoin', 'round')}${op} />`;
    }
    case 'text': {
      const op = shape.opacity < 1 ? ` opacity="${shape.opacity}"` : '';
      const fw = shape.fontWeight !== 'normal' ? ` ${sl('fontWeight', 'font-weight', shape.fontWeight)}` : '';
      return `  <text x="${shape.x}" y="${shape.y}" ${sl('fontSize', 'font-size', shape.fontSize)} fill="${shape.color}" ${sl('fontFamily', 'font-family', 'sans-serif')}${fw}${op}>${shape.content}</text>`;
    }
  }
}

/* ─── Tool Icons (tiny inline SVG) ─── */
const ToolIcons: Record<ToolType, React.ReactNode> = {
  select: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l14 9-7 2-4 7z"/></svg>,
  brush: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>,
  eraser: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 21h10"/><path d="M5.5 13.5L12 7l5 5-6.5 6.5a2.12 2.12 0 0 1-3 0L5.5 16.5a2.12 2.12 0 0 1 0-3z"/></svg>,
  rect: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  circle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>,
  ellipse: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="6"/></svg>,
  line: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>,
  polygon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,2 22,8.5 19,20 5,20 2,8.5"/></svg>,
  text: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9.5" y1="20" x2="14.5" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
};

const TOOL_LIST: { key: ToolType; title: string }[] = [
  { key: 'select', title: 'Select' },
  { key: 'brush', title: 'Brush' },
  { key: 'eraser', title: 'Eraser' },
  { key: 'line', title: 'Line' },
  { key: 'rect', title: 'Rectangle' },
  { key: 'circle', title: 'Circle' },
  { key: 'ellipse', title: 'Ellipse' },
  { key: 'polygon', title: 'Polygon' },
  { key: 'text', title: 'Text' },
];

/* ─── Main Page ─── */
export default function SvgMakerPage() {
  const [editorMode, setEditorMode] = useState<'canvas' | 'image' | 'vectorizer'>('canvas');
  const [codeMode, setCodeMode] = useState<'jsx' | 'raw'>('jsx');
  const [outputCode, setOutputCode] = useState('');
  const [rawSvgCode, setRawSvgCode] = useState('');

  // Canvas State
  const [tool, setTool] = useState<ToolType>('brush');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('none');
  const [useFill, setUseFill] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeDash, setStrokeDash] = useState<'none' | '10 10' | '2 8'>('none');
  const [shapeOpacity, setShapeOpacity] = useState(100);
  const [cornerRadius, setCornerRadius] = useState(0);
  const [polygonSides, setPolygonSides] = useState(5);
  const [textContent, setTextContent] = useState('Text');
  const [fontSize, setFontSize] = useState(32);
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  
  // Preview shape while dragging
  const [previewShape, setPreviewShape] = useState<Shape | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);

  // Image State (ASCII Converter)
  const [imgData, setImgData] = useState<string>('');
  const [imgFilter, setImgFilter] = useState<'none' | 'grayscale' | 'sepia' | 'blur' | 'invert'>('none');
  const [imgRounding, setImgRounding] = useState(0);
  const [imgOpacity, setImgOpacity] = useState(100);

  // Vectorizer State
  const [vecData, setVecData] = useState<string>('');
  const [vecStyle, setVecStyle] = useState<'pixel' | 'halftone' | 'triangle'>('pixel');
  const [vecResolution, setVecResolution] = useState(50);
  const [vecColorThresh, setVecColorThresh] = useState(32);
  const vecFileRef = useRef<File | null>(null);

  const snap = (v: number) => snapToGrid ? Math.round(v / gridSize) * gridSize : Math.round(v);

  // Generate code
  useEffect(() => {
    if (editorMode === 'canvas') {
      const shapesCode = shapes.map(s => `  ${shapeToSvg(s, codeMode === 'jsx')}`).join('\n');
      
      const previewCode = previewShape ? `\n  ${shapeToSvg(previewShape, codeMode === 'jsx')}` : '';
      const currPathCode = currentPath 
        ? `\n  ${shapeToSvg({ type: 'path', d: currentPath, color: strokeColor, width: strokeWidth, dash: strokeDash, fill: useFill ? fillColor : 'none', opacity: shapeOpacity / 100 } as PathShape, codeMode === 'jsx')}`
        : '';

      const raw = `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">\n${shapesCode}${previewCode}${currPathCode}\n</svg>`;
      const jsx = `const CustomSvg = () => (\n  <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">\n${shapesCode}${previewCode}${currPathCode}\n  </svg>\n);`;

      setRawSvgCode(raw);
      setOutputCode(codeMode === 'jsx' ? jsx : raw);
    } else if (editorMode === 'image') {
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
    } else if (editorMode === 'vectorizer') {
      if (!vecData) {
        setOutputCode('// Upload an image first to generate vector SVG');
        setRawSvgCode('');
        return;
      }
      const raw = `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">\n${vecData}\n</svg>`;
      const jsx = `const VectorSvg = () => (\n  <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">\n${vecData}\n  </svg>\n);`;
      setRawSvgCode(raw);
      setOutputCode(codeMode === 'jsx' ? jsx : raw);
    }
  }, [editorMode, codeMode, shapes, currentPath, previewShape, strokeColor, strokeWidth, strokeDash, fillColor, useFill, shapeOpacity, imgData, imgFilter, imgRounding, imgOpacity, vecData]);

  // Canvas Handlers
  const getCoords = (e: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = snap(((e.clientX - rect.left) / rect.width) * 800);
    const y = snap(((e.clientY - rect.top) / rect.height) * 450);
    return { x, y };
  };

  const startDrawing = (e: React.PointerEvent) => {
    const { x, y } = getCoords(e);
    
    if (tool === 'select') {
      let found = -1;
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        if (s.type === 'rect' && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) { found = i; break; }
        if (s.type === 'circle' && Math.hypot(x - s.cx, y - s.cy) <= s.r) { found = i; break; }
        if (s.type === 'ellipse' && (((x - s.cx) ** 2) / (s.rx ** 2) + ((y - s.cy) ** 2) / (s.ry ** 2)) <= 1) { found = i; break; }
        if (s.type === 'text' && Math.abs(x - s.x) < 50 && Math.abs(y - s.y) < 20) { found = i; break; }
        if (s.type === 'polygon' && Math.hypot(x - s.cx, y - s.cy) <= s.r) { found = i; break; }
      }
      setSelectedIdx(found >= 0 ? found : null);
      return;
    }
    
    if (tool === 'text') {
      setShapes(prev => [...prev, {
        type: 'text', x, y, content: textContent, fontSize, color: strokeColor, fontWeight, opacity: shapeOpacity / 100,
      }]);
      return;
    }

    setIsDrawing(true);
    setDrawStart({ x, y });
    
    if (tool === 'brush') {
      setCurrentPath(`M ${x} ${y}`);
    } else if (tool === 'eraser') {
      eraseNear(x, y);
    }
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    
    if (tool === 'brush') {
      setCurrentPath(prev => `${prev} L ${x} ${y}`);
    } else if (tool === 'eraser') {
      eraseNear(x, y);
    } else if (tool === 'rect') {
      const rx = Math.min(drawStart.x, x);
      const ry = Math.min(drawStart.y, y);
      const rw = Math.abs(x - drawStart.x);
      const rh = Math.abs(y - drawStart.y);
      setPreviewShape({ type: 'rect', x: rx, y: ry, w: rw, h: rh, color: strokeColor, width: strokeWidth, fill: useFill ? fillColor : 'none', rx: cornerRadius, opacity: shapeOpacity / 100 });
    } else if (tool === 'circle') {
      const r = Math.round(Math.hypot(x - drawStart.x, y - drawStart.y));
      setPreviewShape({ type: 'circle', cx: drawStart.x, cy: drawStart.y, r, color: strokeColor, width: strokeWidth, fill: useFill ? fillColor : 'none', opacity: shapeOpacity / 100 });
    } else if (tool === 'ellipse') {
      const rx = Math.abs(x - drawStart.x);
      const ry = Math.abs(y - drawStart.y);
      setPreviewShape({ type: 'ellipse', cx: drawStart.x, cy: drawStart.y, rx, ry, color: strokeColor, width: strokeWidth, fill: useFill ? fillColor : 'none', opacity: shapeOpacity / 100 });
    } else if (tool === 'line') {
      setPreviewShape({ type: 'line', x1: drawStart.x, y1: drawStart.y, x2: x, y2: y, color: strokeColor, width: strokeWidth, dash: strokeDash, opacity: shapeOpacity / 100 });
    } else if (tool === 'polygon') {
      const r = Math.round(Math.hypot(x - drawStart.x, y - drawStart.y));
      setPreviewShape({ type: 'polygon', cx: drawStart.x, cy: drawStart.y, r, sides: polygonSides, color: strokeColor, width: strokeWidth, fill: useFill ? fillColor : 'none', opacity: shapeOpacity / 100 });
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (tool === 'brush' && currentPath) {
      setShapes(prev => [...prev, { type: 'path', d: currentPath, color: strokeColor, width: strokeWidth, dash: strokeDash, fill: useFill ? fillColor : 'none', opacity: shapeOpacity / 100 }]);
      setCurrentPath('');
    } else if (previewShape) {
      let hasSize = true;
      if (previewShape.type === 'rect' && (previewShape.w < 2 || previewShape.h < 2)) hasSize = false;
      if (previewShape.type === 'circle' && previewShape.r < 2) hasSize = false;
      if (previewShape.type === 'ellipse' && (previewShape.rx < 2 || previewShape.ry < 2)) hasSize = false;
      if (previewShape.type === 'line') {
        const dx = previewShape.x2 - previewShape.x1;
        const dy = previewShape.y2 - previewShape.y1;
        if (Math.hypot(dx, dy) < 2) hasSize = false;
      }
      if (previewShape.type === 'polygon' && previewShape.r < 2) hasSize = false;
      
      if (hasSize) setShapes(prev => [...prev, previewShape]);
      setPreviewShape(null);
    }
  };
  
  const eraseNear = (px: number, py: number) => {
    setShapes(prev => prev.filter(s => {
      if (s.type === 'path') {
        const points = s.d.match(/[ML]\s*([-\d.]+)\s+([-\d.]+)/g);
        if (!points) return true;
        for (const pt of points) {
          const match = pt.match(/[ML]\s*([-\d.]+)\s+([-\d.]+)/);
          if (match && Math.hypot(px - parseFloat(match[1]), py - parseFloat(match[2])) < 20) return false;
        }
      }
      if (s.type === 'rect' && px >= s.x - 10 && px <= s.x + s.w + 10 && py >= s.y - 10 && py <= s.y + s.h + 10) return false;
      if (s.type === 'circle' && Math.hypot(px - s.cx, py - s.cy) < s.r + 10) return false;
      if (s.type === 'ellipse' && (((px - s.cx) ** 2) / ((s.rx + 10) ** 2) + ((py - s.cy) ** 2) / ((s.ry + 10) ** 2)) <= 1) return false;
      if (s.type === 'line') {
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return Math.hypot(px - s.x1, py - s.y1) > 20;
        let t = ((px - s.x1) * dx + (py - s.y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const cx = s.x1 + t * dx, cy = s.y1 + t * dy;
        if (Math.hypot(px - cx, py - cy) < 20) return false;
      }
      if (s.type === 'polygon' && Math.hypot(px - s.cx, py - s.cy) < s.r + 10) return false;
      if (s.type === 'text' && Math.abs(px - s.x) < 50 && Math.abs(py - s.y) < 20) return false;
      return true;
    }));
  };
  
  const handleUndo = () => { setShapes(prev => prev.slice(0, -1)); setSelectedIdx(null); };
  const handleClear = () => { setShapes([]); setSelectedIdx(null); };
  const handleDeleteSelected = () => {
    if (selectedIdx !== null) {
      setShapes(prev => prev.filter((_, i) => i !== selectedIdx));
      setSelectedIdx(null);
    }
  };
  const handleDuplicateSelected = () => {
    if (selectedIdx !== null) {
      const s = { ...shapes[selectedIdx] };
      if ('x' in s && 'y' in s) { s.x += 20; s.y += 20; }
      if ('cx' in s && 'cy' in s) { (s as any).cx += 20; (s as any).cy += 20; }
      if ('x1' in s) { (s as any).x1 += 20; (s as any).y1 += 20; (s as any).x2 += 20; (s as any).y2 += 20; }
      setShapes(prev => [...prev, s]);
      setSelectedIdx(shapes.length);
    }
  };
  const moveSelectedLayer = (dir: 'up' | 'down') => {
    if (selectedIdx === null) return;
    setShapes(prev => {
      const arr = [...prev];
      const target = dir === 'up' ? selectedIdx + 1 : selectedIdx - 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[selectedIdx], arr[target]] = [arr[target], arr[selectedIdx]];
      setSelectedIdx(target);
      return arr;
    });
  };

  // ASCII Image Handlers
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
          const w = 80, h = 45;
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          let asciiSvg = '';
          const asciiChars = ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'];
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
              if (a < 128) continue;
              const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
              const charIdx = Math.floor(brightness * (asciiChars.length - 1));
              const px = x * 10 + 5, py = y * 10 + 8;
              asciiSvg += `      <text x="${px}" y="${py}" font-family="monospace" font-size="10" fill="currentColor" text-anchor="middle">${asciiChars[charIdx]}</text>\n`;
            }
          }
          setImgData(asciiSvg);
        };
        img.src = ev.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  // Vectorizer Handlers
  const processVectorizer = useCallback((file: File | null = vecFileRef.current) => {
    if (!file) return;
    vecFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (!ev.target?.result) return;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const imgRatio = img.width / img.height;
        const canvasRatio = 800 / 450;
        let w = vecResolution;
        let h = Math.round(w / imgRatio);
        if (imgRatio < canvasRatio) {
          h = vecResolution;
          w = Math.round(h * imgRatio);
        }
        
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        
        let svgContent = '';
        const cellW = 800 / Math.max(w, h * canvasRatio);
        const cellH = 450 / Math.max(h, w / canvasRatio);
        const offsetX = (800 - w * cellW) / 2;
        const offsetY = (450 - h * cellH) / 2;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
            if (a < 10) continue;
            
            // Quantize colors
            const t = vecColorThresh;
            const qr = Math.round(r / t) * t;
            const qg = Math.round(g / t) * t;
            const qb = Math.round(b / t) * t;
            const hex = `#${(1 << 24 | qr << 16 | qg << 8 | qb).toString(16).slice(1)}`;
            
            const px = offsetX + x * cellW;
            const py = offsetY + y * cellH;
            
            if (vecStyle === 'pixel') {
              svgContent += `  <rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${(cellW + 0.5).toFixed(1)}" height="${(cellH + 0.5).toFixed(1)}" fill="${hex}" />\n`;
            } else if (vecStyle === 'halftone') {
              const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
              const radius = (1 - brightness) * Math.min(cellW, cellH) * 0.6;
              if (radius > 0.5) {
                svgContent += `  <circle cx="${(px + cellW/2).toFixed(1)}" cy="${(py + cellH/2).toFixed(1)}" r="${radius.toFixed(1)}" fill="${hex}" />\n`;
              }
            } else if (vecStyle === 'triangle') {
              const isEven = (x + y) % 2 === 0;
              if (isEven) {
                svgContent += `  <polygon points="${px.toFixed(1)},${py.toFixed(1)} ${(px+cellW).toFixed(1)},${py.toFixed(1)} ${px.toFixed(1)},${(py+cellH).toFixed(1)}" fill="${hex}" />\n`;
                svgContent += `  <polygon points="${(px+cellW).toFixed(1)},${py.toFixed(1)} ${(px+cellW).toFixed(1)},${(py+cellH).toFixed(1)} ${px.toFixed(1)},${(py+cellH).toFixed(1)}" fill="${hex}" opacity="0.8" />\n`;
              } else {
                svgContent += `  <polygon points="${px.toFixed(1)},${py.toFixed(1)} ${(px+cellW).toFixed(1)},${(py+cellH).toFixed(1)} ${px.toFixed(1)},${(py+cellH).toFixed(1)}" fill="${hex}" />\n`;
                svgContent += `  <polygon points="${px.toFixed(1)},${py.toFixed(1)} ${(px+cellW).toFixed(1)},${py.toFixed(1)} ${(px+cellW).toFixed(1)},${(py+cellH).toFixed(1)}" fill="${hex}" opacity="0.8" />\n`;
              }
            }
          }
        }
        setVecData(svgContent);
      };
      img.src = ev.target.result as string;
    };
    reader.readAsDataURL(file);
  }, [vecResolution, vecColorThresh, vecStyle]);

  // Re-process vectorizer when settings change
  useEffect(() => {
    if (vecFileRef.current && editorMode === 'vectorizer') {
      processVectorizer();
    }
  }, [vecResolution, vecColorThresh, vecStyle, editorMode, processVectorizer]);

  const handleVecUploadEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processVectorizer(file);
  };
  
  const downloadSvgFile = () => {
    if (!rawSvgCode) return;
    const blob = new Blob([rawSvgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `motionkit-${editorMode}-${Date.now()}.svg`;
    a.click(); URL.revokeObjectURL(url);
  };

  /* ─── Render shape helper for SVG preview ─── */
  const renderShape = (s: Shape, i: number) => {
    const isSelected = selectedIdx === i;
    const outline = isSelected ? { filter: 'drop-shadow(0 0 3px rgba(99,102,241,0.8))' } : {};
    
    switch (s.type) {
      case 'path':
        return <path key={i} d={s.d} stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash !== 'none' ? s.dash : undefined} fill={s.fill !== 'none' ? s.fill : 'none'} strokeLinecap="round" strokeLinejoin="round" opacity={s.opacity} style={outline} />;
      case 'rect':
        return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} stroke={s.color} strokeWidth={s.width} fill={s.fill !== 'none' ? s.fill : 'none'} rx={s.rx} opacity={s.opacity} style={outline} />;
      case 'circle':
        return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} stroke={s.color} strokeWidth={s.width} fill={s.fill !== 'none' ? s.fill : 'none'} opacity={s.opacity} style={outline} />;
      case 'ellipse':
        return <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} stroke={s.color} strokeWidth={s.width} fill={s.fill !== 'none' ? s.fill : 'none'} opacity={s.opacity} style={outline} />;
      case 'line':
        return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash !== 'none' ? s.dash : undefined} strokeLinecap="round" opacity={s.opacity} style={outline} />;
      case 'polygon':
        return <polygon key={i} points={polygonPoints(s.cx, s.cy, s.r, s.sides)} stroke={s.color} strokeWidth={s.width} fill={s.fill !== 'none' ? s.fill : 'none'} strokeLinejoin="round" opacity={s.opacity} style={outline} />;
      case 'text':
        return <text key={i} x={s.x} y={s.y} fontSize={s.fontSize} fill={s.color} fontFamily="sans-serif" fontWeight={s.fontWeight} opacity={s.opacity} style={outline}>{s.content}</text>;
    }
  };

  const renderPreviewShape = (s: Shape) => {
    switch (s.type) {
      case 'rect':
        return <rect x={s.x} y={s.y} width={s.w} height={s.h} stroke={s.color} strokeWidth={s.width} fill={s.fill !== 'none' ? s.fill : 'none'} rx={s.rx} opacity={s.opacity * 0.6} strokeDasharray="6 4" />;
      case 'circle':
        return <circle cx={s.cx} cy={s.cy} r={s.r} stroke={s.color} strokeWidth={s.width} fill={s.fill !== 'none' ? s.fill : 'none'} opacity={s.opacity * 0.6} strokeDasharray="6 4" />;
      case 'ellipse':
        return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} stroke={s.color} strokeWidth={s.width} fill={s.fill !== 'none' ? s.fill : 'none'} opacity={s.opacity * 0.6} strokeDasharray="6 4" />;
      case 'line':
        return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth={s.width} opacity={s.opacity * 0.6} strokeDasharray="6 4" strokeLinecap="round" />;
      case 'polygon':
        return <polygon points={polygonPoints(s.cx, s.cy, s.r, s.sides)} stroke={s.color} strokeWidth={s.width} fill={s.fill !== 'none' ? s.fill : 'none'} opacity={s.opacity * 0.6} strokeDasharray="6 4" strokeLinejoin="round" />;
      default:
        return null;
    }
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
          Craft production-ready SVG components with shape tools, vectorizers, or ASCII image conversion.
        </motion.p>
      </header>

      <div className="flex flex-wrap justify-center gap-3 mb-10">
        <div className="flex gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900">
          <TabButton active={editorMode === 'canvas'} onClick={() => setEditorMode('canvas')}>Canvas Editor</TabButton>
          <TabButton active={editorMode === 'vectorizer'} onClick={() => setEditorMode('vectorizer')}>Image to SVG</TabButton>
          <TabButton active={editorMode === 'image'} onClick={() => setEditorMode('image')}>ASCII Pattern</TabButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 max-w-6xl w-full">
        {/* Preview Area */}
        <div className="flex flex-col gap-6">
          {/* Toolbar (canvas mode only) */}
          {editorMode === 'canvas' && (
            <div className="flex items-center gap-1.5 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex-wrap">
              {TOOL_LIST.map(t => (
                <ToolBtn key={t.key} active={tool === t.key} onClick={() => { setTool(t.key); setSelectedIdx(null); }} title={t.title}>
                  {ToolIcons[t.key]}
                </ToolBtn>
              ))}
              <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-700 mx-1" />
              <button onClick={handleUndo} disabled={shapes.length === 0} title="Undo"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
              </button>
              <button onClick={handleClear} disabled={shapes.length === 0} title="Clear All"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-30 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
              {selectedIdx !== null && (
                <>
                  <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-700 mx-1" />
                  <button onClick={handleDeleteSelected} title="Delete Selected"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  <button onClick={handleDuplicateSelected} title="Duplicate Selected"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  <button onClick={() => moveSelectedLayer('up')} title="Move Forward"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
                  </button>
                  <button onClick={() => moveSelectedLayer('down')} title="Move Backward"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>
                  </button>
                </>
              )}
              <div className="flex-1" />
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">{shapes.length} shape{shapes.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          <div
            className="w-full rounded-3xl shadow-xl border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden bg-neutral-50 dark:bg-[#111] relative select-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:20px_20px] flex-shrink-0"
            style={{ paddingBottom: '56.25%', height: 0, overflow: 'hidden', position: 'relative' }}
          >
            {editorMode === 'canvas' ? (
              <svg 
                ref={svgRef}
                viewBox="0 0 800 450" 
                preserveAspectRatio="none"
                className={`touch-none ${tool === 'select' ? 'cursor-default' : tool === 'eraser' ? 'cursor-cell' : tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
                style={{ transition: 'none', willChange: 'auto', position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', overflow: 'hidden' }}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={endDrawing}
                onPointerLeave={endDrawing}
              >
                {/* Grid lines when snap is on */}
                {snapToGrid && (
                  <g opacity="0.15">
                    {Array.from({ length: Math.floor(800 / gridSize) }, (_, i) => (
                      <line key={`vg${i}`} x1={(i + 1) * gridSize} y1="0" x2={(i + 1) * gridSize} y2="450" stroke="currentColor" strokeWidth="0.5" />
                    ))}
                    {Array.from({ length: Math.floor(450 / gridSize) }, (_, i) => (
                      <line key={`hg${i}`} x1="0" y1={(i + 1) * gridSize} x2="800" y2={(i + 1) * gridSize} stroke="currentColor" strokeWidth="0.5" />
                    ))}
                  </g>
                )}
                {shapes.map((s, i) => renderShape(s, i))}
                {currentPath && (
                  <path d={currentPath} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDash !== 'none' ? strokeDash : undefined} fill={useFill ? fillColor : 'none'} strokeLinecap="round" strokeLinejoin="round" opacity={shapeOpacity / 100} />
                )}
                {previewShape && renderPreviewShape(previewShape)}
              </svg>
            ) : editorMode === 'image' ? (
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
            ) : (
              <svg viewBox="0 0 800 450" className="w-full h-full pointer-events-none absolute inset-0">
                  {vecData ? (
                    <g dangerouslySetInnerHTML={{ __html: vecData }} />
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
            {editorMode === 'vectorizer' && !vecData && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-neutral-400 dark:text-neutral-500 font-medium px-4 py-2 bg-white/50 dark:bg-black/50 rounded-full backdrop-blur-md shadow-sm">Upload an image to convert to SVG vectors</span>
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
                <h3 className="font-bold dark:text-white text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Shape Properties
                </h3>

                {/* Colors */}
                <div className="flex items-center gap-4 flex-wrap">
                  <ColorInput label="Stroke" value={strokeColor} onChange={setStrokeColor} />
                  <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer">
                    <input type="checkbox" checked={useFill} onChange={e => setUseFill(e.target.checked)}
                      className="rounded" />
                    Fill
                  </label>
                  {useFill && <ColorInput label="" value={fillColor} onChange={setFillColor} />}
                </div>

                <Slider label="Stroke Width" value={strokeWidth} onChange={setStrokeWidth} min={1} max={40} unit="px" />
                <Slider label="Opacity" value={shapeOpacity} onChange={setShapeOpacity} min={10} max={100} unit="%" />

                {/* Stroke style */}
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Stroke Style</p>
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

                {/* Conditional controls per tool */}
                {(tool === 'rect') && (
                  <Slider label="Corner Radius" value={cornerRadius} onChange={setCornerRadius} min={0} max={100} unit="px" />
                )}

                {tool === 'polygon' && (
                  <Slider label="Sides" value={polygonSides} onChange={setPolygonSides} min={3} max={12} />
                )}

                {tool === 'text' && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">Text Content</p>
                      <input type="text" value={textContent} onChange={e => setTextContent(e.target.value)}
                         className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none focus:border-indigo-500 transition-colors dark:text-white" />
                    </div>
                    <Slider label="Font Size" value={fontSize} onChange={setFontSize} min={8} max={120} unit="px" />
                    <div className="flex gap-2">
                      <button onClick={() => setFontWeight('normal')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${fontWeight === 'normal' ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                        Normal
                      </button>
                      <button onClick={() => setFontWeight('bold')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${fontWeight === 'bold' ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                        Bold
                      </button>
                    </div>
                  </div>
                )}

                {/* Grid Snap */}
                <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <input type="checkbox" checked={snapToGrid} onChange={e => setSnapToGrid(e.target.checked)} className="rounded" />
                  Snap to Grid ({gridSize}px)
                </label>

                {/* Selection info */}
                {selectedIdx !== null && (
                  <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 text-xs text-indigo-600 dark:text-indigo-400">
                    <strong>Selected:</strong> {shapes[selectedIdx]?.type} (layer {selectedIdx + 1}/{shapes.length})
                    <br />
                    <span className="text-[10px] opacity-70">Use toolbar buttons to delete, duplicate, or reorder.</span>
                  </div>
                )}
              </motion.div>
            ) : editorMode === 'image' ? (
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
            ) : (
              <motion.div key="vec-ctrls" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-6">
                <h3 className="font-bold dark:text-white text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  SVG Vectorizer
                </h3>

                <div className="flex flex-col gap-2 p-4 bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800 border-dashed relative">
                  <input type="file" accept="image/*" onChange={handleVecUploadEvent}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="text-center pointer-events-none">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Click to Upload Image</p>
                    <p className="text-[10px] text-neutral-400">Converts image to real SVG polygons/paths</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Vector Style</p>
                  <div className="flex gap-2">
                    {(['pixel', 'halftone', 'triangle'] as const).map(s => (
                      <button key={s} onClick={() => setVecStyle(s)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                          vecStyle === s
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Slider label="Resolution" value={vecResolution} onChange={setVecResolution} min={10} max={100} unit=" blocks" />
                  <Slider label="Color Quantization" value={vecColorThresh} onChange={setVecColorThresh} min={1} max={64} unit=" steps" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 dark:border-indigo-500/10">
            <h4 className="text-sm font-bold mb-1 dark:text-white">💡 Pro Tip</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {editorMode === 'canvas'
                ? 'Use the toolbar to switch between shapes. Click and drag to draw rectangles, circles, ellipses, lines, and polygons. Use the Select tool to pick shapes, then delete, duplicate, or reorder them.'
                : editorMode === 'image'
                ? 'Upload an image to convert it into an ASCII art SVG pattern. This uses the <text> element.'
                : 'The Vectorizer actually draws hundreds of <rect>, <circle>, or <polygon> elements to recreate your image using scalable vector graphics!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
