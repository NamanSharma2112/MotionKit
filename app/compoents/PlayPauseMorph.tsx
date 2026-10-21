"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* ─── SVG path definitions ─── */
const PAUSE = {
  left:  "M5 5L9 5L9 19L5 19Z",
  right: "M15 5L19 5L19 19L15 19Z",
};

const PLAY = {
  left:  "M7 5L13 8.5L13 15.5L7 19Z",
  right: "M13 8.5L19 12L19 12L13 15.5Z",
};

type Spring = { stiffness?: number; damping?: number; mass?: number; visualDuration?: number; bounce?: number };

export default function PlayPauseMorph({
  trigger,
  spring = { stiffness: 300, damping: 22, mass: 0.8 },
  showLabel = true,
}: {
  trigger?: number;
  /** Spring for the icon morph and the press feedback. */
  spring?: Spring;
  showLabel?: boolean;
}) {
  const SPRING = { type: "spring" as const, ...spring };
  const [isPlaying, setIsPlaying] = useState(false);
  const [prevTrigger, setPrevTrigger] = useState(trigger);
  const reduceMotion = useReducedMotion();

  // Toggle whenever the `trigger` prop changes.
  if (trigger !== prevTrigger) {
    setPrevTrigger(trigger);
    if (trigger && trigger > 0) setIsPlaying((prev) => !prev);
  }

  const t = isPlaying ? PLAY : PAUSE;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Button */}
      <motion.button
        type="button"
        aria-label="Play"
        aria-pressed={isPlaying}
        onClick={() => setIsPlaying((p) => !p)}
        whileTap={{ scale: 0.95 }}
        transition={SPRING}
        className="relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-0 bg-neutral-900 text-white outline-none
          shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.16),0_8px_24px_-8px_rgba(0,0,0,0.35)]
          transition-[box-shadow,background-color] duration-200 ease-out hover:bg-neutral-800
          focus-visible:ring-2 focus-visible:ring-[#1f6bff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white
          dark:bg-white dark:text-neutral-900 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_-8px_rgba(0,0,0,0.6)] dark:hover:bg-neutral-100
          dark:focus-visible:ring-offset-neutral-900"
      >
        {/* Pulse ring: one soft ripple per toggle (skipped for reduced motion) */}
        {!reduceMotion && (
          <motion.div
            key={isPlaying ? "play-ring" : "pause-ring"}
            aria-hidden
            initial={{ scale: 1, opacity: 0.3 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-none absolute inset-0 rounded-full border border-neutral-900 dark:border-white"
          />
        )}

        <svg viewBox="0 0 24 24" width={30} height={30} aria-hidden>
          <motion.path
            d={t.left}
            animate={{ d: t.left }}
            initial={false}
            transition={SPRING}
            fill="currentColor"
          />
          <motion.path
            d={t.right}
            animate={{ d: t.right }}
            initial={false}
            transition={SPRING}
            fill="currentColor"
          />
        </svg>
      </motion.button>

      {/* Label */}
      {showLabel && <motion.span
        key={isPlaying ? "playing" : "paused"}
        initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.3 }}
        aria-hidden
        className="select-none text-[13px] font-medium text-neutral-500 dark:text-neutral-400"
      >
        {isPlaying ? "Playing" : "Paused"}
      </motion.span>}
    </div>
  );
}
