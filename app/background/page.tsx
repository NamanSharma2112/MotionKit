"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function BackgroundPage() {
  const [type, setType] = useState<'gradient' | 'grid'>('gradient');
  const [currentStyle, setCurrentStyle] = useState('bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500');

  const gradients = [
    { name: 'Sunset', class: 'bg-linear-to-br from-orange-500 to-pink-500' },
    { name: 'Ocean', class: 'bg-linear-to-br from-blue-400 to-emerald-400' },
    { name: 'Midnight', class: 'bg-linear-to-br from-slate-900 via-purple-900 to-slate-900' },
    { name: 'Cyberpunk', class: 'bg-linear-to-br from-fuchsia-600 to-purple-600' },
    { name: 'Candy', class: 'bg-linear-to-br from-pink-300 via-purple-300 to-indigo-400' },
  ];

  const grids = [
    { name: 'Small Dot', class: 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)]' },
    { name: 'Large Dot', class: 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)]' },
    { name: 'Square Grid', class: 'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [background-size:24px_24px]' },
    { name: 'Blueprint', class: 'bg-blue-600 bg-[linear-gradient(rgba(255,255,255,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.2)_1px,transparent_1px)] [background-size:20px_20px]' },
  ];

  return (
    <div className="min-h-screen p-8 sm:p-20 flex flex-col items-center bg-white dark:bg-[#0a0a0a] transition-colors">
      <header className="max-w-4xl w-full text-center mb-16">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">Background Playground</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Experiment with gradients and grids to craft the perfect backdrop.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl w-full">
        {/* Preview Area */}
        <div className="flex flex-col gap-6">
          <motion.div 
            className={`w-full aspect-video rounded-3xl shadow-2xl transition-all duration-700 bg-white dark:bg-neutral-950 ${currentStyle}`}
          />
          <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-bold mb-4 dark:text-white">CSS Output</h3>
            <pre className="bg-neutral-100 dark:bg-neutral-950 p-4 rounded-xl text-sm font-mono text-neutral-600 dark:text-neutral-300 overflow-x-auto">
              <code>{`.custom-bg {
  @apply ${currentStyle};
}`}</code>
            </pre>
          </div>
        </div>

        {/* Controls Area */}
        <div className="flex flex-col gap-8">
          <section>
            <h3 className="font-bold mb-4 dark:text-white">Gradients</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {gradients.map((g) => (
                <button
                  key={g.name}
                  onClick={() => { setType('gradient'); setCurrentStyle(g.class); }}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    currentStyle === g.class 
                      ? 'border-neutral-900 dark:border-white shadow-lg' 
                      : 'border-transparent bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className={`w-full h-8 rounded-md mb-2 ${g.class}`} />
                  <span className="text-xs font-medium dark:text-white">{g.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-bold mb-4 dark:text-white">Grids</h3>
            <div className="grid grid-cols-2 gap-4">
              {grids.map((g) => (
                <button
                  key={g.name}
                  onClick={() => { setType('grid'); setCurrentStyle(g.class); }}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    currentStyle === g.class 
                      ? 'border-neutral-900 dark:border-white shadow-lg' 
                      : 'border-transparent bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className={`w-full h-8 rounded-md mb-2 border border-neutral-200 dark:border-neutral-800 ${g.class}`} />
                  <span className="text-xs font-medium dark:text-white">{g.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center text-center">
            <h4 className="text-xl font-bold mb-2">Extract & Play</h4>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              Select a preset above to see the CSS output and use it in your project.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
