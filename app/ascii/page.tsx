"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ─── */
type AnimationType = 'wave' | 'typewriter' | 'rain' | 'pulse' | 'cascade' | 'glitch' | 'spiral' | 'explode';

interface AsciiChar {
  char: string;
  x: number;
  y: number;
  brightness: number;
  index: number;
}

/* ─── ASCII Character Sets ─── */
const CHAR_SETS: Record<string, string[]> = {
  standard: ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'],
  blocks: ['█', '▓', '▒', '░', '·', ' '],
  minimal: ['#', '=', '-', '.', ' '],
  binary: ['1', '0'],
  dots: ['●', '◉', '◎', '○', '·'],
  braille: ['⣿', '⣷', '⣯', '⣟', '⡿', '⢿', '⣻', '⣽', '⣾', '⠀'],
};

/* ─── Small UI Components ─── */
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

/* ─── Animation Presets ─── */
const ANIMATIONS: { key: AnimationType; label: string; icon: string; desc: string }[] = [
  { key: 'wave', label: 'Wave', icon: '🌊', desc: 'Characters wave up and down' },
  { key: 'typewriter', label: 'Typewriter', icon: '⌨️', desc: 'Sequential character reveal' },
  { key: 'rain', label: 'Matrix Rain', icon: '🟢', desc: 'Falling digital rain effect' },
  { key: 'pulse', label: 'Pulse', icon: '💫', desc: 'Breathing scale animation' },
  { key: 'cascade', label: 'Cascade', icon: '🌈', desc: 'Staggered diagonal fade-in' },
  { key: 'glitch', label: 'Glitch', icon: '⚡', desc: 'Random character scrambling' },
  { key: 'spiral', label: 'Spiral', icon: '🌀', desc: 'Spiral reveal from center' },
  { key: 'explode', label: 'Explode', icon: '💥', desc: 'Characters scatter and reform' },
];

/* ─── Animated ASCII Canvas ─── */
function AsciiCanvas({
  chars,
  animation,
  speed,
  fontSize,
  colorMode,
  color,
  cols,
}: {
  chars: AsciiChar[];
  animation: AnimationType;
  speed: number;
  fontSize: number;
  colorMode: 'mono' | 'brightness' | 'custom';
  color: string;
  cols: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const glitchRef = useRef<string[]>([]);

  // Initialize glitch characters
  useEffect(() => {
    const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    glitchRef.current = glitchChars.split('');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chars.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    canvas.width = pw * dpr;
    canvas.height = ph * dpr;
    ctx.scale(dpr, dpr);

    startRef.current = performance.now();

    const getCharColor = (brightness: number): string => {
      if (colorMode === 'custom') return color;
      if (colorMode === 'mono') return '#e0e0e0';
      // brightness mode - map to a color gradient
      const h = 200 + brightness * 160; // blue to pink
      const s = 70 + brightness * 30;
      const l = 30 + brightness * 50;
      return `hsl(${h}, ${s}%, ${l}%)`;
    };

    const rows = Math.max(...chars.map(c => c.y)) + 1;
    const cellW = pw / cols;
    const cellH = ph / rows;

    const loop = () => {
      const t = ((performance.now() - startRef.current) / 1000) * speed;
      ctx.clearRect(0, 0, pw, ph);
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const c of chars) {
        const px = c.x * cellW + cellW / 2;
        const py = c.y * cellH + cellH / 2;
        let drawX = px;
        let drawY = py;
        let alpha = 1;
        let scale = 1;
        let drawChar = c.char;

        switch (animation) {
          case 'wave': {
            const offset = Math.sin(t * 2 + c.x * 0.3 + c.y * 0.1) * 4;
            drawY += offset;
            alpha = 0.6 + 0.4 * Math.sin(t * 1.5 + c.index * 0.05);
            break;
          }
          case 'typewriter': {
            const revealIdx = Math.floor(t * 40) % (chars.length + 60);
            if (c.index > revealIdx) {
              alpha = 0;
            } else if (c.index > revealIdx - 5) {
              alpha = 1;
              scale = 1.3 - (revealIdx - c.index) * 0.06;
            }
            break;
          }
          case 'rain': {
            const colSpeed = (((c.x * 7 + 13) % 17) / 17) * 0.5 + 0.5;
            const yOffset = (t * 30 * colSpeed + c.y * 15 + c.x * 50) % (ph + 40) - 20;
            drawY = yOffset;
            alpha = Math.max(0, 1 - (yOffset / ph) * 0.8);
            if (Math.random() < 0.02) drawChar = glitchRef.current[Math.floor(Math.random() * glitchRef.current.length)];
            break;
          }
          case 'pulse': {
            const pulsePhase = Math.sin(t * 2 + c.x * 0.2 + c.y * 0.15);
            scale = 0.7 + 0.5 * pulsePhase;
            alpha = 0.5 + 0.5 * pulsePhase;
            break;
          }
          case 'cascade': {
            const diagDist = (c.x + c.y) * 0.15;
            const cascadeT = (t * 3) % (cols * 0.3 + rows * 0.3 + 4);
            const reveal = cascadeT - diagDist;
            if (reveal < 0) {
              alpha = 0;
            } else if (reveal < 1) {
              alpha = reveal;
              scale = 0.5 + reveal * 0.5;
              drawY += (1 - reveal) * 10;
            }
            break;
          }
          case 'glitch': {
            if (Math.random() < 0.03) {
              drawChar = glitchRef.current[Math.floor(Math.random() * glitchRef.current.length)];
              drawX += (Math.random() - 0.5) * 6;
              drawY += (Math.random() - 0.5) * 4;
            }
            // Occasional horizontal shift for entire rows
            if (Math.random() < 0.005) {
              drawX += (Math.random() - 0.5) * 30;
            }
            // Color glitch
            if (Math.random() < 0.01) {
              alpha = 0.3 + Math.random() * 0.7;
            }
            break;
          }
          case 'spiral': {
            const cx = cols / 2;
            const cy = rows / 2;
            const dist = Math.hypot(c.x - cx, c.y - cy);
            const angle = Math.atan2(c.y - cy, c.x - cx);
            const spiralT = (t * 2) % (Math.max(cols, rows) * 0.8 + 3);
            const reveal = spiralT - dist * 0.3 + Math.sin(angle * 3) * 0.5;
            if (reveal < 0) {
              alpha = 0;
            } else if (reveal < 1.5) {
              alpha = reveal / 1.5;
              const spin = (1.5 - reveal) * 0.5;
              drawX += Math.cos(angle + spin * 6) * (1.5 - reveal) * 8;
              drawY += Math.sin(angle + spin * 6) * (1.5 - reveal) * 8;
              scale = 0.3 + (reveal / 1.5) * 0.7;
            }
            break;
          }
          case 'explode': {
            const cx2 = pw / 2;
            const cy2 = ph / 2;
            const dx = drawX - cx2;
            const dy = drawY - cy2;
            const cycleT = (t * 0.8) % 4;
            if (cycleT < 2) {
              // explode out
              const progress = cycleT / 2;
              const eased = progress * progress;
              drawX = cx2 + dx * (1 + eased * 3);
              drawY = cy2 + dy * (1 + eased * 3);
              alpha = 1 - eased;
              scale = 1 + eased * 0.5;
            } else {
              // reform
              const progress = (cycleT - 2) / 2;
              const eased = 1 - (1 - progress) * (1 - progress);
              drawX = cx2 + dx * (4 - eased * 3);
              drawY = cy2 + dy * (4 - eased * 3);
              alpha = eased;
              scale = 1.5 - eased * 0.5;
            }
            break;
          }
        }

        if (alpha <= 0) continue;

        const charColor = getCharColor(c.brightness);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.scale(scale, scale);
        ctx.fillStyle = charColor;
        // Make text bolder for better clarity
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillText(drawChar, 0, 0);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(rafRef.current);
  }, [chars, animation, speed, fontSize, colorMode, color, cols]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        position: 'absolute',
        inset: 0,
        transition: 'none',
      }}
    />
  );
}

/* ─── Main Page ─── */
export default function AsciiAnimatorPage() {
  const [asciiChars, setAsciiChars] = useState<AsciiChar[]>([]);
  const [animation, setAnimation] = useState<AnimationType>('wave');
  const [speed, setSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(10);
  const [resolution, setResolution] = useState(120);
  const [charSet, setCharSet] = useState<string>('standard');
  const [colorMode, setColorMode] = useState<'mono' | 'brightness' | 'custom'>('brightness');
  const [customColor, setCustomColor] = useState('#00ff88');
  const [imageName, setImageName] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [key, setKey] = useState(0); // force re-mount
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback((file: File) => {
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (!ev.target?.result) return;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cols = resolution;
        const rows = Math.round((img.height / img.width) * cols * 0.5);
        canvas.width = cols;
        canvas.height = rows;
        ctx.drawImage(img, 0, 0, cols, rows);
        const data = ctx.getImageData(0, 0, cols, rows).data;
        const chars = CHAR_SETS[charSet];

        // Find min and max brightness for contrast normalization
        let minB = 1, maxB = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 64) continue;
          const b = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
          if (b < minB) minB = b;
          if (b > maxB) maxB = b;
        }
        if (maxB === minB) maxB = minB + 0.1;

        const asciiData: AsciiChar[] = [];
        let idx = 0;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 64) continue;
            let brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            
            // Normalize brightness to [0, 1] for better clarity
            brightness = (brightness - minB) / (maxB - minB);
            
            const charIdx = Math.floor((1 - brightness) * (chars.length - 1));
            asciiData.push({
              char: chars[Math.min(charIdx, chars.length - 1)],
              x,
              y,
              brightness,
              index: idx++,
            });
          }
        }
        setAsciiChars(asciiData);
        setKey(k => k + 1);
      };
      img.src = ev.target.result as string;
    };
    reader.readAsDataURL(file);
  }, [resolution, charSet]);

  // Re-process if settings change and we have an image
  const lastFileRef = useRef<File | null>(null);
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    lastFileRef.current = file;
    processImage(file);
  };

  // Re-process when resolution or charset changes
  useEffect(() => {
    if (lastFileRef.current) {
      processImage(lastFileRef.current);
    }
  }, [resolution, charSet, processImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      lastFileRef.current = file;
      processImage(file);
    }
  }, [processImage]);

  const handleReplay = () => {
    setKey(k => k + 1);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen p-6 sm:p-12 lg:p-20 flex flex-col items-center transition-colors">
      {/* Header */}
      <header className="max-w-4xl w-full text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-bold mb-4 dark:text-white">
          ASCII Animator
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          className="text-neutral-500 dark:text-neutral-400 text-lg">
          Transform any image into stunning animated ASCII art with 8 unique animation styles.
        </motion.p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 max-w-6xl w-full">
        {/* Preview */}
        <div className="flex flex-col gap-6">
          {/* Canvas */}
          <div
            className="w-full rounded-3xl shadow-2xl border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden bg-[#0a0a0f] relative select-none flex-shrink-0"
            style={{ paddingBottom: '56.25%', height: 0, position: 'relative' }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            {asciiChars.length > 0 && isPlaying ? (
              <AsciiCanvas
                key={key}
                chars={asciiChars}
                animation={animation}
                speed={speed}
                fontSize={fontSize}
                colorMode={colorMode}
                color={customColor}
                cols={resolution}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="text-6xl opacity-30">⬆</div>
                <p className="text-neutral-500 text-sm font-medium">
                  {asciiChars.length > 0 ? 'Paused — click Play to resume' : 'Drop an image or click Upload to start'}
                </p>
              </div>
            )}

            {/* Overlay controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsPlaying(p => !p)}
                  className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white text-xs font-medium hover:bg-black/70 transition-all cursor-pointer">
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button onClick={handleReplay}
                  className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white text-xs font-medium hover:bg-black/70 transition-all cursor-pointer">
                  ↻ Replay
                </button>
              </div>
              {imageName && (
                <span className="px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white/70 text-[11px] font-mono">
                  {imageName}
                </span>
              )}
            </div>
          </div>

          {/* Animation Type Grid */}
          <div className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-bold dark:text-white text-sm mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              Animation Style
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ANIMATIONS.map(a => (
                <button
                  key={a.key}
                  onClick={() => { setAnimation(a.key); setKey(k => k + 1); }}
                  className={`p-3 rounded-xl text-left transition-all ${
                    animation === a.key
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-lg scale-[1.02]'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:scale-[1.02]'
                  }`}
                >
                  <span className="text-lg block mb-1">{a.icon}</span>
                  <span className="text-xs font-semibold block">{a.label}</span>
                  <span className={`text-[10px] block mt-0.5 ${animation === a.key ? 'opacity-70' : 'text-neutral-400 dark:text-neutral-500'}`}>{a.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6">
          {/* Upload */}
          <div
            className="p-6 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 relative hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🖼️</div>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                {imageName ? 'Change Image' : 'Upload Image'}
              </p>
              <p className="text-[10px] text-neutral-400">JPG, PNG, GIF, WebP — or drag & drop onto canvas</p>
            </div>
          </div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-5"
          >
            <h3 className="font-bold dark:text-white text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Settings
            </h3>

            <Slider label="Speed" value={speed} onChange={setSpeed} min={0.1} max={3} step={0.1} unit="x" />
            <Slider label="Font Size" value={fontSize} onChange={setFontSize} min={4} max={24} unit="px" />
            <Slider label="Resolution" value={resolution} onChange={setResolution} min={20} max={300} unit=" cols" />

            {/* Character Set */}
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Character Set</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(CHAR_SETS).map(k => (
                  <button key={k} onClick={() => setCharSet(k)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium capitalize transition-all ${
                      charSet === k
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                    }`}>
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Mode */}
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Color Mode</p>
              <div className="flex gap-2">
                {(['mono', 'brightness', 'custom'] as const).map(m => (
                  <button key={m} onClick={() => setColorMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      colorMode === m
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
              {colorMode === 'custom' && (
                <div className="mt-3 flex items-center gap-3">
                  <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-neutral-300 dark:border-neutral-600 cursor-pointer bg-transparent p-0" />
                  <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 uppercase">{customColor}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Tips */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 dark:border-purple-500/10">
            <h4 className="text-sm font-bold mb-1 dark:text-white">✨ Tips</h4>
            <ul className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed space-y-1">
              <li>• High-contrast images produce the best ASCII art</li>
              <li>• Lower resolution = faster animation, higher = more detail</li>
              <li>• Try <strong className="text-purple-400">blocks</strong> charset with <strong className="text-purple-400">explode</strong> animation</li>
              <li>• Use <strong className="text-purple-400">brightness</strong> color mode for vibrant gradients</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
