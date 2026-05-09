"use client";

import { useState } from "react";
import { editProfileCode } from "./compoents/EditProfileModalCode";
import EditProfileModal from "./compoents/EditProfileModal";
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
import TableOfContents, { TocSection } from "./compoents/TableOfContents";

const tocSections: TocSection[] = [
  { id: "section-forms",      label: "Forms & Modals" },
  { id: "section-animations", label: "Animations" },
  { id: "section-buttons",    label: "Buttons" },
  { id: "section-text",       label: "Text Effects" },
  { id: "section-cards",      label: "Cards" },
  { id: "section-scroll",     label: "Scroll" },
  { id: "section-mascot",     label: "Mascot" },
];

/* ─── tiny control helpers ──────────────────────── */
function Slider({ label, min, max, step = 1, value, onChange }: {
  label: string; min: number; max: number; step?: number;
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="ctrl-row">
      <span className="ctrl-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="ctrl-slider" />
      <span className="ctrl-val">{value}</span>
    </div>
  );
}

function Toggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="ctrl-row">
      <span className="ctrl-label">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`ctrl-toggle ${value ? "ctrl-toggle-on" : ""}`}
      >
        <span className="ctrl-toggle-knob" />
      </button>
    </div>
  );
}

function Select({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="ctrl-row">
      <span className="ctrl-label">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="ctrl-select">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Controls({ children }: { children: React.ReactNode }) {
  return <div className="ctrls-panel">{children}</div>;
}

/* ─── page ──────────────────────────────────────── */
export default function Home() {
  /* Staggered List */
  const [staggerDelay, setStaggerDelay]     = useState(0.1);
  const [staggerDir, setStaggerDir]         = useState<"up"|"down">("up");

  /* Animated Counter */
  const [counterDur, setCounterDur]         = useState(2);
  const [counterTarget, setCounterTarget]   = useState(100);

  /* Text Scramble */
  const [scrambleText, setScrambleText]     = useState("MotionKit");
  const [scrambleSpeed, setScrambleSpeed]   = useState(50);

  /* Typewriter */
  const [typeSpeed, setTypeSpeed]           = useState(80);
  const [typePause, setTypePause]           = useState(1500);

  /* Parallax Tilt */
  const [tiltMax, setTiltMax]               = useState(20);
  const [tiltGlare, setTiltGlare]           = useState(true);

  /* Scroll Reveal */
  const [revealDir, setRevealDir]           = useState<"up"|"down"|"left"|"right">("up");
  const [revealDelay, setRevealDelay]       = useState(0.1);

  /* Magnetic */
  const [magnetStrength, setMagnetStrength] = useState(0.4);

  return (
    <main className="home-root">
      {/* ── Sidebar TOC ─── */}
      <aside className="home-sidebar">
        <TableOfContents sections={tocSections} />
      </aside>

      {/* ── Main content ─── */}
      <div className="home-content">
        <header className="home-header">
          <h1 className="home-title animate-gradient-text animate-shadow-pulse">
            MotionKit
          </h1>
          <p className="home-subtitle">
            Copy-paste animations, transitions &amp; interactive components for modern web apps.
          </p>
          <div className="home-divider" />
        </header>

        {/* ── Forms & Modals ── */}
        <section id="section-forms" className="home-section">
          <h2 className="section-label">Forms &amp; Modals</h2>
          <div className="cards-grid">
            <ComponentCard
              title="Edit Profile"
              description="A beautiful, responsive edit profile modal with an integrated preview."
              code={editProfileCode}
            >
              <div className="flex items-center justify-center w-full h-full scale-[0.65] sm:scale-75 md:scale-[0.85] origin-center bg-transparent">
                <EditProfileModal />
              </div>
            </ComponentCard>
          </div>
        </section>

        {/* ── Animations ── */}
        <section id="section-animations" className="home-section">
          <h2 className="section-label">Animations</h2>
          <div className="cards-grid">

            <ComponentCard
              title="Staggered List"
              description="Children animate in sequence — each item enters after the previous with a configurable delay and direction."
              showAnimateButton
            >
              <div className="flex items-center justify-center w-full h-full">
                <StaggeredList staggerDelay={staggerDelay} direction={staggerDir} />
              </div>
            </ComponentCard>
            <Controls>
              <Slider label="Delay (s)" min={0.05} max={0.5} step={0.05} value={staggerDelay} onChange={setStaggerDelay} />
              <Select label="Direction" options={["up","down"]} value={staggerDir} onChange={v => setStaggerDir(v as "up"|"down")} />
            </Controls>

            <ComponentCard
              title="Animated Counter"
              description="Numbers count up from zero to a target with cubic easing — great for stats sections."
              showAnimateButton
            >
              <div className="flex items-center justify-center w-full h-full">
                <AnimatedCounter duration={counterDur} target={counterTarget} />
              </div>
            </ComponentCard>
            <Controls>
              <Slider label="Target" min={10} max={999} step={10} value={counterTarget} onChange={setCounterTarget} />
              <Slider label="Duration (s)" min={0.5} max={5} step={0.5} value={counterDur} onChange={setCounterDur} />
            </Controls>

          </div>
        </section>

        {/* ── Buttons ── */}
        <section id="section-buttons" className="home-section">
          <h2 className="section-label">Buttons</h2>
          <div className="cards-grid">

            <ComponentCard
              title="Smooth Button"
              description="Elegant spring-physics button with a fluid hover state and satisfying click compression."
            >
              <div className="flex items-center justify-center w-full h-full">
                <SmoothButton />
              </div>
            </ComponentCard>

            <ComponentCard
              title="Magnetic Button"
              description="Cursor-attracted button that physically follows the mouse within its radius using spring physics."
            >
              <div className="flex items-center justify-center w-full h-full">
                <MagneticButton strength={magnetStrength} />
              </div>
            </ComponentCard>
            <Controls>
              <Slider label="Strength" min={0.1} max={1} step={0.1} value={magnetStrength} onChange={setMagnetStrength} />
            </Controls>

          </div>
        </section>

        {/* ── Text Effects ── */}
        <section id="section-text" className="home-section">
          <h2 className="section-label">Text Effects</h2>
          <div className="cards-grid">

            <ComponentCard
              title="Text Scramble"
              description="Cyberpunk-style decoder that randomises characters then resolves to the final string — perfect for loading states."
              showAnimateButton
            >
              <div className="scale-75 w-full h-full flex items-center justify-center">
                <TextScramble text={scrambleText} delay={scrambleSpeed} />
              </div>
            </ComponentCard>
            <Controls>
              <div className="ctrl-row">
                <span className="ctrl-label">Text</span>
                <input
                  type="text" value={scrambleText}
                  onChange={e => setScrambleText(e.target.value)}
                  className="ctrl-input"
                  maxLength={20}
                />
              </div>
              <Slider label="Speed (ms)" min={10} max={200} step={10} value={scrambleSpeed} onChange={setScrambleSpeed} />
            </Controls>

            <ComponentCard
              title="Typewriter Effect"
              description="Multi-phrase typewriter with blinking cursor, configurable typing speed, and smart pause between strings."
              showAnimateButton
            >
              <div className="flex items-center justify-center w-full h-full px-4 text-center">
                <Typewriter typeSpeed={typeSpeed} pauseDuration={typePause} />
              </div>
            </ComponentCard>
            <Controls>
              <Slider label="Type speed (ms)" min={20} max={200} step={10} value={typeSpeed} onChange={setTypeSpeed} />
              <Slider label="Pause (ms)" min={500} max={4000} step={500} value={typePause} onChange={setTypePause} />
            </Controls>

          </div>
        </section>

        {/* ── Cards ── */}
        <section id="section-cards" className="home-section">
          <h2 className="section-label">Cards</h2>
          <div className="cards-grid">

            <ComponentCard
              title="Parallax Tilt Card"
              description="3D perspective card that rotates to follow the cursor — includes configurable tilt angle and optional glare sheen."
            >
              <div className="flex items-center justify-center w-full h-full">
                <ParallaxTiltCard maxTilt={tiltMax} glare={tiltGlare} />
              </div>
            </ComponentCard>
            <Controls>
              <Slider label="Max tilt (°)" min={5} max={40} value={tiltMax} onChange={setTiltMax} />
              <Toggle label="Glare" value={tiltGlare} onChange={setTiltGlare} />
            </Controls>

          </div>
        </section>

        {/* ── Scroll ── */}
        <section id="section-scroll" className="home-section">
          <h2 className="section-label">Scroll</h2>
          <div className="cards-grid">

            <ComponentCard
              title="Scroll Reveal"
              description="Elements fade and slide into view from any direction when they enter the viewport — zero config needed."
            >
              <div className="flex flex-col items-center justify-center w-full h-full gap-4">
                <ScrollReveal direction={revealDir} delay={revealDelay}>
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl flex items-center justify-center text-white font-bold text-sm">
                    Scroll me
                  </div>
                </ScrollReveal>
              </div>
            </ComponentCard>
            <Controls>
              <Select label="Direction" options={["up","down","left","right"]} value={revealDir} onChange={v => setRevealDir(v as any)} />
              <Slider label="Delay (s)" min={0} max={1} step={0.1} value={revealDelay} onChange={setRevealDelay} />
            </Controls>

          </div>
        </section>



        {/* ── Mascot ── */}
        <section id="section-mascot" className="home-section">
          <h2 className="section-label">Mascot</h2>
          <div className="cards-grid">

            <ComponentCard
              title="Bunny Mascot"
              description="Animated SVG character with eye-tracking — the eyes follow the cursor anywhere on the page."
            >
              <div className="scale-75 w-full h-full flex items-center justify-center">
                <BunnyIcon />
              </div>
            </ComponentCard>

          </div>
        </section>

        <footer className="home-footer">
          <div className="home-divider" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
            Inspired by{" "}
            <a href="https://transitions.dev/" target="_blank" rel="noopener noreferrer"
              className="text-neutral-900 dark:text-white hover:underline underline-offset-4">
              transitions.dev
            </a>
          </p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
            Made with ❤️ by{" "}
            <a href="https://namansharma.com" target="_blank" rel="noopener noreferrer"
              className="text-neutral-900 dark:text-white font-semibold hover:underline underline-offset-4">
              Naman Sharma
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
