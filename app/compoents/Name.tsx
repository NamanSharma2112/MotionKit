"use client";
import React, { useEffect, useId, useRef } from "react";
import { useMotionValue, useTransform } from "framer-motion";

const Name = ({
  radius = 200,
  strokeWidth = 3,
  ghostOpacity = 0.08,
}: {
  /** Size of the glow that follows the cursor. */
  radius?: number;
  strokeWidth?: number;
  /** Opacity of the faint filled logo underneath. */
  ghostOpacity?: number;
} = {}) => {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const cx = useTransform(mouseX, [0, 1], [80, 400]);
  const cy = useTransform(mouseY, [0, 1], [80, 410]);
  const gradientRef = useRef<SVGRadialGradientElement>(null);
  // Unique id so several logos on one page each get their own gradient.
  const gradientId = `name-gradient-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const unsubscribeX = cx.on("change", (value) => {
      if (gradientRef.current) {
        gradientRef.current.setAttribute("cx", String(value));
      }
    });
    const unsubscribeY = cy.on("change", (value) => {
      if (gradientRef.current) {
        gradientRef.current.setAttribute("cy", String(value));
      }
    });
    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [cx, cy]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        fill="none"
        viewBox="0 0 480 490"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="h-auto w-full max-w-[200px] text-neutral-900 dark:text-white"
      >
        <defs>
          <radialGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            r={radius}
            ref={gradientRef}
          >
            <stop stopColor="currentColor" />
            <stop offset="0.6" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Filled X logo */}
        <path
          d="M285.38 207.711L462.954 1.5H420.874L266.687 180.55L143.538 1.5H1.50003L187.726 272.256L1.50003 488.5H43.5818L206.408 299.417L336.462 488.5H478.5L285.37 207.711H285.38ZM227.743 274.641L208.875 247.68L58.7444 33.147H123.379L244.536 206.282L263.405 233.243L420.894 458.292H356.259L227.743 274.652V274.641Z"
          fill="currentColor"
          opacity={ghostOpacity}
        />

        {/* Gradient-stroked X logo */}
        <path
          d="M285.38 207.711L462.954 1.5H420.874L266.687 180.55L143.538 1.5H1.50003L187.726 272.256L1.50003 488.5H43.5818L206.408 299.417L336.462 488.5H478.5L285.37 207.711H285.38ZM227.743 274.641L208.875 247.68L58.7444 33.147H123.379L244.536 206.282L263.405 233.243L420.894 458.292H356.259L227.743 274.652V274.641Z"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          stroke={`url(#${gradientId})`}
        />
      </svg>
    </div>
  );
};

export default Name;
