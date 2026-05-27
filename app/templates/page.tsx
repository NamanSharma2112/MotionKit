"use client";

import Link from "next/link";
import { editProfileCode } from "../compoents/EditProfileModalCode";
import { appleAccordionCode } from "../compoents/componentCodes";
import EditProfileModal from "../compoents/EditProfileModal";
import AppleAccordion from "../compoents/apple-accordion/AppleAccordion";
import ComponentCard from "../compoents/ComponentCard";

/* ─── templates page ──────────────────────────────────────── */
export default function TemplatesPage() {
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
        <h1 className="landing-title">Templates</h1>
        <p className="landing-subtitle">
          Full-featured, production-ready UI templates you can copy and 
          paste directly into your project.
        </p>

        {/* ── Route Tabs ─── */}
        <nav className="landing-tabs">
          <Link href="/" className="landing-tab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            Components
          </Link>
          <Link href="/templates" className="landing-tab landing-tab-active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            Templates
          </Link>
        </nav>
      </header>

      {/* ── Templates Grid ─── */}
      <section className="landing-grid landing-grid-templates">
        <ComponentCard
          title="Edit Profile"
          description="A beautiful, responsive edit profile modal with an integrated preview. Click to expand."
          code={editProfileCode}
        >
          <div className="flex items-center justify-center w-full h-full origin-center bg-transparent p-4 sm:p-8">
            <EditProfileModal />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Apple Accordion"
          description="A smooth, physics-based expandable accordion inspired by apple.com"
          code={appleAccordionCode}
        >
          <div className="flex items-center justify-center w-full h-full origin-center bg-transparent">
            <AppleAccordion />
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
