"use client";

import { useEffect, useState } from "react";

export type TocSection = {
  id: string;
  label: string;
  description?: string;
  children?: { id: string; label: string; description?: string }[];
};

export default function TableOfContents({ sections }: { sections: TocSection[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const ids = sections.flatMap((s) =>
      s.children ? [s.id, ...s.children.map((c) => c.id)] : [s.id]
    );

    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="toc-nav">
      <div className="toc-header">
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className="toc-hamburger">
          <line x1="0" y1="1"  x2="14" y2="1"  stroke="currentColor" strokeWidth="1.5" />
          <line x1="0" y1="5"  x2="14" y2="5"  stroke="currentColor" strokeWidth="1.5" />
          <line x1="0" y1="9"  x2="14" y2="9"  stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span>Table of Contents</span>
      </div>

      <ul className="toc-list">
        {sections.map((section) => {
          const isParentActive =
            activeId === section.id ||
            section.children?.some((c) => c.id === activeId);

          return (
            <li key={section.id} className="toc-group">
              <button
                onClick={() => scrollTo(section.id)}
                className={`toc-item toc-parent ${isParentActive ? "toc-active" : ""}`}
              >
                <span className="toc-dash" />
                <span className="toc-label-wrap">
                  <span className="toc-label-text">{section.label}</span>
                  {section.description && (
                    <span className="toc-label-desc">{section.description}</span>
                  )}
                </span>
              </button>

              {section.children && (
                <ul className="toc-children">
                  {section.children.map((child) => (
                    <li key={child.id}>
                      <button
                        onClick={() => scrollTo(child.id)}
                        className={`toc-item toc-child ${activeId === child.id ? "toc-active" : ""}`}
                      >
                        <span className="toc-dash" />
                        <span className="toc-label-wrap">
                          <span className="toc-label-text">{child.label}</span>
                          {child.description && (
                            <span className="toc-label-desc">{child.description}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
