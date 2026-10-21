import type { ReactNode } from "react";
import {
  Box,
  Code2,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  PenTool,
  Sparkles,
  Terminal,
} from "lucide-react";

/* Single source for site navigation: the header menu, the ⌘K palette,
   the homepage and the "more playgrounds" rail all read from here. */

export type Playground = {
  href: string;
  title: string;
  desc: string;
  icon: ReactNode;
  art: string;
};

export const playgrounds: Playground[] = [
  { href: "/svg", title: "SVG maker", desc: "Draw paths and export animated SVG.", icon: <PenTool size={15} />, art: "svg" },
  { href: "/shaders", title: "Shaders", desc: "Tweak GPU gradients in real time.", icon: <Sparkles size={15} />, art: "shader" },
  { href: "/ascii", title: "ASCII animator", desc: "Turn images into living text art.", icon: <Terminal size={15} />, art: "ascii" },
  { href: "/isometric", title: "Isometric maker", desc: "Stack blocks on an isometric grid.", icon: <Box size={15} />, art: "iso" },
  { href: "/shadow", title: "Shadow studio", desc: "Layer soft, realistic box shadows.", icon: <Layers size={15} />, art: "shadow" },
  { href: "/background", title: "Backgrounds", desc: "Gradient and grid backdrops.", icon: <ImageIcon size={15} />, art: "bg" },
  { href: "/css", title: "CSS playground", desc: "Try properties and copy the result.", icon: <Code2 size={15} />, art: "css" },
];

export const templatesLink: Playground = {
  href: "/templates",
  title: "Templates",
  desc: "Bigger compositions, ready to drop in.",
  icon: <LayoutTemplate size={15} />,
  art: "tpl",
};

export const componentMeta: Record<string, { title: string; description: string }> = {
  "svg-gradient-trace": { title: "SVG gradient trace", description: "A radial gradient stroke that follows the cursor across SVG paths." },
  "play-pause-morph": { title: "Play / pause morph", description: "Icon paths morph between states on a spring." },
  "gooey-dropdown": { title: "Gooey dropdown", description: "A menu that melts out of its trigger with an SVG goo filter." },
  "animated-counter": { title: "Animated counter", description: "Digits roll into place with blur and stagger." },
  "character-counter": { title: "Character counter", description: "A limit ring whose spring velocity grows as you near the end." },
  "animate-presence-modes": { title: "Presence modes", description: "sync, wait and popLayout exits, side by side." },
  "stacked-cards": { title: "Stacked cards", description: "A draggable deck of 3D cards you can flick away." },
  "gooey-search": { title: "Gooey search", description: "A search button that stretches into an input." },
  "text-scramble": { title: "Text scramble", description: "Characters resolve out of noise with a soft blur." },
  "staggered-list": { title: "Staggered list", description: "Rows cascade in one after another." },
  "smooth-button": { title: "Smooth button", description: "Idle, loading and success states that blur into each other." },
  "typewriter": { title: "Typewriter", description: "Multi-phrase typing with a blinking caret." },
  "magnetic-button": { title: "Magnetic button", description: "A button that leans toward your cursor." },
  "letter-swap": { title: "Letter swap", description: "Shared letters glide between words." },
  "parallax-tilt-card": { title: "Parallax tilt card", description: "3D perspective and glare that track the pointer." },
  "scroll-reveal": { title: "Scroll reveal", description: "Fade and rise as content enters the viewport." },
  "squiggly-text": { title: "Squiggly text", description: "A hand-drawn wobble from an SVG turbulence filter." },
  "bunny-mascot": { title: "Bunny mascot", description: "An SVG character whose eyes follow you around." },
};
