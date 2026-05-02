"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';

export default function AnimatedCounter({ trigger }: { trigger?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-100px" });
  const [count, setCount] = useState(0);

  const startAnimation = () => {
    const node = ref.current;
    if (node) {
      animate(0, 2500, {
        duration: 2.5,
        ease: [0.22, 1, 0.36, 1],
        onUpdate(value) {
          node.textContent = Math.round(value).toLocaleString();
        }
      });
    }
  };

  useEffect(() => {
    if (isInView) {
      startAnimation();
    }
  }, [isInView]);

  useEffect(() => {
    if (trigger && trigger > 0) {
      startAnimation();
    }
  }, [trigger]);

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="flex items-baseline gap-2">
        <span 
          ref={ref}
          className="text-6xl font-semibold text-neutral-900 dark:text-white tracking-tight"
        >
          0
        </span>
        <span className="text-2xl font-semibold text-blue-500">{"\u002B"}</span>
      </div>
      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
        Projects Completed
      </p>
      
      {/* Decorative pulse */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-24 h-1 bg-blue-500 rounded-full blur-sm mt-4"
      />
    </div>
  );
}
