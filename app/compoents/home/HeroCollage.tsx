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
      { slug: "staggered-list", label: "Staggered list", meta: "80ms stagger", height: 250, scale: 0.85 },
      { slug: "bunny-mascot", label: "Bunny mascot", height: 230, scale: 0.75 },
    ],
  },
  {
    offset: 0,
    tiles: [
      { slug: "play-pause-morph", label: "Play / pause", meta: "spring 300/22", height: 200 },
      { slug: "character-counter", label: "Character counter", meta: "12 max", height: 210, scale: 0.6 },
      { slug: "smooth-button", label: "Smooth button", height: 150 },
    ],
  },
  {
    offset: 28,
    tiles: [
      { slug: "letter-swap", label: "Letter swap", meta: "spring 120/18", height: 190 },
      { slug: "animated-counter", label: "Animated counter", meta: "2s ease-out", height: 250, scale: 0.75 },
      { slug: "gooey-search", label: "Gooey search", height: 130, scale: 0.8 },
    ],
  },
  {
    offset: 0,
    tiles: [
      { slug: "gooey-dropdown", label: "Gooey dropdown", height: 260 },
      { slug: "typewriter", label: "Typewriter", height: 150, scale: 0.7 },
      { slug: "text-scramble", label: "Text scramble", height: 150, scale: 0.8 },
    ],
  },
  {
    offset: 64,
    tiles: [
      { slug: "squiggly-text", label: "Squiggly text", height: 190 },
      { slug: "magnetic-button", label: "Magnetic button", height: 210, scale: 0.7 },
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
                      {item.render(item.props)}
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
