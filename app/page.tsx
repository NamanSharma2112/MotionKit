"use client";

import Link from "next/link";
import Gooey from "./compoents/Gooey";
import TextScramble from "./compoents/TextScramble";
import BunnyIcon from "./compoents/BunnyIcon";
import SmoothButton from "./compoents/button";
import ComponentCard from "./compoents/ComponentCard";
import StaggeredList from "./compoents/StaggeredList";
import MagneticButton from "./compoents/MagneticButton";
import AnimatedCounter from "./compoents/AnimatedCounter";
import ParallaxTiltCard from "./compoents/ParallaxTiltCard";
import ScrollReveal from "./compoents/ScrollReveal";
import Typewriter from "./compoents/Typewriter";
import LetterSwap from "./compoents/LetterSwap";
import SquigglyText from "./compoents/SquigglyText";
import CharacterCounter from "./compoents/CharacterCounter";

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
} from "./compoents/componentCodes";

/* ─── page ──────────────────────────────────────── */
export default function Home() {
  return (
    <main className="landing-root">
      {/* ── Edge glow effects ─── */}
      <div className="edge-glow edge-glow-left" />
      <div className="edge-glow edge-glow-right" />
      <div className="edge-glow edge-glow-bottom" />
      <div className="edge-glow edge-glow-top" />

      {/* ── Hero Section ─── */}
      <header className="landing-hero">
        <div className="landing-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="landing-title">MotionKit</h1>
        <p className="landing-subtitle">
          Collection of the most essential animations & transitions for web apps
          that you can just copy and paste into any project.
        </p>

        {/* ── Route Tabs ─── */}
        <nav className="landing-tabs">
          <Link href="/" className="landing-tab landing-tab-active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            Components
          </Link>
          <Link href="/templates" className="landing-tab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            Templates
          </Link>
        </nav>
      </header>

      {/* ── Card Grid ─── */}
      <section className="landing-grid">
        <ComponentCard
          title="Animated Counter"
          description="Digit flip with blur and stagger"
          code={animatedCounterCode}
          showAnimateButton
        >
          <div className="flex items-center justify-center w-full h-full">
            <AnimatedCounter duration={2} target={100} />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Character Counter"
          description="Dynamic spring physics character limit counter"
          code={characterCounterCode}
          showAnimateButton
        >
          <div className="scale-75 sm:scale-90 w-full h-full flex items-center justify-center">
            <CharacterCounter />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Gooey Search"
          description="A slick search input with a gooey SVG filter effect."
          code={gooeyCode}
        >
          <div className="flex items-center justify-center w-full h-full">
            <Gooey />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Text Scramble"
          description="Text swap transition with blur"
          code={textScrambleCode}
          showAnimateButton
        >
          <div className="scale-75 w-full h-full flex items-center justify-center">
            <TextScramble text="MotionKit" delay={50} />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Staggered List"
          description="Staggered item entrance animation"
          code={staggeredListCode}
          showAnimateButton
        >
          <div className="flex items-center justify-center w-full h-full">
            <StaggeredList staggerDelay={0.1} direction="up" />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Smooth Button"
          description="Spring-physics button with fluid hover"
          code={smoothButtonCode}
        >
          <div className="flex items-center justify-center w-full h-full">
            <SmoothButton />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Typewriter Effect"
          description="Multi-phrase typewriter with blinking cursor"
          code={typewriterCode}
          showAnimateButton
        >
          <div className="flex items-center justify-center w-full h-full px-4 text-center">
            <Typewriter typeSpeed={80} pauseDuration={1500} />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Magnetic Button"
          description="Cursor-attracted spring physics button"
          code={magneticButtonCode}
        >
          <div className="flex items-center justify-center w-full h-full">
            <MagneticButton strength={0.4} />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Letter Swap"
          description="Layout-animated word cycler with shared letter transitions"
          code={letterSwapCode}
        >
          <div className="flex items-center justify-center w-full h-full">
            <div style={{ fontSize: '3rem', color: 'var(--foreground)', fontFamily: 'var(--font-mono, monospace)' }}>
              <LetterSwap
                words={["Motion", "Design", "Create", "Morph!"]}
                interval={2500}
                stiffness={120}
                damping={18}
              />
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Parallax Tilt Card"
          description="3D perspective card with cursor tracking"
          code={parallaxTiltCardCode}
        >
          <div className="flex items-center justify-center w-full h-full">
            <ParallaxTiltCard maxTilt={20} glare={true} />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Scroll Reveal"
          description="Fade and slide on viewport entry"
          code={scrollRevealCode}
        >
          <div className="flex flex-col items-center justify-center w-full h-full gap-4">
            <ScrollReveal direction="up" delay={0.1}>
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl flex items-center justify-center text-white font-bold text-sm">
                Scroll me
              </div>
            </ScrollReveal>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Squiggly Text"
          description="Pure CSS + SVG wiggle filter effect"
          code={squigglyTextCode}
        >
          <div className="flex items-center justify-center w-full h-full">
            <div style={{ fontSize: '2.8rem', color: 'var(--foreground)' }}>
              <SquigglyText
                text="Wiggly!"
                speed={0.4}
                scale={6}
                baseFrequency={0.02}
              />
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Bunny Mascot"
          description="Animated SVG character with eye-tracking"
          code={bunnyIconCode}
        >
          <div className="scale-75 w-full h-full flex items-center justify-center">
            <BunnyIcon />
          </div>
        </ComponentCard>
      </section>

      {/* ── Footer ─── */}
      <footer className="landing-footer">
        <p className="landing-footer-text">
          Inspired by{" "}
          <a href="https://transitions.dev/" target="_blank" rel="noopener noreferrer"
            className="landing-footer-link">
            transitions.dev
          </a>
        </p>
        <p className="landing-footer-credit">
          Made with ❤️ by{" "}
          <a href="https://namansharma.com" target="_blank" rel="noopener noreferrer"
            className="landing-footer-link landing-footer-link-bold">
            Naman Sharma
          </a>
        </p>
      </footer>
    </main>
  );
}
