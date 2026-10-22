"use client";

import React, { useEffect, useEffectEvent, useRef } from 'react';
import { useInView, animate, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion';

export default function AnimatedCounter({
  trigger,
  duration = 2.5,
  target = 2500,
  ease = [0.22, 1, 0.36, 1],
  label = "Projects completed",
  suffix = "+",
}: {
  trigger?: number;
  duration?: number;
  target?: number;
  /** Cubic-bezier easing for the count. */
  ease?: [number, number, number, number];
  label?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const isInView = useInView(ref, { once: false, margin: "-100px" });
  const reduceMotion = useReducedMotion();

  const startAnimation = useEffectEvent(() => {
    const node = ref.current;
    if (!node) return;
    // Stop a count that's still running so two never fight over the text.
    controls.current?.stop();
    if (reduceMotion) {
      node.textContent = Math.round(target).toLocaleString();
      return;
    }
    controls.current = animate(0, target, {
      duration,
      ease,
      onUpdate(value) {
        node.textContent = Math.round(value).toLocaleString();
      }
    });
  });

  useEffect(() => {
    if (isInView) {
      startAnimation();
    }
  }, [isInView]);

  useEffect(() => {
    if (trigger && trigger > 0) {
      startAnimation();
    }
  }, [trigger]);

  useEffect(() => () => controls.current?.stop(), []);

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="flex items-start">
        <span
          ref={ref}
          // Reserve room for the final value so the row doesn't grow as it counts.
          style={{ minWidth: `${Math.round(target).toLocaleString().length * 0.62}em` }}
          className="text-right text-6xl font-semibold leading-none tracking-[-0.04em] tabular-nums text-neutral-900 dark:text-white"
        >
          0
        </span>
        {/* No empty suffix span, so the number stays optically centred. */}
        {suffix && (
          <span className="ml-1 mt-1 text-3xl font-semibold leading-none text-[#1f6bff]">{suffix}</span>
        )}
      </div>
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {label}
      </p>
    </div>
  );
}
