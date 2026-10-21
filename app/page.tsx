import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import Hero from "./compoents/home/Hero";
import HeroCollage from "./compoents/home/HeroCollage";
import ImportLine from "./compoents/home/ImportLine";
import ComponentGrid from "./compoents/home/ComponentGrid";
import Spotlight from "./compoents/home/Spotlight";
import { ClosingCta, Faq, Playgrounds, Principles } from "./compoents/home/Sections";
import { GithubIcon } from "./compoents/home/icons";
import { TweakRoot } from "./compoents/home/tweak";

export default function Home() {
  return (
    <div className="mk-root">
      <main>
        <Hero />
        <HeroCollage />

        <section className="mk-section" id="components">
          <div className="mk-section-head">
            <ImportLine />
            <h2 className="mk-h2">
              Copy-paste components
              <br />
              with motion built in
            </h2>
            <p className="mk-lead">
              Buttons, counters, menus, text effects and SVG tricks. Every card is the real
              component running live.
            </p>
            <div className="mk-hero-ctas">
              <Link href="#gooey-search" className="mk-btn mk-btn-primary">
                <LayoutGrid size={15} /> Start with Gooey search
              </Link>
              <a
                href="https://github.com/NamanSharma2112/MotionKit"
                target="_blank"
                rel="noopener noreferrer"
                className="mk-btn mk-btn-ghost"
              >
                <GithubIcon size={15} /> View source
              </a>
            </div>
          </div>
          <ComponentGrid />
        </section>

        <Spotlight />
        <Playgrounds />
        <Principles />
        <Faq />
        <ClosingCta />
      </main>
      <TweakRoot />

    </div>
  );
}
