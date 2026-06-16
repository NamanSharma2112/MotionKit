"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

/* ─── SVG path definitions ─── */
const PAUSE = {
  left:  "M5 5L9 5L9 19L5 19Z",
  right: "M15 5L19 5L19 19L15 19Z",
};

const PLAY = {
  left:  "M7 5L13 8.5L13 15.5L7 19Z",
  right: "M13 8.5L19 12L19 12L13 15.5Z",
};

const SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 22,
  mass: 0.8,
};

export default function PlayPauseMorph({ trigger }: { trigger?: number }) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (trigger && trigger > 0) {
      setIsPlaying((prev) => !prev);
    }
  }, [trigger]);

  const t = isPlaying ? PLAY : PAUSE;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Button */}
      <motion.button
        onClick={() => setIsPlaying((p) => !p)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={SPRING}
        className="relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer outline-none border-0
          bg-neutral-900 dark:bg-white
          shadow-[0_4px_24px_rgba(0,0,0,0.25)] dark:shadow-[0_4px_24px_rgba(255,255,255,0.15)]
          hover:shadow-[0_8px_40px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_8px_40px_rgba(255,255,255,0.25)]
          transition-shadow duration-300"
      >
        {/* Pulse ring */}
        <motion.div
          key={isPlaying ? "play-ring" : "pause-ring"}
          initial={{ scale: 1, opacity: 0.4 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border-2 border-neutral-900 dark:border-white"
        />

        <svg viewBox="0 0 24 24" width={32} height={32} className="text-white dark:text-black">
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
      <motion.span
        key={isPlaying ? "playing" : "paused"}
        initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.3 }}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400 select-none"
      >
        {isPlaying ? "Playing" : "Paused"}
      </motion.span>
    </div>
  );
}
