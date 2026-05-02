"use client";

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';

export default function SpotlightCard({ trigger }: { trigger?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  const background = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(59, 130, 246, 0.15), transparent 80%)`;

  return (
    <div 
      className="group relative h-full w-full overflow-hidden rounded-[2rem] bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col items-center justify-center text-center"
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2rem] transition duration-300 group-hover:opacity-100"
        style={{
          background,
          opacity: 0
        }}
      />
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 shadow-sm">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="9" cy="15" r="1"/></svg>
        </div>
        <h3 className="text-xl font-bold dark:text-white mb-2">Spotlight Interaction</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[200px]">Move your mouse around to reveal the hidden depths of this card.</p>
        
        <div className="mt-6 flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
        </div>
      </div>
    </div>
  );
}
