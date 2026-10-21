"use client";

import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { catalogBySlug } from "./catalog";
import SegmentedTabs from "../ui/SegmentedTabs";

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
  const reduceMotion = useReducedMotion();

  const tab = tabs[active];
  const item = catalogBySlug[tab.slug];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="mk-section" id="spotlight">
      <div className="mk-section-head">
        <h2 className="mk-h2">Interactions worth playing with</h2>
        <p className="mk-lead">
          Springs you can interrupt, filters that melt, cards that lean. Pick one and poke at it.
        </p>
      </div>

      <SegmentedTabs
        label="Featured components"
        items={tabs.map((t, i) => ({ value: String(i), label: t.label }))}
        value={String(active)}
        onChange={(v) => setActive(Number(v))}
      />

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
