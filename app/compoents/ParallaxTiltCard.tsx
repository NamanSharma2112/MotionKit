"use client";

import React, { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, useMotionTemplate } from 'framer-motion';

type Spring = { stiffness?: number; damping?: number; mass?: number; visualDuration?: number; bounce?: number };

export default function ParallaxTiltCard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  trigger,
  maxTilt = 17.5,
  glare = true,
  title = "3D parallax",
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
        className="group relative aspect-square rounded-2xl bg-white p-8 transition-shadow duration-200 ease-out [--glare:rgba(255,255,255,0.5)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(0,0,0,0.16)] dark:bg-neutral-800 dark:[--glare:rgba(255,255,255,0.06)] dark:hover:shadow-[0_2px_4px_rgba(0,0,0,0.3),0_16px_32px_-12px_rgba(0,0,0,0.6)]"
      >
        <div
          style={{ transform: "translateZ(20px)" }}
          className="flex h-full flex-col items-center justify-center text-center"
        >
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-black/[0.04] dark:bg-white/[0.06]">
            {/* Three axes: the card moves in depth */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-neutral-900 dark:text-white"><path d="M5 3v16h16"/><path d="m5 19 6-6"/><path d="m2 6 3-3 3 3"/><path d="m18 16 3 3-3 3"/></svg>
          </div>
          <h4 className="mb-1.5 text-xl font-semibold tracking-[-0.02em] text-neutral-900 text-balance dark:text-white">{title}</h4>
          <p className="text-sm leading-relaxed text-neutral-500 text-balance dark:text-neutral-400">{description}</p>
        </div>

        {/* Glare: only while the pointer is over the card, so it never washes out the text at rest */}
        {glare && (
          <motion.div
            aria-hidden
            style={{
              transform: "translateZ(1px)",
              background: glareBackground,
            }}
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100"
          />
        )}
      </motion.div>
    </div>
  );
}
