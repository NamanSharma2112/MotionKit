"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";

const TITLES = ["Component Library", "Animation Guide", "Design System", "Motion Kit"];

type Spring = { stiffness?: number; damping?: number; mass?: number; visualDuration?: number; bounce?: number };

export default function StaggeredList({
  trigger,
  staggerDelay = 0.1,
  direction = "up",
  titles = TITLES,
  distance = 16,
  blur = 6,
  spring = { stiffness: 300, damping: 24 },
}: {
  trigger?: number;
  /** Seconds between each row. */
  staggerDelay?: number;
  direction?: "up" | "down";
  titles?: string[];
  /** How far (px) each row travels in. */
  distance?: number;
  /** Starting blur in px. */
  blur?: number;
  spring?: Spring;
}) {
  const items = titles.map((title, i) => ({ id: i + 1, title }));
  const [show, setShow] = useState(true);
  const [prevTrigger, setPrevTrigger] = useState(trigger);

  // Replay: unmount the list for a beat, then bring it back in.
  if (trigger !== prevTrigger) {
    setPrevTrigger(trigger);
    if (trigger && trigger > 0) setShow(false);
  }

  useEffect(() => {
    if (show) return;
    const id = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(id);
  }, [show]);

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const item: Variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? distance : -distance,
      filter: `blur(${blur}px)`,
    },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring", ...spring },
    },
  };

  return (
    <div className="w-full max-w-xs">
      <AnimatePresence mode="wait">
        {show && (
          <motion.ul
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-2"
          >
            {items.map((i) => (
              <motion.li
                key={i.id}
                variants={item}
                className="group flex h-12 cursor-default items-center gap-3 rounded-xl border border-black/[0.07] bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_-2px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-neutral-900 dark:shadow-none"
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-neutral-300 transition-colors duration-150 group-hover:bg-[#1f6bff] dark:bg-neutral-600"
                />
                <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {i.title}
                </span>
                <svg
                  aria-hidden
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-auto shrink-0 -translate-x-1 text-neutral-400 opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100 dark:text-neutral-500"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
