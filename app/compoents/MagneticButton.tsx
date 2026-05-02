"use client";

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function MagneticButton({ trigger }: { trigger?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Magnetic pull strength (0.5 means follow 50%)
    const strength = 0.4;
    x.set((clientX - centerX) * strength);
    y.set((clientY - centerY) * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className="relative flex items-center justify-center"
    >
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="relative px-8 py-4 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black font-bold text-lg shadow-2xl overflow-hidden group"
      >
        <span className="relative z-10 transition-colors duration-300">Magnetic</span>
        
        {/* Radial highlight */}
        <motion.div 
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_var(--x)_var(--y),rgba(255,255,255,0.4),transparent_50%)] dark:bg-[radial-gradient(circle_at_var(--x)_var(--y),rgba(0,0,0,0.2),transparent_50%)] pointer-events-none"
          style={{
             // @ts-ignore
             '--x': '50%',
             '--y': '50%'
          }}
        />
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.button>
    </motion.div>
  );
}
