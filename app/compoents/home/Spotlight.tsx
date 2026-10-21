"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { catalogBySlug } from "./catalog";

const tabs = [
  { slug: "gooey-search", label: "Gooey search", hint: "Click the icon", scale: 1.3 },
  { slug: "magnetic-button", label: "Magnetic", hint: "Move your cursor near it", scale: 1 },
  { slug: "parallax-tilt-card", label: "Tilt card", hint: "Hover and tilt", scale: 0.8 },
  { slug: "stacked-cards", label: "Stacked cards", hint: "Drag the top card", scale: 0.8 },
  { slug: "squiggly-text", label: "Squiggly", hint: "Just watch", scale: 1.6 },
];

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export default function Spotlight() {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduceMotion = useReducedMotion();

  const tab = tabs[active];
  const item = catalogBySlug[tab.slug];

  // The active pill is a second copy of the tab row, clipped down to the
  // selected tab. Animating the clip keeps text colour and pill in sync.
  useLayoutEffect(() => {
    const measure = () => {
      const list = listRef.current;
      const overlay = activeRef.current;
      const el = tabRefs.current[active];
      if (!list || !overlay || !el) return;
      const left = el.offsetLeft;
      const right = list.offsetWidth - (left + el.offsetWidth);
      overlay.style.clipPath = `inset(0 ${right}px 0 ${left}px round 999px)`;
    };
    measure();
    // Place the pill instantly on first paint; only later changes animate.
    const raf = requestAnimationFrame(() => {
      if (activeRef.current) activeRef.current.dataset.ready = "true";
    });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (active + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const tabRow = (decorative: boolean) =>
    tabs.map((t, i) => (
      <button
        key={t.slug}
        ref={decorative ? undefined : (el) => { tabRefs.current[i] = el; }}
        type="button"
        role={decorative ? undefined : "tab"}
        aria-selected={decorative ? undefined : i === active}
        tabIndex={decorative ? -1 : i === active ? 0 : -1}
        className="mk-tab"
        onClick={decorative ? undefined : () => setActive(i)}
      >
        {t.label}
      </button>
    ));

  return (
    <section className="mk-section" id="spotlight">
      <div className="mk-section-head">
        <h2 className="mk-h2">Interactions worth playing with</h2>
        <p className="mk-lead">
          Springs you can interrupt, filters that melt, cards that lean. Pick one and poke at it.
        </p>
      </div>

      <div className="mk-tabs-wrap">
        <div className="mk-tabs" ref={listRef} role="tablist" aria-label="Featured components" onKeyDown={onKeyDown}>
          {tabRow(false)}
          <div className="mk-tabs-active" ref={activeRef} aria-hidden>
            {tabRow(true)}
          </div>
        </div>
      </div>

      <div className="mk-stage" role="tabpanel" aria-label={item.title}>
        <LayoutGroup id="spotlight">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={tab.slug}
              className="mk-stage-inner"
              initial={{ opacity: 0, filter: "blur(6px)", transform: reduceMotion ? "none" : "scale(0.97)" }}
              animate={{ opacity: 1, filter: "blur(0px)", transform: "scale(1)" }}
              exit={{ opacity: 0, filter: "blur(6px)", transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              <div className="mk-card-stage" style={{ transform: `scale(${tab.scale})` }}>
                {item.render(0)}
              </div>
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>

        <div className="mk-stage-bar">
          <div>
            <p className="mk-stage-title">{item.title}</p>
            <p className="mk-stage-hint">{tab.hint}</p>
          </div>
          <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={copy}>
            <span className="mk-swap" data-state={copied ? "b" : "a"}>
              <Copy size={14} className="mk-swap-a" />
              <Check size={14} className="mk-swap-b" />
            </span>
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      </div>
    </section>
  );
}
