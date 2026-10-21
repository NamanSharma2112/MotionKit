import Link from "next/link";
import AnimatedHeroLogo from "../AnimatedHeroLogo";
import { playgrounds, templatesLink } from "../site";

export default function SiteFooter() {
  return (
    <footer className="mk-site-footer">
      <div className="mk-site-footer-inner">
        <div className="mk-site-footer-brand">
          <Link href="/" className="mk-brand">
            <span className="mk-brand-mark">
              <AnimatedHeroLogo />
            </span>
            MotionKit
          </Link>
          <p className="mk-card-desc">
            Hand-tuned React animations and playgrounds. Copy a file, paste it, ship it.
          </p>
        </div>

        <div className="mk-site-footer-cols">
          <div>
            <p className="mk-site-footer-head">Library</p>
            <Link href="/#components">Components</Link>
            <Link href={templatesLink.href}>Templates</Link>
            <Link href="/#faq">FAQ</Link>
          </div>
          <div>
            <p className="mk-site-footer-head">Playgrounds</p>
            {playgrounds.map((p) => (
              <Link key={p.href} href={p.href}>
                {p.title}
              </Link>
            ))}
          </div>
          <div>
            <p className="mk-site-footer-head">Elsewhere</p>
            <a href="https://github.com/NamanSharma2112/MotionKit" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://namansharma.com" target="_blank" rel="noopener noreferrer">
              Naman Sharma
            </a>
            <a href="https://transitions.dev/" target="_blank" rel="noopener noreferrer">
              transitions.dev
            </a>
          </div>
        </div>
      </div>
      <p className="mk-site-footer-note">
        Made by Naman Sharma. Press <kbd className="mk-kbd">⌘K</kbd> to jump anywhere.
      </p>
    </footer>
  );
}
