"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const BlurScramble = ({ text = "SYSTEM ONLINE", delay = 200 }) => {
  const [displayText, setDisplayText] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const japChars = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン";

  const startScramble = useCallback(() => {
    let iteration = 0;
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
        setIsFinished(true); // Trigger the final "sharp" state
      }
      iteration += 1 / 3;
    }, 30);
  }, [text]);

  useEffect(() => {
    const timer = setTimeout(startScramble, delay);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startScramble, delay]);

  return (
    <motion.h1
      // 1. Start blurry and invisible
      initial={{ filter: "blur(8px)", opacity: 0, y: 10 }}
      // 2. Animate to clear and visible
      animate={{ 
        filter: isFinished ? "blur(0px)" : "blur(4px)", 
        opacity: 1, 
        y: 0 
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
     className="font-mono text-3xl sm:text-5xl font-bold text-neutral-900 dark:text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
    >
      {displayText}
    </motion.h1>
  );
};

export default BlurScramble;