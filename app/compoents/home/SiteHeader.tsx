"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AnimatedHeroLogo from "../AnimatedHeroLogo";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme";
import { GithubIcon } from "./icons";

const links = [
  { href: "#components", label: "Components" },
  { href: "#playgrounds", label: "Playgrounds" },
  { href: "/templates", label: "Templates" },
  { href: "#faq", label: "FAQ" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="mk-header" data-scrolled={scrolled}>
      <div className="mk-header-inner">
        <Link href="/" className="mk-brand" aria-label="MotionKit home">
          <span className="mk-brand-mark">
            <AnimatedHeroLogo />
          </span>
          MotionKit
        </Link>

        <nav className="mk-header-links" aria-label="Primary">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="mk-header-link">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mk-header-actions">
          <button
            type="button"
            className="mk-icon-btn mk-theme-btn"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title="Toggle theme"
          >
            <span className="mk-swap" data-state={theme === "dark" ? "b" : "a"}>
              <Moon size={15} className="mk-swap-a" />
              <Sun size={15} className="mk-swap-b mk-sun" />
            </span>
          </button>
          <a
            href="https://github.com/NamanSharma2112/MotionKit"
            target="_blank"
            rel="noopener noreferrer"
            className="mk-btn mk-btn-ghost mk-btn-sm"
          >
            <GithubIcon size={15} />
            <span className="mk-hide-sm">Star on GitHub</span>
          </a>
          <Link href="#components" className="mk-btn mk-btn-primary mk-btn-sm">
            Browse
          </Link>
        </div>
      </div>
    </header>
  );
}
