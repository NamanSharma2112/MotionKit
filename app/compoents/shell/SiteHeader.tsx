"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Moon, Search, Sun } from "lucide-react";
import BrandMark from "./BrandMark";
import { initTheme, useTheme } from "../theme";
import { playgrounds, templatesLink } from "../site";
import { GithubIcon } from "../home/icons";
import CommandPalette from "./CommandPalette";

function PlaygroundsMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close when the route changes, on outside click, and on Escape.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mk-menu" ref={rootRef}>
      <button
        type="button"
        className="mk-header-link"
        data-active={active}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        Playgrounds
        <ChevronDown size={14} className="mk-menu-chevron" />
      </button>
      <div className="mk-menu-panel" data-open={open} inert={!open}>
        <div className="mk-menu-grid">
          {[...playgrounds, templatesLink].map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="mk-menu-item"
              data-active={pathname === p.href}
            >
              <span className="mk-play-icon">{p.icon}</span>
              <span>
                <span className="mk-menu-title">{p.title}</span>
                <span className="mk-menu-desc">{p.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ⌘K / Ctrl+K anywhere, "/" when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onTool = playgrounds.some((p) => p.href === pathname);

  return (
    <>
      <header className="mk-header" data-scrolled={scrolled}>
        <div className="mk-header-inner">
          <Link href="/" className="mk-brand" aria-label="MotionKit home">
            <span className="mk-brand-mark">
              <BrandMark />
            </span>
            <span className="mk-brand-word">MotionKit</span>
          </Link>

          <nav className="mk-header-links" aria-label="Primary">
            <Link href="/#components" className="mk-header-link" data-active={pathname === "/"}>
              Components
            </Link>
            <PlaygroundsMenu active={onTool} />
            <Link
              href="/templates"
              className="mk-header-link"
              data-active={pathname === "/templates"}
            >
              Templates
            </Link>
            <Link href="/#faq" className="mk-header-link">
              FAQ
            </Link>
          </nav>

          <div className="mk-header-actions">
            <button
              type="button"
              className="mk-search-pill"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search components and playgrounds"
            >
              <Search size={14} />
              <span className="mk-hide-sm">Quick search</span>
              <kbd className="mk-kbd mk-hide-sm">⌘K</kbd>
            </button>
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
              aria-label="MotionKit on GitHub"
            >
              <GithubIcon size={15} />
              <span className="mk-hide-md">Star on GitHub</span>
            </a>
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
