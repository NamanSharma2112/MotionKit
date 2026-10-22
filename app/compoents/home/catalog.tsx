"use client";

import React from "react";
import type { DialConfig } from "dialkit";
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

export type Props = Record<string, unknown>;
type Values = Record<string, unknown>;

export type Tweak = {
  /** DialKit controls; defaults match the item's base props. */
  config: DialConfig;
  /** Turns panel values into component props. */
  toProps: (v: Values) => Props;
};

export type CatalogItem = {
  slug: string;
  title: string;
  description: string;
  code: string;
  /** Component name as exported from its file, used in usage snippets. */
  component: string;
  /** Suggested file name when pasting into a project. */
  file: string;
  /** Shows a "Replay" control; replay remounts the preview. */
  replay?: boolean;
  /** Scale applied to the live preview so large demos fit the card. */
  scale?: number;
  /** Props the demo renders with. */
  props: Props;
  tweak?: Tweak;
  render: (props: Props) => React.ReactNode;
};

/* ─── helpers for mapping DialKit values to props ─── */

type DialSpring = { type?: string; [k: string]: unknown };

/** DialKit transitions carry a `type`; component spring props don't. */
const spring = (v: unknown): Props => {
  const { type: _type, ...rest } = (v ?? {}) as DialSpring;
  void _type;
  return rest;
};

const list = (v: unknown) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const replayAction = { replay: { type: "action" as const, label: "Replay" } };

const meta = (slug: string, component: string) => ({
  slug,
  component,
  file: `${slug}.tsx`,
  ...componentMeta[slug],
});

// The component prop types are precise; the catalog passes loosely typed
// props from the tweak panel, so each render goes through this cast.
const as = <P,>(p: Props) => p as unknown as P;

const KATAKANA = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュル";

/* Every live component on the homepage, in grid order. */
export const catalog: CatalogItem[] = [
  {
    ...meta("svg-gradient-trace", "Name"),
    code: nameCode,
    scale: 0.8,
    props: {},
    tweak: {
      config: { radius: [200, 60, 420, 10], strokeWidth: [3, 0.5, 8, 0.5], ghostOpacity: [0.08, 0, 0.4, 0.01] },
      toProps: (v) => ({ radius: v.radius, strokeWidth: v.strokeWidth, ghostOpacity: v.ghostOpacity }),
    },
    render: (p) => <Name {...as<React.ComponentProps<typeof Name>>(p)} />,
  },
  {
    ...meta("play-pause-morph", "PlayPauseMorph"),
    code: playPauseMorphCode,
    props: {},
    tweak: {
      config: { spring: { type: "spring", stiffness: 300, damping: 22, mass: 0.8 }, showLabel: true },
      toProps: (v) => ({ spring: spring(v.spring), showLabel: v.showLabel }),
    },
    render: (p) => <PlayPauseMorph {...as<React.ComponentProps<typeof PlayPauseMorph>>(p)} />,
  },
  {
    ...meta("gooey-dropdown", "GooeyDropdown"),
    code: gooeyDropdownCode,
    props: {},
    tweak: {
      config: {
        trigger: "Share",
        width: [220, 160, 300, 2],
        itemHeight: [42, 32, 56, 1],
        gap: [14, 4, 32, 1],
        gooStrength: [8, 0, 16, 0.5],
        spring: { type: "spring", visualDuration: 0.3, bounce: 0.3 },
      },
      toProps: (v) => ({
        trigger: v.trigger,
        width: v.width,
        itemHeight: v.itemHeight,
        gap: v.gap,
        gooStrength: v.gooStrength,
        spring: v.spring,
      }),
    },
    render: (p) => <GooeyDropdown {...as<React.ComponentProps<typeof GooeyDropdown>>(p)} />,
  },
  {
    ...meta("animated-counter", "AnimatedCounter"),
    code: animatedCounterCode,
    replay: true,
    scale: 0.8,
    props: { duration: 2, target: 18, label: "Components", suffix: "" },
    tweak: {
      config: {
        target: [18, 1, 10000, 1],
        timing: { type: "easing", duration: 2, ease: [0.22, 1, 0.36, 1] },
        label: "Components",
        suffix: "",
        ...replayAction,
      },
      toProps: (v) => {
        const t = v.timing as { type?: string; duration?: number; ease?: number[] };
        return {
          target: v.target,
          // The easing editor can switch to a spring; only an easing maps onto this API.
          ...(t?.type === "easing" ? { duration: t.duration, ease: t.ease } : {}),
          label: v.label,
          suffix: v.suffix,
        };
      },
    },
    render: (p) => <AnimatedCounter {...as<React.ComponentProps<typeof AnimatedCounter>>(p)} />,
  },
  {
    ...meta("character-counter", "CharacterCounter"),
    code: characterCounterCode,
    scale: 0.7,
    props: {},
    tweak: {
      config: {
        maxLength: [12, 4, 40, 1],
        placeholder: "Type here…",
        warningColor: "#e5484d",
        spring: { type: "spring", stiffness: 700, damping: 80 },
      },
      toProps: (v) => {
        const s = spring(v.spring);
        return {
          maxLength: v.maxLength,
          placeholder: v.placeholder,
          warningColor: v.warningColor,
          stiffness: s.stiffness,
          damping: s.damping,
        };
      },
    },
    render: (p) => <CharacterCounter {...as<React.ComponentProps<typeof CharacterCounter>>(p)} />,
  },
  {
    ...meta("animate-presence-modes", "AnimatePresenceModes"),
    code: animatePresenceModesCode,
    scale: 0.7,
    props: {},
    tweak: {
      config: { duration: [0.3, 0.05, 1.5, 0.05], enterScale: [0.6, 0.5, 1, 0.05], exitScale: [0.8, 0.5, 1, 0.05] },
      toProps: (v) => ({ duration: v.duration, enterScale: v.enterScale, exitScale: v.exitScale }),
    },
    render: (p) => <AnimatePresenceModes {...as<React.ComponentProps<typeof AnimatePresenceModes>>(p)} />,
  },
  {
    ...meta("stacked-cards", "StackedCards"),
    code: stackedCardsCode,
    scale: 0.55,
    props: {},
    tweak: {
      config: {
        spring: { type: "spring", stiffness: 380, damping: 32 },
        swipeThreshold: [100, 30, 200, 5],
        offset: [5, 0, 12, 0.5],
        scaleStep: [0.05, 0, 0.15, 0.01],
        maxRotate: [15, 0, 45, 1],
      },
      toProps: (v) => ({
        spring: spring(v.spring),
        swipeThreshold: v.swipeThreshold,
        offset: v.offset,
        scaleStep: v.scaleStep,
        maxRotate: v.maxRotate,
      }),
    },
    render: (p) => <StackedCards {...as<React.ComponentProps<typeof StackedCards>>(p)} />,
  },
  {
    ...meta("gooey-search", "Gooey"),
    code: gooeyCode,
    scale: 0.85,
    props: {},
    tweak: {
      config: {
        placeholder: "Search",
        expandedWidth: [200, 140, 320, 5],
        gooBlur: [5, 0, 12, 0.5],
        spring: { type: "spring", visualDuration: 0.4, bounce: 0.25 },
      },
      toProps: (v) => ({
        placeholder: v.placeholder,
        expandedWidth: v.expandedWidth,
        gooBlur: v.gooBlur,
        spring: spring(v.spring),
      }),
    },
    render: (p) => <Gooey {...as<React.ComponentProps<typeof Gooey>>(p)} />,
  },
  {
    ...meta("text-scramble", "TextScramble"),
    code: textScrambleCode,
    replay: true,
    props: { text: "MotionKit", delay: 50 },
    tweak: {
      config: {
        text: "MotionKit",
        delay: [50, 0, 1000, 10],
        speed: [30, 10, 150, 5],
        characters: {
          type: "select",
          options: [
            { value: KATAKANA, label: "Katakana" },
            { value: "01", label: "Binary" },
            { value: "!<>-_\\/[]{}=+*^?#", label: "Symbols" },
            { value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", label: "Letters" },
          ],
        },
        loop: false,
        ...replayAction,
      },
      toProps: (v) => ({ text: v.text, delay: v.delay, speed: v.speed, characters: v.characters, loop: v.loop }),
    },
    render: (p) => (
      <div className="mk-scramble">
        <TextScramble {...as<React.ComponentProps<typeof TextScramble>>(p)} />
      </div>
    ),
  },
  {
    ...meta("staggered-list", "StaggeredList"),
    code: staggeredListCode,
    replay: true,
    scale: 0.85,
    props: { staggerDelay: 0.08, direction: "up" },
    tweak: {
      config: {
        staggerDelay: [0.08, 0, 0.4, 0.01],
        direction: { type: "select", options: ["up", "down"] },
        distance: [16, 0, 60, 1],
        blur: [6, 0, 20, 1],
        spring: { type: "spring", stiffness: 300, damping: 24 },
        titles: "Component Library, Animation Guide, Design System, Motion Kit",
        ...replayAction,
      },
      toProps: (v) => ({
        staggerDelay: v.staggerDelay,
        direction: v.direction,
        distance: v.distance,
        blur: v.blur,
        spring: spring(v.spring),
        titles: list(v.titles),
      }),
    },
    render: (p) => <StaggeredList {...as<React.ComponentProps<typeof StaggeredList>>(p)} />,
  },
  {
    ...meta("smooth-button", "SmoothButton"),
    code: smoothButtonCode,
    props: {},
    tweak: {
      config: {
        idleText: "Send me a login link",
        successText: "Login link sent!",
        loadingTime: [1750, 300, 5000, 50],
        successTime: [1750, 300, 5000, 50],
        spring: { type: "spring", visualDuration: 0.3, bounce: 0 },
      },
      toProps: (v) => ({
        idleText: v.idleText,
        successText: v.successText,
        loadingTime: v.loadingTime,
        successTime: v.successTime,
        spring: spring(v.spring),
      }),
    },
    render: (p) => <SmoothButton {...as<React.ComponentProps<typeof SmoothButton>>(p)} />,
  },
  {
    ...meta("typewriter", "Typewriter"),
    code: typewriterCode,
    replay: true,
    scale: 0.8,
    props: { typeSpeed: 80, pauseDuration: 1500 },
    tweak: {
      config: {
        words: "Premium Animations, Liquid Transitions, Interactive UI, Modern Design",
        typeSpeed: [80, 20, 300, 5],
        deleteSpeed: [40, 10, 200, 5],
        pauseDuration: [1500, 200, 5000, 100],
        ...replayAction,
      },
      toProps: (v) => ({
        words: list(v.words),
        typeSpeed: v.typeSpeed,
        deleteSpeed: v.deleteSpeed,
        pauseDuration: v.pauseDuration,
      }),
    },
    render: (p) => <Typewriter {...as<React.ComponentProps<typeof Typewriter>>(p)} />,
  },
  {
    ...meta("magnetic-button", "MagneticButton"),
    code: magneticButtonCode,
    scale: 0.8,
    props: { strength: 0.4 },
    tweak: {
      config: {
        strength: [0.4, 0, 1, 0.05],
        label: "Magnetic",
        spring: { type: "spring", stiffness: 150, damping: 15, mass: 0.1 },
      },
      toProps: (v) => ({ strength: v.strength, label: v.label, spring: spring(v.spring) }),
    },
    render: (p) => <MagneticButton {...as<React.ComponentProps<typeof MagneticButton>>(p)} />,
  },
  {
    ...meta("letter-swap", "LetterSwap"),
    code: letterSwapCode,
    props: { words: ["Motion", "Design", "Create", "Morph!"], interval: 2500, stiffness: 120, damping: 18 },
    tweak: {
      config: {
        words: "Motion, Design, Create, Morph!",
        interval: [2500, 600, 6000, 100],
        spring: { type: "spring", stiffness: 120, damping: 18 },
      },
      toProps: (v) => {
        const s = spring(v.spring);
        // Physics springs map onto the stiffness/damping props; time-based
        // springs use the full `spring` override.
        const timed = "visualDuration" in s || "bounce" in s;
        return {
          words: list(v.words),
          interval: v.interval,
          ...(timed ? { spring: s } : { stiffness: s.stiffness, damping: s.damping }),
        };
      },
    },
    render: (p) => (
      <div className="mk-letter-swap">
        <LetterSwap {...as<React.ComponentProps<typeof LetterSwap>>(p)} />
      </div>
    ),
  },
  {
    ...meta("parallax-tilt-card", "ParallaxTiltCard"),
    code: parallaxTiltCardCode,
    scale: 0.55,
    props: { maxTilt: 20, glare: true },
    tweak: {
      config: {
        maxTilt: [20, 0, 45, 0.5],
        glare: true,
        title: "3D parallax",
        description: "Tilt your device or move your mouse to explore the depth.",
        spring: { type: "spring", stiffness: 100, damping: 10, mass: 1 },
      },
      toProps: (v) => ({
        maxTilt: v.maxTilt,
        glare: v.glare,
        title: v.title,
        description: v.description,
        spring: spring(v.spring),
      }),
    },
    render: (p) => <ParallaxTiltCard {...as<React.ComponentProps<typeof ParallaxTiltCard>>(p)} />,
  },
  {
    ...meta("scroll-reveal", "ScrollReveal"),
    code: scrollRevealCode,
    replay: true,
    props: { direction: "up", delay: 0.1 },
    tweak: {
      config: {
        direction: { type: "select", options: ["up", "down", "left", "right"] },
        delay: [0.1, 0, 1, 0.05],
        duration: [0.8, 0.1, 2, 0.05],
        distance: [50, 0, 150, 1],
        blur: [10, 0, 30, 1],
        ...replayAction,
      },
      toProps: (v) => ({
        direction: v.direction,
        delay: v.delay,
        duration: v.duration,
        distance: v.distance,
        blur: v.blur,
      }),
    },
    render: (p) => (
      <ScrollReveal {...as<Omit<React.ComponentProps<typeof ScrollReveal>, "children">>(p)}>
        <div className="mk-reveal-chip">Scroll me</div>
      </ScrollReveal>
    ),
  },
  {
    ...meta("squiggly-text", "SquigglyText"),
    code: squigglyTextCode,
    props: { text: "Wiggly!", speed: 0.4, scale: 6, baseFrequency: 0.02 },
    tweak: {
      config: {
        text: "Wiggly!",
        speed: [0.4, 0.1, 2, 0.05],
        scale: [6, 0, 20, 0.5],
        baseFrequency: [0.02, 0.005, 0.1, 0.005],
      },
      toProps: (v) => ({ text: v.text, speed: v.speed, scale: v.scale, baseFrequency: v.baseFrequency }),
    },
    render: (p) => (
      <div className="mk-squiggly">
        <SquigglyText {...as<React.ComponentProps<typeof SquigglyText>>(p)} />
      </div>
    ),
  },
  {
    ...meta("bunny-mascot", "BunnyIcon"),
    code: bunnyIconCode,
    props: { size: 140 },
    tweak: {
      config: {
        size: [140, 60, 220, 2],
        mood: { type: "select", options: ["auto", "awake", "sleeping", "surprised"] },
      },
      toProps: (v) => ({ size: v.size, forceEmotion: v.mood === "auto" ? undefined : v.mood }),
    },
    render: (p) => <BunnyIcon {...as<React.ComponentProps<typeof BunnyIcon>>(p)} />,
  },
];

export const catalogBySlug = Object.fromEntries(catalog.map((c) => [c.slug, c])) as Record<
  string,
  CatalogItem
>;
