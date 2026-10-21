"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const KATAKANA = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュル";

const BlurScramble = ({
  text = "SYSTEM ONLINE",
  delay = 200,
  loop = false,
  speed = 30,
  characters = KATAKANA,
}: {
  text?: string;
  /** Milliseconds before the scramble starts. */
  delay?: number;
  /** Replay every 3 seconds after finishing. */
  loop?: boolean;
  /** Milliseconds between scramble frames (lower is faster). */
  speed?: number;
  /** Characters used for the noise. */
  characters?: string;
}) => {
  const reduceMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<() => void>(() => {});

  const startScramble = useCallback(() => {
    let iteration = 0;
    setIsFinished(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(
        text.split("").map((letter, index) => {
          if (letter === " ") return " ";
          if (index < iteration) return text[index];
          return characters[Math.floor(Math.random() * characters.length)];
        }).join("")
      );

      if (iteration >= text.length) {
        clearInterval(intervalRef.current!);
        setIsFinished(true);

        if (loop) {
          loopTimeoutRef.current = setTimeout(() => {
            startRef.current();
          }, 3000); // Loop every 3 seconds after finishing
        }
      }
      iteration += 1 / 3;
    }, speed);
  }, [text, loop, speed, characters]);

  useEffect(() => {
    startRef.current = startScramble;
  }, [startScramble]);

  useEffect(() => {
    // Reduced motion: skip the noise and just show the text.
    const timer = setTimeout(
      reduceMotion
        ? () => {
            setDisplayText(text);
            setIsFinished(true);
          }
        : startScramble,
      delay
    );
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };
  }, [startScramble, delay, reduceMotion, text]);

  return (
    <motion.div
      initial={{ filter: "blur(8px)", opacity: 0, y: 10 }}
      animate={{
        filter: isFinished ? "blur(0px)" : "blur(4px)",
        opacity: 1,
        y: 0
      }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      className="relative inline-block whitespace-pre"
    >
      <span className="sr-only">{text}</span>
      {/* The final text reserves the width, so the scramble never shifts the layout. */}
      <span aria-hidden className="invisible">{text}</span>
      <span aria-hidden className="absolute inset-0 flex justify-center">{displayText}</span>
    </motion.div>
  );
};

export default BlurScramble;
