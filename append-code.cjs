const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'compoents', 'componentCodes.ts');

const codeStr = `
export const gooeyDropdownCode = \`"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "motion/react";

const BTN_W = 88, BTN_H = 36, PANEL_PAD = 6, FILL = "#1c1c1e";
const lerp = (a, b, t) => a + (b - a) * t;

function roundedRectShape(x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, w/2, h/2));
  const k = r * 0.5523;
  const p = (n) => n.toFixed(3) + "px";
  return (
    "shape(from " + p(x+r) + " " + p(y) + ", " +
    "line to " + p(x+w-r) + " " + p(y) + ", " +
    "curve to " + p(x+w) + " " + p(y+r) + " with " + p(x+w-r+k) + " " + p(y) + " / " + p(x+w) + " " + p(y+r-k) + ", " +
    "line to " + p(x+w) + " " + p(y+h-r) + ", " +
    "curve to " + p(x+w-r) + " " + p(y+h) + " with " + p(x+w) + " " + p(y+h-r+k) + " / " + p(x+w-r+k) + " " + p(y+h) + ", " +
    "line to " + p(x+r) + " " + p(y+h) + ", " +
    "curve to " + p(x) + " " + p(y+h-r) + " with " + p(x+r-k) + " " + p(y+h) + " / " + p(x) + " " + p(y+h-r+k) + ", " +
    "line to " + p(x) + " " + p(y+r) + ", " +
    "curve to " + p(x+r) + " " + p(y) + " with " + p(x) + " " + p(y+r-k) + " / " + p(x+r-k) + " " + p(y) + ", " +
    "close)"
  );
}

export function GooDropdown({
  trigger = "Share", items = [{label:"Copy link"},{label:"Share on X"},{label:"Embed"}],
  width = 220, align = "end", gap = 14, itemHeight = 42,
  buttonRadius = 12, panelRadius = 22, fill = FILL, gooStrength = 8,
  spring = { type: "spring", visualDuration: 0.3, bounce: 0.3 }, className,
}) {
  const [open, setOpen] = useState(false);
  const filterId = useId().replace(/[:]/g, "");
  const rootRef = useRef(null), panelRef = useRef(null), contentRef = useRef(null);

  const geo = useMemo(() => {
    const panelTop = BTN_H + gap;
    const panelH = items.length * itemHeight + PANEL_PAD * 2;
    const btnX = align === "end" ? width - BTN_W : 0;
    const closed = { x: btnX, y: 0, w: BTN_W, h: BTN_H, r: buttonRadius };
    const openShape = { x: 0, y: panelTop, w: width, h: panelH, r: panelRadius };
    return { panelTop, panelH, btnX, closed, open: openShape, layerH: panelTop + panelH };
  }, [items.length, width, align, gap, itemHeight, buttonRadius, panelRadius]);

  const shapeAt = useMemo(() => {
    const { closed, open: o } = geo;
    return (t) => roundedRectShape(lerp(closed.x,o.x,t),lerp(closed.y,o.y,t),lerp(closed.w,o.w,t),lerp(closed.h,o.h,t),lerp(closed.r,o.r,t));
  }, [geo]);

  const closedShape = shapeAt(0);
  const progress = useMotionValue(0);

  useMotionValueEvent(progress, "change", (v) => {
    const shape = shapeAt(v);
    if (panelRef.current) panelRef.current.style.clipPath = shape;
    if (contentRef.current) contentRef.current.style.clipPath = shape;
  });

  useEffect(() => {
    const a = animate(progress, open ? 1 : 0, spring);
    return () => a.stop();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const down = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("pointerdown", down); window.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div ref={rootRef} className={"relative select-none " + (className ?? "")} style={{ width, height: geo.layerH }}>
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={gooStrength} result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <div className="pointer-events-none absolute inset-0" style={{ filter: "url(#" + filterId + ")" }}>
        <div className="absolute top-0" style={{ left: geo.btnX, width: BTN_W, height: BTN_H, borderRadius: buttonRadius, background: fill }} />
        <div ref={panelRef} className="absolute inset-0" style={{ background: fill, clipPath: closedShape }} />
      </div>
      <div className="absolute inset-0">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className="absolute top-0 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-white/90 hover:text-white"
          style={{ left: geo.btnX, width: BTN_W, height: BTN_H, borderRadius: buttonRadius }}>
          {trigger}
        </button>
        <div ref={contentRef} role="menu" className="absolute inset-0" style={{ clipPath: closedShape, pointerEvents: open ? "auto" : "none" }}>
          <div className="absolute inset-x-0" style={{ top: geo.panelTop, height: geo.panelH, padding: PANEL_PAD }}>
            {items.map((item) => (
              <button key={item.label} role="menuitem" type="button" tabIndex={open ? 0 : -1}
                onClick={() => { item.onClick?.(); setOpen(false); }}
                style={{ height: itemHeight }}
                className="flex w-full items-center rounded-[14px] px-3.5 text-[13.5px] font-medium text-white/60 hover:bg-white/10 hover:text-white">
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GooeyDropdown(props) {
  return (
    <div className="flex w-full h-full items-center justify-center">
      <GooDropdown {...props} />
    </div>
  );
}
\`;
`;

fs.appendFileSync(filePath, codeStr, 'utf8');
console.log('Done!');
