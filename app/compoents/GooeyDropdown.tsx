"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";

export type DropdownItem = {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
};

type SpringConfig = {
  type: "spring";
  stiffness?: number;
  damping?: number;
  mass?: number;
  bounce?: number;
  visualDuration?: number;
};

export type GooDropdownProps = {
  trigger?: string;
  items?: DropdownItem[];
  width?: number;
  align?: "start" | "end";
  gap?: number;
  itemHeight?: number;
  buttonRadius?: number;
  panelRadius?: number;
  fill?: string;
  gooStrength?: number;
  spring?: SpringConfig;
  className?: string;
};

const BTN_W = 88;
const BTN_H = 36;
const PANEL_PAD = 6;
const FILL = "#1c1c1e";

const DEFAULT_ITEMS: DropdownItem[] = [
  {
    label: "Copy link",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
    onClick: () => {},
  },
  {
    label: "Share on X",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.258 5.627 5.906-5.627Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    onClick: () => {},
  },
  {
    label: "Embed",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    onClick: () => {},
  },
];

// Scale both layers to 0.97 while the trigger is held down.
const PRESS =
  "transition-transform duration-150 ease-out [[data-goo-root]:has([data-goo-trigger]:active)_&]:scale-[0.97]";

const DEFAULT_SPRING: SpringConfig = {
  type: "spring",
  visualDuration: 0.3,
  bounce: 0.3,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// The goo filter plus a drop shadow that grows with the open progress: the closed
// trigger sits flat, only the open menu floats.
const blobFilter = (id: string, t: number) => {
  const k = Math.min(Math.max(t, 0), 1);
  return `url(#${id}) drop-shadow(0 8px 16px rgba(0,0,0,${(0.18 * k).toFixed(3)}))`;
};

function roundedRectShape(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const k = r * 0.5523;
  const x1 = x;
  const y1 = y;
  const x2 = x + w;
  const y2 = y + h;
  const p = (n: number) => `${n.toFixed(3)}px`;

  return (
    `shape(from ${p(x1 + r)} ${p(y1)}, ` +
    `line to ${p(x2 - r)} ${p(y1)}, ` +
    `curve to ${p(x2)} ${p(y1 + r)} with ${p(x2 - r + k)} ${p(y1)} / ${p(x2)} ${p(y1 + r - k)}, ` +
    `line to ${p(x2)} ${p(y2 - r)}, ` +
    `curve to ${p(x2 - r)} ${p(y2)} with ${p(x2)} ${p(y2 - r + k)} / ${p(x2 - r + k)} ${p(y2)}, ` +
    `line to ${p(x1 + r)} ${p(y2)}, ` +
    `curve to ${p(x1)} ${p(y2 - r)} with ${p(x1 + r - k)} ${p(y2)} / ${p(x1)} ${p(y2 - r + k)}, ` +
    `line to ${p(x1)} ${p(y1 + r)}, ` +
    `curve to ${p(x1 + r)} ${p(y1)} with ${p(x1)} ${p(y1 + r - k)} / ${p(x1 + r - k)} ${p(y1)}, ` +
    `close)`
  );
}

export function GooDropdown({
  trigger = "Share",
  items = DEFAULT_ITEMS,
  width = 220,
  align = "end",
  gap = 14,
  itemHeight = 42,
  buttonRadius = BTN_H / 2,
  panelRadius = 22,
  fill = FILL,
  gooStrength = 8,
  spring = DEFAULT_SPRING,
  className,
}: GooDropdownProps) {
  const [open, setOpen] = useState(false);
  const filterId = useId().replace(/[:]/g, "");

  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const geo = useMemo(() => {
    const panelTop = BTN_H + gap;
    const panelH = items.length * itemHeight + PANEL_PAD * 2;
    const btnX = align === "end" ? width - BTN_W : 0;
    const closed = { x: btnX, y: 0, w: BTN_W, h: BTN_H, r: buttonRadius };
    const openShape = { x: 0, y: panelTop, w: width, h: panelH, r: panelRadius };
    return { panelTop, panelH, btnX, closed, open: openShape, layerH: panelTop + panelH };
  }, [items.length, width, align, gap, itemHeight, buttonRadius, panelRadius]);

  const shapeAt = useMemo(() => {
    const { closed, open: openShape } = geo;
    return (t: number) =>
      roundedRectShape(
        lerp(closed.x, openShape.x, t),
        lerp(closed.y, openShape.y, t),
        lerp(closed.w, openShape.w, t),
        lerp(closed.h, openShape.h, t),
        lerp(closed.r, openShape.r, t),
      );
  }, [geo]);

  const closedShape = shapeAt(0);
  const progress = useMotionValue(0);

  useMotionValueEvent(progress, "change", (v) => {
    const shape = shapeAt(v);
    if (panelRef.current) panelRef.current.style.clipPath = shape;
    if (contentRef.current) contentRef.current.style.clipPath = shape;
    if (blobRef.current) blobRef.current.style.filter = blobFilter(filterId, v);
  });

  useEffect(() => {
    // Reduced motion: the menu appears in place instead of morphing out of the trigger.
    const animation = animate(progress, open ? 1 : 0, reduceMotion ? { duration: 0 } : spring);
    return () => animation.stop();
  }, [open, progress, spring, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Press feedback scales the blob and the content together around the trigger's centre.
  const origin = `${geo.btnX + BTN_W / 2}px ${BTN_H / 2}px`;

  // The default fill lifts a little in dark mode so the blob stays visible on dark surfaces.
  const blobFill = fill === FILL ? "var(--goo-fill)" : fill;

  const select = (item: DropdownItem) => {
    item.onClick?.();
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      data-goo-root
      className={`relative select-none [--goo-fill:#1c1c1e] dark:[--goo-fill:#2c2c31] ${className ?? ""}`}
      style={{ width, height: geo.layerH }}
    >
      {/* Hidden SVG goo filter */}
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={gooStrength} result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Goo blob layer */}
      <div
        ref={blobRef}
        className={`pointer-events-none absolute inset-0 ${PRESS}`}
        style={{ filter: blobFilter(filterId, progress.get()), transformOrigin: origin }}
      >
        {/* Trigger pill */}
        <div
          className="absolute top-0"
          style={{
            left: geo.btnX,
            width: BTN_W,
            height: BTN_H,
            borderRadius: buttonRadius,
            background: blobFill,
          }}
        />
        {/* Morphing panel blob */}
        <div
          ref={panelRef}
          className="absolute inset-0"
          style={{ background: blobFill, clipPath: closedShape }}
        />
      </div>

      {/* Crisp content layer */}
      <div className={`absolute inset-0 ${PRESS}`} style={{ transformOrigin: origin }}>
        {/* Trigger button */}
        <button
          type="button"
          data-goo-trigger
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="absolute top-0 flex cursor-pointer items-center justify-center gap-1.5 text-[13px] font-semibold text-white/90 outline-none transition-colors duration-150 hover:text-white focus-visible:ring-2 focus-visible:ring-[#1f6bff]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900"
          style={{
            left: geo.btnX,
            width: BTN_W,
            height: BTN_H,
            borderRadius: buttonRadius,
          }}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          {trigger}
        </button>

        {/* Menu panel content */}
        <div
          ref={contentRef}
          role="menu"
          aria-hidden={!open}
          className="absolute inset-0"
          style={{
            clipPath: closedShape,
            pointerEvents: open ? "auto" : "none",
          }}
        >
          <div
            className="absolute inset-x-0"
            style={{
              top: geo.panelTop,
              height: geo.panelH,
              padding: PANEL_PAD,
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={() => select(item)}
                // Inner radius follows the panel's so the corners stay concentric.
                style={{ height: itemHeight, borderRadius: Math.max(panelRadius - PANEL_PAD, 4) }}
                className="group flex w-full items-center gap-2.5 px-3 text-left text-[13.5px] font-medium text-white/70 outline-none transition-colors duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:bg-white/[0.08] focus-visible:text-white"
              >
                {item.icon && (
                  <span aria-hidden className="flex size-4 items-center justify-center text-white/45 transition-colors duration-150 group-hover:text-white/80 group-focus-visible:text-white/80">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GooeyDropdown(props: GooDropdownProps) {
  return (
    <div className="flex w-full h-full items-center justify-center">
      <GooDropdown {...props} />
    </div>
  );
}
