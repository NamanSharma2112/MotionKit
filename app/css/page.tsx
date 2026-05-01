"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function CSSPlaygroundPage() {
  const [borderRadius, setBorderRadius] = useState(16);
  const [rotate, setRotate] = useState(0);
  const [scale, setScale] = useState(1);
  const [blur, setBlur] = useState(0);

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a] font-sans text-neutral-900 dark:text-white flex flex-col">
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors">
          &larr; Back to Home
        </Link>
        <h1 className="text-sm font-medium">CSS Playground</h1>
      </header>
      
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Controls */}
        <div className="flex flex-col gap-6 p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Properties</h2>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium flex justify-between">
              Border Radius <span>{borderRadius}px</span>
            </label>
            <input 
              type="range" min="0" max="100" value={borderRadius} 
              onChange={(e) => setBorderRadius(Number(e.target.value))}
              className="accent-black dark:accent-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium flex justify-between">
              Rotate <span>{rotate}deg</span>
            </label>
            <input 
              type="range" min="-180" max="180" value={rotate} 
              onChange={(e) => setRotate(Number(e.target.value))}
              className="accent-black dark:accent-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium flex justify-between">
              Scale <span>{scale}x</span>
            </label>
            <input 
              type="range" min="0.5" max="2" step="0.1" value={scale} 
              onChange={(e) => setScale(Number(e.target.value))}
              className="accent-black dark:accent-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium flex justify-between">
              Blur <span>{blur}px</span>
            </label>
            <input 
              type="range" min="0" max="20" value={blur} 
              onChange={(e) => setBlur(Number(e.target.value))}
              className="accent-black dark:accent-white"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center h-[400px] bg-neutral-200/50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden relative">
          {/* Grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          <div 
            className="w-48 h-48 bg-gradient-to-tr from-blue-500 to-purple-500 shadow-xl transition-all duration-75 flex items-center justify-center text-white font-medium relative z-10"
            style={{
              borderRadius: `${borderRadius}px`,
              transform: `rotate(${rotate}deg) scale(${scale})`,
              filter: `blur(${blur}px)`
            }}
          >
            Play with me!
          </div>
        </div>
      </div>
    </main>
  );
}
