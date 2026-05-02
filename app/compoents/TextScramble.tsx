"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const BlurScramble = ({ text = "SYSTEM ONLINE", delay = 200, loop = false }) => {
  const [displayText, setDisplayText] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const japChars = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュル";

  const startScramble = useCallback(() => {
    let iteration = 0;
    setIsFinished(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(
        text.split("").map((letter, index) => {
          if (letter === " ") return " ";
          if (index < iteration) return text[index];
          return japChars[Math.floor(Math.random() * japChars.length)];
        }).join("")
      );

      if (iteration >= text.length) {
        clearInterval(intervalRef.current!);
        setIsFinished(true);
        
        if (loop) {
          loopTimeoutRef.current = setTimeout(() => {
            startScramble();
          }, 3000); // Loop every 3 seconds after finishing
        }
      }
      iteration += 1 / 3;
    }, 30);
  }, [text, loop]);

  useEffect(() => {
    const timer = setTimeout(startScramble, delay);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };
  }, [startScramble, delay]);

  return (
    <motion.div
      initial={{ filter: "blur(8px)", opacity: 0, y: 10 }}
      animate={{
        filter: isFinished ? "blur(0px)" : "blur(4px)",
        opacity: 1,
        y: 0
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative"
    >
      {displayText}
    </motion.div>
  );
};

export default BlurScramble;