"use client";

import React from "react";
import { LayoutGroup } from "framer-motion";
import { catalogBySlug } from "./catalog";

type Tile = {
  slug: string;
  label: string;
  meta?: string;
  height: number;
  scale?: number;
};

/* Five columns of live widgets. The outer columns bleed off-screen and fade,
   the way a dashboard collage does; each column is nudged vertically so the
   rows never line up into a plain grid. */
const columns: { offset: number; tiles: Tile[] }[] = [
  {
    offset: 56,
    tiles: [
      { slug: "staggered-list", label: "Inbox", meta: "4 new", height: 250, scale: 0.85 },
      { slug: "bunny-mascot", label: "Mascot", height: 230, scale: 0.75 },
    ],
  },
  {
    offset: 0,
    tiles: [
      { slug: "play-pause-morph", label: "Now playing", meta: "02:14", height: 200 },
      { slug: "character-counter", label: "Compose", meta: "280 max", height: 210, scale: 0.6 },
      { slug: "smooth-button", label: "Sign in", height: 150 },
    ],
  },
  {
    offset: 28,
    tiles: [
      { slug: "letter-swap", label: "Headline", meta: "Spring 120 / 18", height: 190 },
      { slug: "animated-counter", label: "Copies this week", meta: "+14.8%", height: 250, scale: 0.75 },
      { slug: "gooey-search", label: "Search", height: 130, scale: 0.8 },
    ],
  },
  {
    offset: 0,
    tiles: [
      { slug: "gooey-dropdown", label: "Actions", height: 260 },
      { slug: "typewriter", label: "Typing", height: 150, scale: 0.7 },
      { slug: "text-scramble", label: "Decode", height: 150, scale: 0.8 },
    ],
  },
  {
    offset: 64,
    tiles: [
      { slug: "squiggly-text", label: "Wobble", height: 190 },
      { slug: "magnetic-button", label: "Magnetic", height: 210, scale: 0.7 },
    ],
  },
];

export default function HeroCollage() {
  let order = 0;
  return (
    // LayoutGroup namespaces layoutIds so these copies never trade letters
    // with the same components further down the page.
    <LayoutGroup id="hero">
    <div className="mk-collage" aria-label="Live component previews">
      <div className="mk-collage-track">
        {columns.map((col, ci) => (
          <div key={ci} className="mk-collage-col" style={{ paddingTop: col.offset }}>
            {col.tiles.map((t) => {
              const item = catalogBySlug[t.slug];
              const d = order++ * 45;
              return (
                <div
                  key={t.slug}
                  className="mk-tile mk-rise"
                  style={{ height: t.height, "--d": `${300 + d}ms` } as React.CSSProperties}
                >
                  <div className="mk-tile-head">
                    <span>{t.label}</span>
                    {t.meta && <span className="mk-tile-meta">{t.meta}</span>}
                  </div>
                  <div className="mk-tile-body">
                    <div
                      className="mk-card-stage"
                      style={t.scale ? { transform: `scale(${t.scale})` } : undefined}
                    >
                      {item.render(0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
    </LayoutGroup>
  );
}
