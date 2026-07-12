"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useMotionValue, useTransform, useAnimationFrame } from "framer-motion";

/**
 * Hero logo with two gradient modes:
 * - Idle: gradient orbits in a smooth circle automatically
 * - Hovered: gradient follows the mouse cursor
 */
const AnimatedHeroLogo = () => {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<SVGRadialGradientElement>(null);

  // Mouse-tracking values (used on hover)
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const cx = useTransform(mouseX, [0, 1], [2, 22]);
  const cy = useTransform(mouseY, [0, 1], [2, 22]);

  // Orbit animation time ref
  const timeRef = useRef(0);

  // Animate: orbit when idle, follow mouse when hovered
  useAnimationFrame((_, delta) => {
    if (!gradientRef.current) return;

    if (isHovered) {
      // Mouse-tracking mode
      gradientRef.current.setAttribute("cx", String(cx.get()));
      gradientRef.current.setAttribute("cy", String(cy.get()));
    } else {
      // Circular orbit mode
      timeRef.current += delta * 0.001; // seconds
      const speed = 1.8;
      const centerX = 12;
      const centerY = 12;
      const radiusX = 10;
      const radiusY = 10;
      const x = centerX + Math.cos(timeRef.current * speed) * radiusX;
      const y = centerY + Math.sin(timeRef.current * speed) * radiusY;
      gradientRef.current.setAttribute("cx", String(x));
      gradientRef.current.setAttribute("cy", String(y));
    }
  });

  // Track mouse position relative to viewport
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    },
    [mouseX, mouseY]
  );

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient
            id="heroLogoGradient"
            gradientUnits="userSpaceOnUse"
            r="14"
            ref={gradientRef}
          >
            <stop stopColor="var(--foreground)" />
            <stop offset="0.7" stopColor="var(--foreground)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base path – faint fill */}
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.25"
        />

        {/* Gradient-stroked path – animated */}
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="url(#heroLogoGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default AnimatedHeroLogo;
