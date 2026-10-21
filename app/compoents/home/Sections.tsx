"use client";

import Link from "next/link";
import * as Accordion from "@radix-ui/react-accordion";
import {
  LayoutGrid,
  LayoutTemplate,
  Plus,
} from "lucide-react";
import { GithubIcon, MotionIcon, ReactIcon, TailwindIcon } from "./icons";
import { playgrounds, templatesLink } from "../site";
import PlaygroundCard from "./PlaygroundCard";

/* ─── Playgrounds ─────────────────────────────── */

export function Playgrounds() {
  return (
    <section className="mk-section" id="playgrounds">
      <div className="mk-section-head">
        <h2 className="mk-h2">Playgrounds for every kind of motion</h2>
        <p className="mk-lead">
          Seven browser tools for drawing, shading and animating, plus templates that put the
          pieces together.
        </p>
      </div>

      <div className="mk-play-grid">
        {[...playgrounds, templatesLink].map((p) => (
          <PlaygroundCard key={p.href} playground={p} />
        ))}
      </div>
    </section>
  );
}

/* ─── Principles ──────────────────────────────── */

const principles = [
  { title: "Spring physics", desc: "Stiffness and damping instead of guessed durations, so motion settles the way objects do." },
  { title: "Interruptible", desc: "Change your mind mid-gesture and the animation follows from where it is." },
  { title: "One file each", desc: "No package to install or keep up to date. The code is yours to edit." },
  { title: "Tunable live", desc: "Every component exposes its springs and timings as props you can dial in on this page." },
  { title: "Light and dark", desc: "Each demo is checked against both themes before it ships." },
  { title: "Small details", desc: "Blur on crossfades, press feedback and staggered entrances come built in." },
];

export function Principles() {
  return (
    <section className="mk-section">
      <div className="mk-principles-wrap">
        <div className="mk-principles-intro">
          <h2 className="mk-h2">Copy once. Own it forever.</h2>
          <p className="mk-lead">
            MotionKit isn&apos;t a dependency. Each component is a single file you paste into your
            project and shape however you like.
          </p>
        </div>
        <dl className="mk-principles">
          {principles.map((p) => (
            <div key={p.title} className="mk-principle">
              <dt>{p.title}</dt>
              <dd>{p.desc}</dd>
            </div>
          ))}
        </dl>
      </div>
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
          <p className="mk-tile-head"><span>Staggered list</span></p>
          <div className="mk-fan-rows"><span /><span /><span /></div>
        </div>
        <div className="mk-fan-card" style={{ "--r": "-6deg", "--x": "-76px", "--y": "10px" } as React.CSSProperties}>
          <p className="mk-tile-head"><span>Play / pause</span></p>
          <div className="mk-fan-play" />
        </div>
        <div className="mk-fan-card mk-fan-front" style={{ "--r": "0deg", "--x": "0px", "--y": "0px" } as React.CSSProperties}>
          <p className="mk-tile-head"><span>magnetic-button.tsx</span></p>
          <pre className="mk-fan-code">
            <span className="mk-tok-kw">import</span> MagneticButton{"\n"}
            <span className="mk-tok-kw">from</span> <span className="mk-tok-str">&quot;./motion&quot;</span>{"\n\n"}
            {"<"}<span className="mk-tok-name">MagneticButton</span>{"\n"}
            {"  strength={0.4}\n"}
            {"/>"}
          </pre>
        </div>
        <div className="mk-fan-card" style={{ "--r": "6deg", "--x": "76px", "--y": "10px" } as React.CSSProperties}>
          <p className="mk-tile-head"><span>Gooey search</span></p>
          <div className="mk-fan-search" />
        </div>
        <div className="mk-fan-card" style={{ "--r": "14deg", "--x": "150px", "--y": "34px", "--z": 0 } as React.CSSProperties}>
          <p className="mk-tile-head"><span>Squiggly text</span></p>
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
