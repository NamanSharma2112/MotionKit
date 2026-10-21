"use client";

import React from "react";
import Gooey from "../Gooey";
import TextScramble from "../TextScramble";
import BunnyIcon from "../BunnyIcon";
import SmoothButton from "../button";
import StaggeredList from "../StaggeredList";
import MagneticButton from "../MagneticButton";
import AnimatedCounter from "../AnimatedCounter";
import ParallaxTiltCard from "../ParallaxTiltCard";
import ScrollReveal from "../ScrollReveal";
import Typewriter from "../Typewriter";
import LetterSwap from "../LetterSwap";
import SquigglyText from "../SquigglyText";
import CharacterCounter from "../CharacterCounter";
import AnimatePresenceModes from "../AnimatePresenceModes";
import StackedCards from "../StackedCards";
import PlayPauseMorph from "../PlayPauseMorph";
import GooeyDropdown from "../GooeyDropdown";
import Name from "../Name";

import {
  gooeyCode,
  textScrambleCode,
  smoothButtonCode,
  staggeredListCode,
  magneticButtonCode,
  animatedCounterCode,
  parallaxTiltCardCode,
  scrollRevealCode,
  typewriterCode,
  letterSwapCode,
  squigglyTextCode,
  bunnyIconCode,
  characterCounterCode,
  animatePresenceModesCode,
  stackedCardsCode,
  playPauseMorphCode,
  gooeyDropdownCode,
  nameCode,
} from "../componentCodes";

export type CatalogItem = {
  slug: string;
  title: string;
  description: string;
  code: string;
  /** Shows a "Replay" control; `trigger` bumps on each press. */
  replay?: boolean;
  /** Scale applied to the live preview so large demos fit the card. */
  scale?: number;
  render: (trigger: number) => React.ReactNode;
};

/* Every live component on the homepage, in grid order. */
export const catalog: CatalogItem[] = [
  {
    slug: "svg-gradient-trace",
    title: "SVG gradient trace",
    description: "A radial gradient stroke that follows the cursor across SVG paths.",
    code: nameCode,
    scale: 0.8,
    render: () => <Name />,
  },
  {
    slug: "play-pause-morph",
    title: "Play / pause morph",
    description: "Icon paths morph between states on a spring.",
    code: playPauseMorphCode,
    render: (t) => <PlayPauseMorph trigger={t} />,
  },
  {
    slug: "gooey-dropdown",
    title: "Gooey dropdown",
    description: "A menu that melts out of its trigger with an SVG goo filter.",
    code: gooeyDropdownCode,
    render: () => <GooeyDropdown />,
  },
  {
    slug: "animated-counter",
    title: "Animated counter",
    description: "Digits roll into place with blur and stagger.",
    code: animatedCounterCode,
    replay: true,
    scale: 0.8,
    render: (t) => <AnimatedCounter duration={2} target={100} trigger={t} />,
  },
  {
    slug: "character-counter",
    title: "Character counter",
    description: "A limit ring whose spring velocity grows as you near the end.",
    code: characterCounterCode,
    scale: 0.7,
    render: (t) => <CharacterCounter trigger={t} />,
  },
  {
    slug: "animate-presence-modes",
    title: "Presence modes",
    description: "sync, wait and popLayout exits, side by side.",
    code: animatePresenceModesCode,
    scale: 0.7,
    render: () => <AnimatePresenceModes />,
  },
  {
    slug: "stacked-cards",
    title: "Stacked cards",
    description: "A draggable deck of 3D cards you can flick away.",
    code: stackedCardsCode,
    scale: 0.55,
    render: () => <StackedCards />,
  },
  {
    slug: "gooey-search",
    title: "Gooey search",
    description: "A search button that stretches into an input.",
    code: gooeyCode,
    scale: 0.85,
    render: () => <Gooey />,
  },
  {
    slug: "text-scramble",
    title: "Text scramble",
    description: "Characters resolve out of noise with a soft blur.",
    code: textScrambleCode,
    replay: true,
    render: () => (
      <div className="mk-scramble">
        <TextScramble text="MotionKit" delay={50} />
      </div>
    ),
  },
  {
    slug: "staggered-list",
    title: "Staggered list",
    description: "Rows cascade in one after another.",
    code: staggeredListCode,
    replay: true,
    scale: 0.85,
    render: (t) => <StaggeredList staggerDelay={0.08} direction="up" trigger={t} />,
  },
  {
    slug: "smooth-button",
    title: "Smooth button",
    description: "Idle, loading and success states that blur into each other.",
    code: smoothButtonCode,
    render: (t) => <SmoothButton trigger={t} />,
  },
  {
    slug: "typewriter",
    title: "Typewriter",
    description: "Multi-phrase typing with a blinking caret.",
    code: typewriterCode,
    replay: true,
    scale: 0.8,
    render: (t) => <Typewriter typeSpeed={80} pauseDuration={1500} trigger={t} />,
  },
  {
    slug: "magnetic-button",
    title: "Magnetic button",
    description: "A button that leans toward your cursor.",
    code: magneticButtonCode,
    scale: 0.8,
    render: (t) => <MagneticButton strength={0.4} trigger={t} />,
  },
  {
    slug: "letter-swap",
    title: "Letter swap",
    description: "Shared letters glide between words.",
    code: letterSwapCode,
    render: (t) => (
      <div className="mk-letter-swap">
        <LetterSwap
          words={["Motion", "Design", "Create", "Morph!"]}
          interval={2500}
          stiffness={120}
          damping={18}
          trigger={t}
        />
      </div>
    ),
  },
  {
    slug: "parallax-tilt-card",
    title: "Parallax tilt card",
    description: "3D perspective and glare that track the pointer.",
    code: parallaxTiltCardCode,
    scale: 0.55,
    render: (t) => <ParallaxTiltCard maxTilt={20} glare trigger={t} />,
  },
  {
    slug: "scroll-reveal",
    title: "Scroll reveal",
    description: "Fade and rise as content enters the viewport.",
    code: scrollRevealCode,
    render: () => (
      <ScrollReveal direction="up" delay={0.1}>
        <div className="mk-reveal-chip">Scroll me</div>
      </ScrollReveal>
    ),
  },
  {
    slug: "squiggly-text",
    title: "Squiggly text",
    description: "A hand-drawn wobble from an SVG turbulence filter.",
    code: squigglyTextCode,
    render: () => (
      <div className="mk-squiggly">
        <SquigglyText text="Wiggly!" speed={0.4} scale={6} baseFrequency={0.02} />
      </div>
    ),
  },
  {
    slug: "bunny-mascot",
    title: "Bunny mascot",
    description: "An SVG character whose eyes follow you around.",
    code: bunnyIconCode,
    render: (t) => <BunnyIcon size={140} trigger={t} />,
  },
];

export const catalogBySlug = Object.fromEntries(catalog.map((c) => [c.slug, c])) as Record<
  string,
  CatalogItem
>;
