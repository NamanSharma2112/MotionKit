"use client";

import { useState, type ReactNode } from "react";
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
export default function SmoothButton() {
  const [buttonState, setButtonState] = useState<ButtonState>("idle");

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
      <div className="flex justify-center px-10 py-30">
        
        {/* The Button */}
        <button
          className="relative flex h-8 w-37 items-center justify-center overflow-hidden rounded-lg bg-linear-to-b from-[#1994ff] to-[#157cff] text-[13px] font-medium text-white shadow-[0_0_1px_1px_rgba(255,255,255,0.08)_inset,0_1px_1.5px_0_rgba(0,0,0,0.32),0_0_0_0.5px_#1a94ff] disabled:cursor-not-allowed"
          disabled={buttonState === "loading"}
          onClick={() => {
            if (buttonState === "success") return;

            setButtonState("loading");

            setTimeout(() => {
              setButtonState("success");
            }, 1750);

            setTimeout(() => {
              setButtonState("idle");
            }, 3500);
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
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
      </div>
    </>
  );
}