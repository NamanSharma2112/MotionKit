"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

// --- Spinner Component ---
const bars = Array(12).fill(0);

type ButtonState = "idle" | "loading" | "success";

interface SpinnerProps {
  color: string;
  size?: number;
}

function Spinner({ color, size = 20 }: SpinnerProps) {
  return (
    <div
      className="relative"
      style={{ height: size, width: size }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{ height: size, width: size }}
      >
        {bars.map((_, i) => {
          const rotation = i * 30;
          const delay = -1.2 + i * 0.1;
          return (
            <div
              key={`spinner-bar-${i}`}
              className="absolute left-[-10%] top-[-3.9%] h-[8%] w-[24%] rounded-md"
              style={{
                backgroundColor: color,
                animation: "ios-spin 1.2s linear infinite",
                animationDelay: `${delay}s`,
                transform: `rotate(${rotation || 0.0001}deg) translate(146%)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

type Spring = { stiffness?: number; damping?: number; mass?: number; duration?: number; visualDuration?: number; bounce?: number };

// --- Main Button Component ---
export default function SmoothButton({
  trigger,
  idleText = "Send me a login link",
  successText = "Login link sent!",
  loadingTime = 1750,
  successTime = 1750,
  spring = { duration: 0.3, bounce: 0 },
}: {
  trigger?: number;
  idleText?: string;
  successText?: string;
  /** Milliseconds spent in the loading state. */
  loadingTime?: number;
  /** Milliseconds the success message stays before resetting. */
  successTime?: number;
  /** Spring for the label swap. */
  spring?: Spring;
}) {
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [prevTrigger, setPrevTrigger] = useState(trigger);

  const buttonCopy: Record<ButtonState, ReactNode> = {
    idle: idleText,
    loading: <Spinner size={16} color="rgba(255, 255, 255, 0.7)" />,
    success: (
      <>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {successText}
      </>
    ),
  };

  const startTransition = () => {
    if (buttonState !== "idle") return;
    setButtonState("loading");
  };

  // External replay: start the sequence whenever `trigger` changes.
  if (trigger !== prevTrigger) {
    setPrevTrigger(trigger);
    if (trigger && trigger > 0 && buttonState === "idle") setButtonState("loading");
  }

  // loading -> success -> idle. Timers are cleared if the button unmounts mid-flight.
  useEffect(() => {
    if (buttonState === "idle") return;
    const next = buttonState === "loading" ? "success" : "idle";
    const id = setTimeout(
      () => setButtonState(next),
      buttonState === "loading" ? loadingTime : successTime
    );
    return () => clearTimeout(id);
  }, [buttonState, loadingTime, successTime]);

  return (
    <>
      {/* Required for the custom spinner fade animation */}
      <style>{`
        @keyframes ios-spin {
          0% { opacity: 1; }
          100% { opacity: 0.15; }
        }
      `}</style>

      {/* Outer Wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex justify-center p-4 w-full"
      >

        {/* The Button */}
        <button
          type="button"
          aria-live="polite"
          aria-busy={buttonState === "loading"}
          className="relative flex h-10 w-44 items-center justify-center overflow-hidden rounded-xl bg-[#1f6bff] px-4 text-[14px] font-medium tracking-[-0.005em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(16,24,40,0.12),0_4px_12px_-4px_rgba(31,107,255,0.45)] outline-none transition-[transform,background-color] duration-150 ease-out hover:bg-[#1a5fe6] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[#1f6bff]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-default dark:focus-visible:ring-offset-neutral-900"
          disabled={buttonState === "loading"}
          onClick={startTransition}
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              className="flex w-full items-center justify-center gap-1.5 whitespace-nowrap"
              transition={{ type: "spring", ...spring }}
              initial={{ opacity: 0, y: -25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 25 }}
              key={buttonState}
            >
              {buttonCopy[buttonState]}
            </motion.span>
          </AnimatePresence>
        </button>
      </motion.div>
    </>
  );
}