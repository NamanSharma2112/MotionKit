"use client";

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';

export default function ParallaxTiltCard({ trigger }: { trigger?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="perspective-[1000px] w-full max-w-[280px]">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateY,
          rotateX,
          transformStyle: "preserve-3d",
        }}
        className="relative aspect-square rounded-[2rem] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 shadow-2xl cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <div 
          style={{ transform: "translateZ(20px)" }}
          className="flex flex-col items-center justify-center h-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-900 dark:text-white"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
          </div>
          <h4 className="text-xl font-bold mb-2 uppercase tracking-tight text-neutral-900 dark:text-white">3D PARALLAX</h4>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Tilt your device or move your mouse to explore the depth.</p>
        </div>

        {/* Glare effect */}
        <motion.div 
          style={{
            transform: "translateZ(1px)",
            background: useMotionTemplate`radial-gradient(circle at ${useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"])} ${useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"])}, rgba(255,255,255,0.25) 0%, transparent 80%)`,
          }}
          className="absolute inset-0 pointer-events-none rounded-[2rem]"
        />
      </motion.div>
    </div>
  );
}
