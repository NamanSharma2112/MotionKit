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

// --- Copy & State ---
const buttonCopy: Record<ButtonState, ReactNode> = {
  idle: "Send me a login link",
  loading: <Spinner size={16} color="rgba(255, 255, 255, 0.65)" />,
  success: "Login link sent!",
};

// --- Main Button Component ---
export default function SmoothButton({ trigger }: { trigger?: number }) {
  const [buttonState, setButtonState] = useState<ButtonState>("idle");

  const startTransition = () => {
    if (buttonState !== "idle") return;
    setButtonState("loading");
    setTimeout(() => {
      setButtonState("success");
    }, 1750);
    setTimeout(() => {
      setButtonState("idle");
    }, 3500);
  };

  useEffect(() => {
    if (trigger && trigger > 0) {
      startTransition();
    }
  }, [trigger]);

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
        transition={{ duration: 0.4 }}
        className="flex justify-center p-4 w-full"
      >
        
        {/* The Button */}
        <button
          className="relative flex h-10 w-44 items-center justify-center overflow-hidden rounded-xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 text-[14px] font-bold text-white shadow-xl shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          disabled={buttonState === "loading"}
          onClick={startTransition}
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              className="flex w-full items-center justify-center [text-shadow:0px_1px_1.5px_rgba(0,0,0,0.16)]"
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
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