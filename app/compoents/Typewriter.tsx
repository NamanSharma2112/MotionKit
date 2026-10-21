"use client";

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const WORDS = ["Premium Animations", "Liquid Transitions", "Interactive UI", "Modern Design"];

export default function Typewriter({
  trigger,
  words = WORDS,
  typeSpeed = 100,
  deleteSpeed = 40,
  pauseDuration = 2000,
}: {
  trigger?: number;
  /** Phrases to type, in order. */
  words?: string[];
  /** Milliseconds per typed character (with a little random jitter). */
  typeSpeed?: number;
  /** Milliseconds per deleted character. */
  deleteSpeed?: number;
  /** Milliseconds to hold a finished phrase. */
  pauseDuration?: number;
}) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [prevTrigger, setPrevTrigger] = useState(trigger);
  const reduceMotion = useReducedMotion();

  // Replay from the first phrase whenever `trigger` changes.
  if (trigger !== prevTrigger) {
    setPrevTrigger(trigger);
    if (trigger && trigger > 0) {
      setIndex(0);
      setSubIndex(0);
      setReverse(false);
    }
  }

  // Stay in range if the list of words changes while running.
  const word = words[index % words.length] ?? "";

  useEffect(() => {
    // Finished typing: hold the phrase, then start deleting.
    if (subIndex === word.length + 1 && !reverse) {
      const hold = setTimeout(() => setReverse(true), pauseDuration);
      return () => clearTimeout(hold);
    }

    const timeout = setTimeout(() => {
      if (reverse && subIndex <= 1) {
        // Fully deleted: move on to the next phrase.
        setSubIndex(0);
        setReverse(false);
        setIndex((prev) => (prev + 1) % words.length);
        return;
      }
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, Math.max(reverse ? deleteSpeed : typeSpeed, parseInt((Math.random() * typeSpeed).toString())));

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, typeSpeed, deleteSpeed, pauseDuration, word, words.length]);

  return (
    <div className="flex items-center justify-center whitespace-pre font-mono text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
      <span aria-hidden className="mr-2 font-medium text-[#1f6bff]">{'>'}</span>
      <span>{word.substring(0, subIndex)}</span>
      <motion.span
        aria-hidden
        animate={reduceMotion ? { opacity: 1 } : { opacity: [0, 1, 0] }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.8, repeat: Infinity, ease: "linear" }}
        className="ml-1 inline-block h-[1.1em] w-[2px] rounded-full bg-[#1f6bff]"
      />
    </div>
  );
}
