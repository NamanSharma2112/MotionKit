"use client";

import Link from "next/link";
import * as Accordion from "@radix-ui/react-accordion";
import {
  ArrowRight,
  Box,
  Code2,
  FileCode2,
  Hand,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  Moon,
  PenTool,
  Plus,
  Sparkles,
  Terminal,
  Waves,
} from "lucide-react";
import { GithubIcon, MotionIcon, ReactIcon, TailwindIcon } from "./icons";

/* ─── Playgrounds ─────────────────────────────── */

const playgrounds = [
  { href: "/svg", title: "SVG maker", desc: "Draw paths and export animated SVG.", icon: <PenTool size={15} />, art: "svg" },
  { href: "/shaders", title: "Shaders", desc: "Tweak GPU gradients in real time.", icon: <Sparkles size={15} />, art: "shader" },
  { href: "/ascii", title: "ASCII animator", desc: "Turn frames into living text art.", icon: <Terminal size={15} />, art: "ascii" },
  { href: "/isometric", title: "Isometric maker", desc: "Stack blocks on an isometric grid.", icon: <Box size={15} />, art: "iso" },
  { href: "/shadow", title: "Shadow play", desc: "Layer soft, realistic box shadows.", icon: <Layers size={15} />, art: "shadow" },
  { href: "/background", title: "Backgrounds", desc: "Dot, grid and gradient patterns.", icon: <ImageIcon size={15} />, art: "bg" },
  { href: "/css", title: "CSS playground", desc: "Try properties and copy the result.", icon: <Code2 size={15} />, art: "css" },
  { href: "/templates", title: "Templates", desc: "Bigger compositions, ready to drop in.", icon: <LayoutTemplate size={15} />, art: "tpl" },
];

function PlaygroundArt({ kind }: { kind: string }) {
  switch (kind) {
    case "svg":
      return (
        <svg viewBox="0 0 120 60" className="mk-art-svg" aria-hidden>
          <path d="M8 46 C 30 4, 52 4, 60 30 S 92 58, 112 14" pathLength={1} />
          <circle cx="8" cy="46" r="3" />
          <circle cx="112" cy="14" r="3" />
        </svg>
      );
    case "shader":
      return <div className="mk-art-shader" aria-hidden />;
    case "ascii":
      return (
        <pre className="mk-art-ascii" aria-hidden>
          {"  .:-=+*#%@\n .:-=+*#%@%\n:-=+*#%@%#*\n-=+*#%@%#*+"}
        </pre>
      );
    case "iso":
      return (
        <div className="mk-art-iso" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      );
    case "shadow":
      return <div className="mk-art-shadow" aria-hidden />;
    case "bg":
      return <div className="mk-art-bg" aria-hidden />;
    case "css":
      return (
        <code className="mk-art-css" aria-hidden>
          <span>transform</span>: scale(<b>0.97</b>);
        </code>
      );
    default:
      return (
        <div className="mk-art-tpl" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      );
  }
}

export function Playgrounds() {
  return (
    <section className="mk-section" id="playgrounds">
      <div className="mk-section-head">
        <span className="mk-eyebrow">
          <LayoutGrid size={13} /> Beyond components
        </span>
        <h2 className="mk-h2">Playgrounds for every kind of motion</h2>
        <p className="mk-lead">
          Seven browser tools for drawing, shading and animating, plus templates that put the
          pieces together.
        </p>
      </div>

      <div className="mk-play-grid">
        {playgrounds.map((p) => (
          <Link key={p.href} href={p.href} className="mk-play">
            <div className="mk-play-art">
              <PlaygroundArt kind={p.art} />
            </div>
            <div className="mk-play-body">
              <span className="mk-play-icon">{p.icon}</span>
              <div>
                <h3 className="mk-card-title">{p.title}</h3>
                <p className="mk-card-desc">{p.desc}</p>
              </div>
              <ArrowRight size={15} className="mk-play-arrow" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── Principles ──────────────────────────────── */

const principles = [
  { icon: <Waves size={16} />, title: "Spring physics", desc: "Stiffness and damping instead of guessed durations." },
  { icon: <Hand size={16} />, title: "Interruptible", desc: "Change your mind mid-gesture and the motion follows." },
  { icon: <FileCode2 size={16} />, title: "One file each", desc: "No package to install. The code is yours to edit." },
  { icon: <Code2 size={16} />, title: "TypeScript first", desc: "Typed props, sensible defaults, zero config." },
  { icon: <Moon size={16} />, title: "Light and dark", desc: "Every demo is tuned for both themes." },
  { icon: <Sparkles size={16} />, title: "Small details", desc: "Blur on crossfades, press states, staggered entrances." },
];

export function Principles() {
  return (
    <section className="mk-section">
      <div className="mk-section-head">
        <h2 className="mk-h2">Copy once. Own it forever.</h2>
        <p className="mk-lead">
          MotionKit isn&apos;t a dependency. Each component is a single file you paste into your
          project and shape however you like.
        </p>
      </div>
      <ul className="mk-principles">
        {principles.map((p) => (
          <li key={p.title}>
            <span className="mk-principle-icon">{p.icon}</span>
            <div>
              <p className="mk-card-title">{p.title}</p>
              <p className="mk-card-desc">{p.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─── FAQ ─────────────────────────────────────── */

const faqs = [
  {
    q: "Is MotionKit free?",
    a: "Yes. Every component and playground is free, and the source lives on GitHub.",
  },
  {
    q: "How do I add a component?",
    a: "Hover a card and press the copy icon. Paste the code into a new file in your project, then import it like any other component.",
  },
  {
    q: "What does it depend on?",
    a: "React and Motion (formerly Framer Motion). Most components are styled with Tailwind CSS classes, which you can swap for your own styles.",
  },
  {
    q: "Can I change how an animation feels?",
    a: "Yes. Spring stiffness, damping, delays and colours are exposed as props or as constants at the top of each file.",
  },
  {
    q: "What are the playgrounds?",
    a: "Browser tools for SVG paths, shaders, ASCII art, isometric scenes, shadows, backgrounds and CSS. They're for exploring and exporting, not installing.",
  },
  {
    q: "Does it support dark mode?",
    a: "Yes. Use the moon icon in the header to switch themes; every demo is tuned for both.",
  },
];

export function Faq() {
  return (
    <section className="mk-section mk-faq-section" id="faq">
      <span className="mk-float mk-float-a" aria-hidden>
        <ReactIcon size={44} />
      </span>
      <span className="mk-float mk-float-b" aria-hidden>
        <TailwindIcon size={44} />
      </span>
      <span className="mk-float mk-float-c" aria-hidden>
        <MotionIcon size={40} />
      </span>

      <div className="mk-section-head">
        <h2 className="mk-h2">
          Frequently
          <br />
          asked questions
        </h2>
        <p className="mk-lead">Anything else? Open an issue on GitHub.</p>
      </div>

      <Accordion.Root type="single" collapsible className="mk-faq">
        {faqs.map((f) => (
          <Accordion.Item key={f.q} value={f.q} className="mk-faq-item">
            <Accordion.Header asChild>
              <h3>
                <Accordion.Trigger className="mk-faq-trigger">
                  {f.q}
                  <Plus size={15} className="mk-faq-plus" aria-hidden />
                </Accordion.Trigger>
              </h3>
            </Accordion.Header>
            <Accordion.Content className="mk-faq-content">
              <p>{f.a}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>

      <div className="mk-faq-more">
        <div>
          <p className="mk-card-title">Still have a question?</p>
          <p className="mk-card-desc">Issues and ideas are welcome.</p>
        </div>
        <a
          href="https://github.com/NamanSharma2112/MotionKit/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="mk-btn mk-btn-ghost mk-btn-sm"
        >
          <GithubIcon size={14} /> Open an issue
        </a>
      </div>
    </section>
  );
}

/* ─── Closing CTA ─────────────────────────────── */

export function ClosingCta() {
  return (
    <section className="mk-section mk-cta">
      <div className="mk-fan" aria-hidden>
        <div className="mk-fan-card" style={{ "--r": "-14deg", "--x": "-150px", "--y": "34px", "--z": 0 } as React.CSSProperties}>
          <p className="mk-tile-head"><span>Inbox</span></p>
          <div className="mk-fan-rows"><span /><span /><span /></div>
        </div>
        <div className="mk-fan-card" style={{ "--r": "-6deg", "--x": "-76px", "--y": "10px" } as React.CSSProperties}>
          <p className="mk-tile-head"><span>Now playing</span></p>
          <div className="mk-fan-play" />
        </div>
        <div className="mk-fan-card mk-fan-front" style={{ "--r": "0deg", "--x": "0px", "--y": "0px" } as React.CSSProperties}>
          <p className="mk-tile-head">
            <span>Copies this week</span>
            <span className="mk-tile-meta">+14.8%</span>
          </p>
          <p className="mk-fan-num">100+</p>
          <svg viewBox="0 0 160 40" className="mk-fan-spark">
            <path d="M0 32 L18 30 L30 34 L44 20 L58 26 L72 12 L88 22 L102 8 L118 18 L134 6 L160 14" />
          </svg>
        </div>
        <div className="mk-fan-card" style={{ "--r": "6deg", "--x": "76px", "--y": "10px" } as React.CSSProperties}>
          <p className="mk-tile-head"><span>Search</span></p>
          <div className="mk-fan-search" />
        </div>
        <div className="mk-fan-card" style={{ "--r": "14deg", "--x": "150px", "--y": "34px", "--z": 0 } as React.CSSProperties}>
          <p className="mk-tile-head"><span>Wobble</span></p>
          <p className="mk-fan-word">Wiggly!</p>
        </div>
      </div>

      <h2 className="mk-h2">
        Start shipping interfaces
        <br />
        that feel alive
      </h2>
      <p className="mk-lead">Grab a component, paste it in, and tune the spring until it feels right.</p>
      <div className="mk-hero-ctas">
        <Link href="#components" className="mk-btn mk-btn-primary">
          <LayoutGrid size={15} /> Browse components
        </Link>
        <Link href="/templates" className="mk-btn mk-btn-ghost">
          <LayoutTemplate size={15} /> See templates
        </Link>
      </div>
    </section>
  );
}
