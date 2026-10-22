"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, Variants } from "framer-motion";

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
  // Reduced motion: rows still fade in one after another, without travel or blur.
  const reduceMotion = useReducedMotion();
  const travel = reduceMotion ? 0 : distance;

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
      y: direction === "up" ? travel : -travel,
      filter: `blur(${reduceMotion ? 0 : blur}px)`,
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
                className="group flex h-12 cursor-default items-center gap-3 rounded-xl bg-black/[0.04] px-4 transition-colors duration-150 ease-out hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-neutral-400 transition-colors duration-150 group-hover:bg-[#1f6bff] dark:bg-neutral-500"
                />
                <span className="truncate text-sm font-medium text-neutral-900 dark:text-white">
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
                  className="ml-auto shrink-0 -translate-x-1 text-neutral-500 opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100 dark:text-neutral-400"
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
