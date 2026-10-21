"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check, Copy, RotateCcw } from "lucide-react";
import type { CatalogItem } from "./catalog";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export default function ShowcaseCard({ item, index }: { item: CatalogItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Mount the live demo just before it scrolls in; keeps first paint light.
  const near = useInView(ref, { once: true, margin: "300px 0px" });
  const reduceMotion = useReducedMotion();
  const [trigger, setTrigger] = useState(0);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
    } catch {
      return;
    }
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <motion.article
      ref={ref}
      id={item.slug}
      className="mk-card"
      initial={{ opacity: 0, transform: reduceMotion ? "none" : "translateY(12px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-60px 0px" }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay: (index % 4) * 0.05 }}
    >
      <div className="mk-card-preview">
        {near && (
          <div
            key={trigger}
            className="mk-card-stage"
            style={item.scale ? { transform: `scale(${item.scale})` } : undefined}
          >
            {item.render(trigger)}
          </div>
        )}

        <div className="mk-card-actions">
          {item.replay && (
            <button
              type="button"
              className="mk-icon-btn"
              onClick={() => setTrigger((t) => t + 1)}
              aria-label={`Replay ${item.title}`}
              title="Replay"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            type="button"
            className="mk-icon-btn"
            onClick={copy}
            aria-label={copied ? "Copied" : `Copy ${item.title} code`}
            title="Copy code"
            data-copied={copied}
          >
            <span className="mk-swap" data-state={copied ? "b" : "a"}>
              <Copy size={14} className="mk-swap-a" />
              <Check size={14} className="mk-swap-b" />
            </span>
          </button>
        </div>
      </div>

      <div className="mk-card-body">
        <h3 className="mk-card-title">{item.title}</h3>
        <p className="mk-card-desc">{item.description}</p>
      </div>
    </motion.article>
  );
}
