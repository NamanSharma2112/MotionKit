"use client";

import React, { useRef } from 'react';
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
  const reduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, spring);
  const springY = useSpring(y, spring);

  const handlePointerMove = (e: React.PointerEvent) => {
    // Only a mouse pulls the button; a tap on a touch screen shouldn't make it jump.
    // Reduced motion: skip the pull, the hover colour still responds.
    if (!ref.current || e.pointerType !== 'mouse' || reduceMotion) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * strength);
    y.set((clientY - centerY) * strength);
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ x: springX, y: springY }}
      className="relative flex items-center justify-center"
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
        className="h-14 rounded-full bg-neutral-900 px-8 text-[17px] font-medium tracking-[-0.01em] text-white outline-none transition-colors duration-150 ease-out hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-[#1f6bff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 dark:focus-visible:ring-offset-neutral-900"
      >
        {label}
      </motion.button>
    </motion.div>
  );
}
