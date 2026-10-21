"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { catalog } from "./catalog";
import { GithubIcon, MotionIcon, NextIcon, ReactIcon, TailwindIcon } from "./icons";

// Similar-length words keep the centred line steady as they swap.
const WORDS = ["Interfaces", "Dashboards", "Onboarding", "Portfolios", "Checkouts"];
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* Cycles the last word of the headline. All words share one grid cell, so the
   line keeps the width of the longest word and nothing around it reflows. */
function RotatingWord() {
  const [i, setI] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2600);
    return () => clearInterval(id);
  }, []);

  const offset = reduceMotion ? "0px" : "0.18em";

  return (
    <span className="mk-word-slot">
      {/* Invisible sizers reserve the widest word's space. */}
      {WORDS.map((w) => (
        <span key={w} className="mk-word-sizer" aria-hidden>
          {w}
        </span>
      ))}
      <AnimatePresence initial={false}>
        <motion.span
          key={WORDS[i]}
          className="mk-word"
          initial={{ opacity: 0, filter: "blur(6px)", transform: `translateY(${offset})` }}
          animate={{ opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }}
          exit={{
            opacity: 0,
            filter: "blur(6px)",
            transform: `translateY(-${offset})`,
            transition: { duration: 0.2, ease: EASE_OUT },
          }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
        >
          {WORDS[i]}
          <span className="mk-caret" aria-hidden />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const stack = [
  { icon: <ReactIcon size={14} />, name: "React", version: "v19.2" },
  { icon: <TailwindIcon size={14} />, name: "Tailwind CSS", version: "v4" },
  { icon: <MotionIcon size={14} />, name: "Motion", version: "v12" },
  { icon: <NextIcon size={14} />, name: "Next.js", version: "v16" },
];

export default function Hero() {
  return (
    <section className="mk-hero">
      <div className="mk-hero-glow" aria-hidden />

      <Link href="#svg-gradient-trace" className="mk-pill mk-rise" style={{ "--d": "0ms" } as React.CSSProperties}>
        <span className="mk-pill-tag">New</span>
        SVG gradient trace just landed
        <ArrowRight size={13} className="mk-pill-arrow" />
      </Link>

      <h1 className="mk-hero-title mk-rise" style={{ "--d": "60ms" } as React.CSSProperties}>
        Motion components
        <br />
        for <RotatingWord />
      </h1>

      <p className="mk-hero-sub mk-rise" style={{ "--d": "120ms" } as React.CSSProperties}>
        MotionKit is a free collection of {catalog.length} hand-tuned React animations, plus seven
        playgrounds for SVG, shaders, ASCII and more. Copy a file, paste it, ship it.
      </p>

      <div className="mk-hero-ctas mk-rise" style={{ "--d": "180ms" } as React.CSSProperties}>
        <Link href="#components" className="mk-btn mk-btn-primary">
          <LayoutGrid size={15} />
          Browse components
        </Link>
        <a
          href="https://github.com/NamanSharma2112/MotionKit"
          target="_blank"
          rel="noopener noreferrer"
          className="mk-btn mk-btn-ghost"
        >
          <GithubIcon size={15} />
          Star on GitHub
        </a>
      </div>

      <ul className="mk-stack mk-rise" style={{ "--d": "240ms" } as React.CSSProperties}>
        {stack.map((s) => (
          <li key={s.name}>
            {s.icon}
            <span>{s.name}</span>
            <span className="mk-stack-ver">{s.version}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
