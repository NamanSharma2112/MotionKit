"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Globe, Mail, X } from "lucide-react";

const EMAIL = "namansharmans03@gmail.com";

const links = [
  {
    href: `mailto:${EMAIL}`,
    label: "Send an email",
    hint: EMAIL,
    icon: <Mail size={15} />,
    external: false,
  },
  {
    href: "https://namansharma.com",
    label: "See my portfolio",
    hint: "namansharma.com",
    icon: <Globe size={15} />,
    external: true,
  },
];

/* Floating contact card. It grows out of its trigger's corner (origin-aware),
   opens a touch slower than it closes, and closes on Escape or outside click. */
export default function ContactButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mk-contact" ref={rootRef}>
      <div
        id={panelId}
        className="mk-contact-panel"
        data-open={open}
        role="dialog"
        aria-label="Contact Naman Sharma"
        inert={!open}
      >
        <div className="mk-contact-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/avatar.jpg" alt="" className="mk-contact-avatar" />
          <div>
            <p className="mk-contact-name">Naman Sharma</p>
            <p className="mk-contact-role">Creator of MotionKit</p>
          </div>
        </div>

        <p className="mk-contact-lead">
          Have a question, some feedback, or a project in mind? I&apos;d love to hear from you.
        </p>

        <a
          ref={firstLinkRef}
          href="https://calendly.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mk-btn mk-btn-primary mk-contact-cta"
        >
          <CalendarDays size={15} />
          Book a call
        </a>

        <ul className="mk-contact-links">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="mk-contact-link"
              >
                <span className="mk-contact-link-icon">{l.icon}</span>
                <span className="mk-contact-link-text">
                  <span className="mk-contact-link-label">{l.label}</span>
                  <span className="mk-contact-link-hint">{l.hint}</span>
                </span>
                <ArrowUpRight size={15} className="mk-contact-link-arrow" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <button
        ref={triggerRef}
        type="button"
        className="mk-contact-trigger"
        data-open={open}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close contact card" : "Contact Naman Sharma"}
        onClick={() => setOpen((v) => !v)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/avatar.jpg" alt="" className="mk-contact-trigger-avatar" />
        <span className="mk-contact-trigger-close" aria-hidden>
          <X size={18} />
        </span>
      </button>
    </div>
  );
}
