"use client";

import React, { useState, useEffect } from "react";
import { motion, useAnimate, transform } from "motion/react";

export default function CharacterCounter({ trigger }: { trigger?: number }) {
  const [value, setValue] = useState("");
  const maxLength = 12;
  const charactersRemaining = maxLength - value.length;

  const [counterRef, animate] = useAnimate();

  const mapRemainingToColor = transform([2, 6], ["#ff008c", "#ccc"]);

  useEffect(() => {
    if (charactersRemaining > 6) return;

    const mapRemainingToSpringVelocity = transform([0, 5], [50, 0]);

    animate(
      counterRef.current,
      { scale: 1 },
      {
        type: "spring",
        velocity: mapRemainingToSpringVelocity(charactersRemaining),
        stiffness: 700,
        damping: 80,
      }
    );
  }, [charactersRemaining, animate]);

  // Re-run the animation when trigger prop changes (for the preview card)
  useEffect(() => {
    if (trigger && trigger > 0) {
      setValue(""); // Reset value to demonstrate
    }
  }, [trigger]);

  return (
    <div className="relative inline-block text-[32px] leading-none">
      
      {/* Input Field */}
      <input
        className="relative text-[32px] leading-none bg-[#222] text-white border-2 border-[#444] rounded-[10px] p-5 pr-[70px] w-[300px] outline-none focus:border-blue-500 transition-colors"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={maxLength}
        placeholder="Type here..."
      />
      
      {/* Floating Counter Container */}
      <div className="absolute top-1/2 right-[2px] -translate-y-1/2 text-[#ccc] bg-[linear-gradient(to_right,transparent_0%,#222_20%)] py-2.5 pr-5 pl-[50px] pointer-events-none rounded-r-[8px] h-[calc(100%-4px)] flex items-center justify-end">
        
        {/* Animated Number */}
        <motion.span
          ref={counterRef}
          className="block"
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
