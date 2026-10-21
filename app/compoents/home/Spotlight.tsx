"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Copy, SlidersHorizontal, Sparkles } from "lucide-react";
import { catalogBySlug } from "./catalog";
import SegmentedTabs from "../ui/SegmentedTabs";
import { SwapIcon, useCopy, useTweakedProps } from "./ShowcaseCard";
import { aiPrompt, setActiveTweak, TweakBridge } from "./tweak";

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
  const [replayKey, setReplayKey] = useState(0);
  const reduceMotion = useReducedMotion();
  const { copied, copy } = useCopy();

  const tab = tabs[active];
  const item = catalogBySlug[tab.slug];
  const tweakId = `spotlight:${item.slug}`;
  const { tweaking, onProps, props, changed } = useTweakedProps(item, tweakId);
  const replay = useCallback(() => setReplayKey((k) => k + 1), []);

  const switchTab = (i: number) => {
    // Keep tweaking across tabs: hand the panel to the newly selected component.
    if (tweaking) setActiveTweak(`spotlight:${tabs[i].slug}`);
    setActive(i);
  };

  return (
    <section className="mk-section" id="spotlight">
      <div className="mk-section-head">
        <h2 className="mk-h2">Interactions worth playing with</h2>
        <p className="mk-lead">
          Springs you can interrupt, filters that melt, cards that lean. Pick one, poke at it, then
          tune it live.
        </p>
      </div>

      <SegmentedTabs
        label="Featured components"
        items={tabs.map((t, i) => ({ value: String(i), label: t.label }))}
        value={String(active)}
        onChange={(v) => switchTab(Number(v))}
      />

      <div className="mk-stage" role="tabpanel" aria-label={item.title} data-tweaking={tweaking}>
        {tweaking && item.tweak && (
          <TweakBridge key={item.slug} id={tweakId} item={item} onProps={onProps} onReplay={replay} />
        )}
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
              <div key={replayKey} className="mk-card-stage" style={{ transform: `scale(${tab.scale})` }}>
                {item.render(props)}
              </div>
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>

        <div className="mk-stage-bar">
          <div>
            <p className="mk-stage-title">{item.title}</p>
            <p className="mk-stage-hint">{tab.hint}</p>
          </div>
          <div className="mk-stage-actions">
            {item.tweak && (
              <button
                type="button"
                className="mk-btn mk-btn-ghost mk-btn-sm"
                data-active={tweaking}
                aria-pressed={tweaking}
                onClick={() => setActiveTweak(tweaking ? null : tweakId)}
              >
                <SlidersHorizontal size={14} />
                {tweaking ? "Done" : "Tweak"}
              </button>
            )}
            <button
              type="button"
              className="mk-btn mk-btn-ghost mk-btn-sm"
              onClick={() => copy("prompt", aiPrompt(item, props, changed))}
            >
              <SwapIcon on={copied === "prompt"} icon={<Sparkles size={14} />} />
              <span className="mk-hide-sm">{copied === "prompt" ? "Copied" : "Copy AI prompt"}</span>
            </button>
            <button
              type="button"
              className="mk-btn mk-btn-ghost mk-btn-sm"
              onClick={() => copy("code", item.code)}
            >
              <SwapIcon on={copied === "code"} icon={<Copy size={14} />} />
              <span className="mk-hide-sm">{copied === "code" ? "Copied" : "Copy code"}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
