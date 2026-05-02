"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const words = ["Premium Animations", "Liquid Transitions", "Interactive UI", "Modern Design"];

export default function Typewriter({ trigger }: { trigger?: number }) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    if (trigger && trigger > 0) {
      setIndex(0);
      setSubIndex(0);
      setReverse(false);
      setPause(false);
    }
  }, [trigger]);

  useEffect(() => {
    if (pause) return;

    if (subIndex === words[index].length + 1 && !reverse) {
      setPause(true);
      setTimeout(() => {
        setPause(false);
        setReverse(true);
      }, 2000);
      return;
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, Math.max(reverse ? 50 : 100, parseInt((Math.random() * 200).toString())));

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, pause]);

  return (
    <div className="flex items-center justify-center font-mono text-2xl font-black tracking-tighter text-neutral-900 dark:text-white">
      <span className="text-blue-500 mr-2">{'>'}</span>
      <span>{words[index].substring(0, subIndex)}</span>
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        className="w-[3px] h-[1.2em] bg-blue-500 ml-1 inline-block"
      />
    </div>
  );
}
