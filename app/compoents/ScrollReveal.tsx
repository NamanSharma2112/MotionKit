"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion, Variants } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  /** Seconds the reveal takes. */
  duration?: number;
  /** How far (px) the content travels in. */
  distance?: number;
  /** Starting blur in px. */
  blur?: number;
}

export default function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.8,
  distance = 50,
  blur = 10,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-50px" });
  // Reduced motion: a plain fade, no travel, scale or blur.
  const reduceMotion = useReducedMotion();
  const travel = reduceMotion ? 0 : distance;

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? travel : direction === "down" ? -travel : 0,
      x: direction === "left" ? travel : direction === "right" ? -travel : 0,
      filter: `blur(${reduceMotion ? 0 : blur}px)`,
      scale: reduceMotion ? 1 : 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      filter: "blur(0px)",
      scale: 1,
      transition: {
        duration,
        delay,
        // Strong ease-out: entering content should move immediately, then settle.
        ease: [0.23, 1, 0.32, 1],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className="flex items-center justify-center w-full h-full"
    >
      {children}
    </motion.div>
  );
}