"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, useAnimate, useReducedMotion, transform } from "motion/react";

export default function CharacterCounter({
  trigger,
  maxLength = 12,
  placeholder = "Type here…",
  warningColor = "#e5484d",
  stiffness = 700,
  damping = 80,
}: {
  trigger?: number;
  maxLength?: number;
  placeholder?: string;
  /** Colour the count turns as you run out of characters. */
  warningColor?: string;
  stiffness?: number;
  damping?: number;
}) {
  const [value, setValue] = useState("");
  const [prevTrigger, setPrevTrigger] = useState(trigger);
  const charactersRemaining = maxLength - value.length;
  const counterId = useId();

  const [counterRef, animate] = useAnimate();
  const reduceMotion = useReducedMotion();

  // Mid grey that clears 3:1 (large text) on both white and near-black fields.
  const mapRemainingToColor = transform([2, 6], [warningColor, "#888888"]);

  useEffect(() => {
    // Reduced motion: the colour still warns, the bump is skipped.
    if (charactersRemaining > 6 || reduceMotion) return;

    const mapRemainingToSpringVelocity = transform([0, 5], [50, 0]);

    animate(
      counterRef.current,
      { scale: 1 },
      {
        type: "spring",
        velocity: mapRemainingToSpringVelocity(charactersRemaining),
        stiffness,
        damping,
      }
    );
  }, [charactersRemaining, animate, counterRef, stiffness, damping, reduceMotion]);

  // Reset the field when the trigger prop changes (for the preview card)
  if (trigger !== prevTrigger) {
    setPrevTrigger(trigger);
    if (trigger && trigger > 0) setValue("");
  }

  return (
    <div className="relative inline-block text-[32px] leading-none">

      {/* Input Field */}
      <input
        // One elevation: a product border, no resting shadow. Focus swaps the border to the accent and adds a ring.
        className="relative w-[300px] rounded-2xl border border-black/10 bg-white p-5 pr-[70px] text-[32px] leading-none tracking-[-0.01em] text-neutral-900 outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-neutral-500 hover:border-black/20 focus:border-[#1f6bff] focus:shadow-[0_0_0_3px_rgba(31,107,255,0.2)] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-400 dark:hover:border-white/20 dark:focus:border-[#1f6bff] dark:focus:shadow-[0_0_0_3px_rgba(31,107,255,0.3)]"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-describedby={counterId}
      />

      {/* Floating Counter Container */}
      {/* The input's right padding keeps typed text clear of the count, so no fade is needed. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">

        {/* Animated Number */}
        <motion.span
          ref={counterRef}
          id={counterId}
          aria-label={`${charactersRemaining} characters remaining`}
          className="block font-medium tabular-nums"
          style={{
            color: mapRemainingToColor(charactersRemaining),
            willChange: "transform",
          }}
        >
          {charactersRemaining}
        </motion.span>

      </div>
    </div>
  );
}
