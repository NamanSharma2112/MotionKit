"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "motion/react";

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

const DEFAULT_SPRING: SpringConfig = {
  type: "spring",
  visualDuration: 0.3,
  bounce: 0.3,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
  buttonRadius = 12,
  panelRadius = 22,
  fill = FILL,
  gooStrength = 8,
  spring = DEFAULT_SPRING,
  className,
}: GooDropdownProps) {
  const [open, setOpen] = useState(false);
  const filterId = useId().replace(/[:]/g, "");

  const rootRef = useRef<HTMLDivElement>(null);
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
  });

  useEffect(() => {
    const animation = animate(progress, open ? 1 : 0, spring);
    return () => animation.stop();
  }, [open, progress, spring]);

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

  const select = (item: DropdownItem) => {
    item.onClick?.();
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`relative select-none ${className ?? ""}`}
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
        className="pointer-events-none absolute inset-0"
        style={{ filter: `url(#${filterId})` }}
      >
        {/* Trigger pill */}
        <div
          className="absolute top-0"
          style={{
            left: geo.btnX,
            width: BTN_W,
            height: BTN_H,
            borderRadius: buttonRadius,
            background: fill,
          }}
        />
        {/* Morphing panel blob */}
        <div
          ref={panelRef}
          className="absolute inset-0"
          style={{ background: fill, clipPath: closedShape }}
        />
      </div>

      {/* Crisp content layer */}
      <div className="absolute inset-0">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="absolute top-0 flex items-center justify-center gap-1.5 text-[13px] font-semibold tracking-[0.01em] text-white/90 transition-opacity hover:text-white active:opacity-70"
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
                style={{ height: itemHeight }}
                className="flex w-full items-center gap-2.5 rounded-[14px] px-3.5 text-left text-[13.5px] font-medium text-white/60 transition-all duration-150 hover:bg-white/10 hover:text-white"
              >
                {item.icon && (
                  <span className="text-white/40 transition-colors group-hover:text-white/70">
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
