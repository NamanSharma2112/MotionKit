"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, useAnimate, transform } from "motion/react";

export default function CharacterCounter({
  trigger,
  maxLength = 12,
  placeholder = "Type here...",
  warningColor = "#ff008c",
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

  // Neutral grey that reads on both light and dark surfaces.
  const mapRemainingToColor = transform([2, 6], [warningColor, "#a3a3a3"]);

  useEffect(() => {
    if (charactersRemaining > 6) return;

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
  }, [charactersRemaining, animate, counterRef, stiffness, damping]);

  // Reset the field when the trigger prop changes (for the preview card)
  if (trigger !== prevTrigger) {
    setPrevTrigger(trigger);
    if (trigger && trigger > 0) setValue("");
  }

  return (
    <div className="relative inline-block text-[32px] leading-none">

      {/* Input Field */}
      <input
        className="relative w-[300px] rounded-2xl border border-black/10 bg-white p-5 pr-[70px] text-[32px] leading-none tracking-[-0.01em] text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-6px_rgba(0,0,0,0.08)] outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-neutral-400 focus:border-[#1f6bff] focus:shadow-[0_0_0_4px_rgba(31,107,255,0.15)] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:shadow-none dark:placeholder:text-neutral-500 dark:focus:border-[#1f6bff] dark:focus:shadow-[0_0_0_4px_rgba(31,107,255,0.25)]"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-describedby={counterId}
      />

      {/* Floating Counter Container */}
      <div className="pointer-events-none absolute top-1/2 right-px flex h-[calc(100%-2px)] -translate-y-1/2 items-center justify-end rounded-r-[15px] bg-linear-to-r from-transparent from-0% to-white to-20% py-2.5 pr-5 pl-[50px] dark:to-neutral-900">

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
