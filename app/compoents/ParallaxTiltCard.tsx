"use client";

import React, { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, useMotionTemplate } from 'framer-motion';

type Spring = { stiffness?: number; damping?: number; mass?: number; visualDuration?: number; bounce?: number };

export default function ParallaxTiltCard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  trigger,
  maxTilt = 17.5,
  glare = true,
  title = "3D PARALLAX",
  description = "Tilt your device or move your mouse to explore the depth.",
  spring = { stiffness: 100, damping: 10, mass: 1 },
}: {
  trigger?: number;
  /** Maximum rotation in degrees. */
  maxTilt?: number;
  glare?: boolean;
  title?: string;
  description?: string;
  /** Spring that smooths the tilt as the pointer moves. */
  spring?: Spring;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const tilt = reduceMotion ? 0 : maxTilt;

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, spring);
  const mouseYSpring = useSpring(y, spring);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${tilt}deg`, `-${tilt}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${tilt}deg`, `${tilt}deg`]);

  // Glare position (hooks stay at the top level, whether or not glare is shown).
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, var(--glare) 0%, transparent 65%)`;

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
        className="relative aspect-square overflow-hidden rounded-[20px] border border-black/[0.07] bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.18)] [--glare:rgba(255,255,255,0.5)] dark:border-white/10 dark:bg-neutral-900 dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_12px_32px_-12px_rgba(0,0,0,0.6)] dark:[--glare:rgba(255,255,255,0.06)]"
      >
        <div
          style={{ transform: "translateZ(20px)" }}
          className="flex h-full flex-col items-center justify-center text-center"
        >
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-black/[0.06] bg-neutral-50 dark:border-white/10 dark:bg-neutral-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-neutral-900 dark:text-white"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
          </div>
          <h4 className="mb-1.5 text-xl font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">{title}</h4>
          <p className="text-sm leading-relaxed text-neutral-500 text-balance dark:text-neutral-400">{description}</p>
        </div>

        {/* Glare effect */}
        {glare && (
          <motion.div
            aria-hidden
            style={{
              transform: "translateZ(1px)",
              background: glareBackground,
            }}
            className="pointer-events-none absolute inset-0 rounded-[20px]"
          />
        )}
      </motion.div>
    </div>
  );
}
