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

import { componentMeta } from "../site";

const meta = (slug: string) => ({ slug, ...componentMeta[slug] });

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
    ...meta("svg-gradient-trace"),
    code: nameCode,
    scale: 0.8,
    render: () => <Name />,
  },
  {
    ...meta("play-pause-morph"),
    code: playPauseMorphCode,
    render: (t) => <PlayPauseMorph trigger={t} />,
  },
  {
    ...meta("gooey-dropdown"),
    code: gooeyDropdownCode,
    render: () => <GooeyDropdown />,
  },
  {
    ...meta("animated-counter"),
    code: animatedCounterCode,
    replay: true,
    scale: 0.8,
    render: (t) => <AnimatedCounter duration={2} target={100} trigger={t} />,
  },
  {
    ...meta("character-counter"),
    code: characterCounterCode,
    scale: 0.7,
    render: (t) => <CharacterCounter trigger={t} />,
  },
  {
    ...meta("animate-presence-modes"),
    code: animatePresenceModesCode,
    scale: 0.7,
    render: () => <AnimatePresenceModes />,
  },
  {
    ...meta("stacked-cards"),
    code: stackedCardsCode,
    scale: 0.55,
    render: () => <StackedCards />,
  },
  {
    ...meta("gooey-search"),
    code: gooeyCode,
    scale: 0.85,
    render: () => <Gooey />,
  },
  {
    ...meta("text-scramble"),
    code: textScrambleCode,
    replay: true,
    render: () => (
      <div className="mk-scramble">
        <TextScramble text="MotionKit" delay={50} />
      </div>
    ),
  },
  {
    ...meta("staggered-list"),
    code: staggeredListCode,
    replay: true,
    scale: 0.85,
    render: (t) => <StaggeredList staggerDelay={0.08} direction="up" trigger={t} />,
  },
  {
    ...meta("smooth-button"),
    code: smoothButtonCode,
    render: (t) => <SmoothButton trigger={t} />,
  },
  {
    ...meta("typewriter"),
    code: typewriterCode,
    replay: true,
    scale: 0.8,
    render: (t) => <Typewriter typeSpeed={80} pauseDuration={1500} trigger={t} />,
  },
  {
    ...meta("magnetic-button"),
    code: magneticButtonCode,
    scale: 0.8,
    render: (t) => <MagneticButton strength={0.4} trigger={t} />,
  },
  {
    ...meta("letter-swap"),
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
    ...meta("parallax-tilt-card"),
    code: parallaxTiltCardCode,
    scale: 0.55,
    render: (t) => <ParallaxTiltCard maxTilt={20} glare trigger={t} />,
  },
  {
    ...meta("scroll-reveal"),
    code: scrollRevealCode,
    render: () => (
      <ScrollReveal direction="up" delay={0.1}>
        <div className="mk-reveal-chip">Scroll me</div>
      </ScrollReveal>
    ),
  },
  {
    ...meta("squiggly-text"),
    code: squigglyTextCode,
    render: () => (
      <div className="mk-squiggly">
        <SquigglyText text="Wiggly!" speed={0.4} scale={6} baseFrequency={0.02} />
      </div>
    ),
  },
  {
    ...meta("bunny-mascot"),
    code: bunnyIconCode,
    render: (t) => <BunnyIcon size={140} trigger={t} />,
  },
];

export const catalogBySlug = Object.fromEntries(catalog.map((c) => [c.slug, c])) as Record<
  string,
  CatalogItem
>;
