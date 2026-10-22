"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* ─── types ─── */

interface TaggedLetter {
  id: string;
  glyph: string;
}

interface LetterSwapProps {
  words?: string[];
  interval?: number;
  stiffness?: number;
  damping?: number;
  namespace?: string;
  trigger?: number;
  /** Full spring for the letter glide; overrides stiffness/damping when set. */
  spring?: { stiffness?: number; damping?: number; mass?: number; visualDuration?: number; bounce?: number };
}

/* ─── helpers ─── */

function tagWord(word: string, namespace: string): TaggedLetter[] {
  const counts = new Map<string, number>();

  return word.split("").map((char) => {
    const key = char.toLowerCase();
    const count = (counts.get(key) ?? 0) + 1;

    counts.set(key, count);

    return {
      id: `${namespace}-${key}-${count}`,
      glyph: char,
    };
  });
}

/* ─── component ─── */

export default function LetterSwap({
  words = ["Motion", "Design", "Create", "Inspire"],
  interval = 2500,
  stiffness = 120,
  damping = 18,
  namespace = "ls",
  trigger,
  spring,
}: LetterSwapProps) {
  const [index, setIndex] = useState(0);
  const [prevTrigger, setPrevTrigger] = useState(trigger);
  const reduceMotion = useReducedMotion();
  const rise = reduceMotion ? 0 : 12;

  /* auto cycle */
  useEffect(() => {
    if (words.length <= 1) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, words.length]);

  /* external trigger: advance one word each time it changes */
  if (trigger !== prevTrigger) {
    setPrevTrigger(trigger);
    if (trigger !== undefined) {
      setIndex((prev) => (prev + 1) % words.length);
    }
  }

  // Stay in range if the list of words shrinks while running.
  const word = words[index % words.length] ?? "";

  const letters = useMemo(
    () => tagWord(word, namespace),
    [word, namespace]
  );

  return (
    <div
      style={{
        display: "inline-flex",
        overflow: "hidden",
        alignItems: "center",
        // Room for descenders and the vertical travel, so glyphs aren't clipped.
        paddingBlock: "0.12em",
      }}
    >
      <span className="sr-only">{word}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        {letters.map(({ id, glyph }) => (
          <motion.span
            key={`${word}-${id}`}
            layoutId={id}
            aria-hidden
            style={{
              display: "inline-block",
              fontWeight: 600,
              lineHeight: 1,
              whiteSpace: "pre",
            }}
            initial={{
              opacity: 0,
              y: rise,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -rise,
            }}
            transition={{
              // Reduced motion: letters fade in place instead of gliding across.
              layout: reduceMotion ? { duration: 0 } : spring ? { type: "spring", ...spring } : {
                type: "spring",
                stiffness,
                damping,
              },
              opacity: {
                duration: 0.18,
                ease: [0.23, 1, 0.32, 1],
              },
              y: {
                duration: 0.22,
                ease: [0.23, 1, 0.32, 1],
              },
            }}
          >
            {glyph}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}