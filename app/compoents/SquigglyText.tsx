"use client";

import React from "react";

interface SquigglyTextProps {
  /** The text to render with the squiggly effect */
  text?: string;
  /** Animation speed in seconds */
  speed?: number;
  /** Displacement intensity (higher = more distortion) */
  scale?: number;
  /** Turbulence frequency (lower = broader waves) */
  baseFrequency?: number;
}

const FILTER_COUNT = 5;

export default function SquigglyText({
  text = "Squiggly!",
  speed = 0.4,
  scale = 6,
  baseFrequency = 0.02,
}: SquigglyTextProps) {
  const uid = React.useId().replace(/:/g, "");

  return (
    <>
      {/* Hidden SVG filters — 5 identical filters with different seeds */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        <defs>
          {Array.from({ length: FILTER_COUNT }, (_, i) => (
            <filter key={i} id={`squiggly-${uid}-${i}`}>
              <feTurbulence
                baseFrequency={baseFrequency}
                numOctaves={3}
                result="noise"
                seed={i}
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={scale}
              />
            </filter>
          ))}
        </defs>
      </svg>

      <span
        className={`squiggly-wavy-${uid}`}
        style={{
          display: "inline-block",
          fontWeight: 700,
          fontSize: "inherit",
          lineHeight: 1.2,
          color: "inherit",
        }}
      >
        {text}
      </span>

      {/* Scoped keyframe animation */}
      <style>{`
        @keyframes squiggly-anim-${uid} {
          0%   { filter: url(#squiggly-${uid}-0); }
          25%  { filter: url(#squiggly-${uid}-1); }
          50%  { filter: url(#squiggly-${uid}-2); }
          75%  { filter: url(#squiggly-${uid}-3); }
          100% { filter: url(#squiggly-${uid}-4); }
        }
        .squiggly-wavy-${uid} {
          animation: squiggly-anim-${uid} ${speed}s linear infinite;
        }
      `}</style>
    </>
  );
}
