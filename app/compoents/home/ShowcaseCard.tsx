"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check, Copy, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import type { CatalogItem, Props } from "./catalog";
import { PreviewSkeleton } from "../ui/Skeleton";
import { aiPrompt, setActiveTweak, TweakBridge, useActiveTweak, usageSnippet } from "./tweak";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* Copies text and flips a check mark on for a moment. */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1600);
  }, []);
  return { copied, copy };
}

export function SwapIcon({ on, icon }: { on: boolean; icon: React.ReactNode }) {
  return (
    <span className="mk-swap" data-state={on ? "b" : "a"}>
      <span className="mk-swap-a">{icon}</span>
      <Check size={14} className="mk-swap-b" />
    </span>
  );
}

/* Live props for one preview: base props, or the tweak panel's while tweaking. */
export function useTweakedProps(item: CatalogItem, tweakId: string) {
  const activeTweak = useActiveTweak();
  const tweaking = activeTweak === tweakId;
  const [state, setState] = useState<{ props: Props; changed: string[] } | null>(null);
  const onProps = useCallback((props: Props, changed: string[]) => setState({ props, changed }), []);
  const live = tweaking && state ? state : { props: item.props, changed: [] as string[] };
  return { tweaking, onProps, ...live };
}

export default function ShowcaseCard({ item, index }: { item: CatalogItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Mount the live demo just before it scrolls in; keeps first paint light.
  const near = useInView(ref, { once: true, margin: "300px 0px" });
  const reduceMotion = useReducedMotion();
  const [replayKey, setReplayKey] = useState(0);
  const { copied, copy } = useCopy();

  const tweakId = `grid:${item.slug}`;
  const { tweaking, onProps, props, changed } = useTweakedProps(item, tweakId);
  const replay = useCallback(() => setReplayKey((k) => k + 1), []);
  const usage = usageSnippet(item, props);

  return (
    <motion.article
      ref={ref}
      id={item.slug}
      className="mk-card"
      data-tweaking={tweaking}
      initial={{ opacity: 0, transform: reduceMotion ? "none" : "translateY(12px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-60px 0px" }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay: (index % 4) * 0.05 }}
    >
      {tweaking && item.tweak && (
        <TweakBridge id={tweakId} item={item} onProps={onProps} onReplay={replay} />
      )}

      <div className="mk-card-preview">
        {!near && <PreviewSkeleton />}
        {near && (
          <div
            key={replayKey}
            className="mk-card-stage"
            style={item.scale ? { transform: `scale(${item.scale})` } : undefined}
          >
            {item.render(props)}
          </div>
        )}

        <div className="mk-card-actions">
          {item.replay && (
            <button
              type="button"
              className="mk-icon-btn"
              onClick={replay}
              aria-label={`Replay ${item.title}`}
              title="Replay"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {item.tweak && (
            <button
              type="button"
              className="mk-icon-btn"
              onClick={() => setActiveTweak(tweaking ? null : tweakId)}
              aria-pressed={tweaking}
              aria-label={`${tweaking ? "Stop tweaking" : "Tweak"} ${item.title}`}
              title={tweaking ? "Stop tweaking" : "Tweak values"}
              data-active={tweaking}
            >
              <SlidersHorizontal size={14} />
            </button>
          )}
          <button
            type="button"
            className="mk-icon-btn"
            onClick={() => copy("prompt", aiPrompt(item, props, changed))}
            aria-label={copied === "prompt" ? "Copied AI prompt" : `Copy AI prompt for ${item.title}`}
            title="Copy AI prompt"
            data-copied={copied === "prompt"}
          >
            <SwapIcon on={copied === "prompt"} icon={<Sparkles size={14} />} />
          </button>
          <button
            type="button"
            className="mk-icon-btn"
            onClick={() => copy("code", item.code)}
            aria-label={copied === "code" ? "Copied" : `Copy ${item.title} code`}
            title="Copy code"
            data-copied={copied === "code"}
          >
            <SwapIcon on={copied === "code"} icon={<Copy size={14} />} />
          </button>
        </div>
      </div>

      <div className="mk-card-body">
        <h3 className="mk-card-title">{item.title}</h3>
        <p className="mk-card-desc">{item.description}</p>
        {tweaking && (
          <div className="mk-usage">
            <pre>{usage}</pre>
            <button
              type="button"
              className="mk-icon-btn mk-usage-copy"
              onClick={() => copy("usage", usage)}
              aria-label={copied === "usage" ? "Copied usage" : "Copy usage"}
              title="Copy usage"
              data-copied={copied === "usage"}
            >
              <SwapIcon on={copied === "usage"} icon={<Copy size={13} />} />
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}
