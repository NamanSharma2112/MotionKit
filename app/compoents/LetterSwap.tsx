"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
}: LetterSwapProps) {
  const [index, setIndex] = useState(0);

  const mounted = useRef(false);

  /* auto cycle */
  useEffect(() => {
    if (words.length <= 1) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, words.length]);

  /* external trigger */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (trigger !== undefined) {
      setIndex((prev) => (prev + 1) % words.length);
    }
  }, [trigger, words.length]);

  const letters = useMemo(
    () => tagWord(words[index], namespace),
    [words, index, namespace]
  );

  return (
    <div
      style={{
        display: "inline-flex",
        overflow: "hidden",
        alignItems: "center",
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {letters.map(({ id, glyph }) => (
          <motion.span
            key={`${words[index]}-${id}`}
            layoutId={id}
            style={{
              display: "inline-block",
              fontWeight: 700,
              lineHeight: 1,
            }}
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -12,
            }}
            transition={{
              layout: {
                type: "spring",
                stiffness,
                damping,
              },
              opacity: {
                duration: 0.18,
              },
              y: {
                duration: 0.22,
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