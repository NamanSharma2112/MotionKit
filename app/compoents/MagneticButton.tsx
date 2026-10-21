"use client";

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

type Spring = { stiffness?: number; damping?: number; mass?: number; visualDuration?: number; bounce?: number };

export default function MagneticButton({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  trigger,
  strength = 0.4,
  label = "Magnetic",
  spring = { damping: 15, stiffness: 150, mass: 0.1 },
}: {
  trigger?: number;
  /** How far the button follows the cursor (0 = not at all, 1 = fully). */
  strength?: number;
  label?: string;
  /** Spring used when the button chases the cursor. */
  spring?: Spring;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, spring);
  const springY = useSpring(y, spring);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    // Reduced motion: keep the highlight, skip the pull.
    if (!reduceMotion) {
      x.set((clientX - centerX) * strength);
      y.set((clientY - centerY) * strength);
    }

    // Let the highlight sit under the cursor.
    const button = buttonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      button.style.setProperty('--x', `${clientX - rect.left}px`);
      button.style.setProperty('--y', `${clientY - rect.top}px`);
    }
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
        ref={buttonRef}
        type="button"
        whileTap={{ scale: 0.97 }}
        style={{ '--x': '50%', '--y': '50%' } as React.CSSProperties}
        className="relative h-14 overflow-hidden rounded-full bg-neutral-900 px-8 text-[17px] font-medium tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.16),0_8px_24px_-8px_rgba(0,0,0,0.35)] outline-none focus-visible:ring-2 focus-visible:ring-[#1f6bff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-white dark:text-neutral-900 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_-8px_rgba(0,0,0,0.6)] dark:focus-visible:ring-offset-neutral-900"
      >
        <span className="relative z-10">{label}</span>

        {/* Radial highlight that follows the cursor */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80px_circle_at_var(--x)_var(--y),rgba(255,255,255,0.18),transparent_70%)] dark:bg-[radial-gradient(80px_circle_at_var(--x)_var(--y),rgba(0,0,0,0.08),transparent_70%)]"
        />
      </motion.button>
    </motion.div>
  );
}
