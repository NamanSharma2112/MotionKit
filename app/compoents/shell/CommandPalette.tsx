"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CornerDownLeft, Home, LayoutGrid, Moon, Search } from "lucide-react";
import { componentMeta, playgrounds, templatesLink } from "../site";
import { useTheme } from "../theme";

type Entry = {
  id: string;
  group: "Pages" | "Components" | "Actions";
  title: string;
  hint: string;
  icon: React.ReactNode;
  run: () => void;
};

/* Opened from the header or ⌘K. It is a keyboard tool used many times a
   session, so it opens and closes instantly: no transition on purpose. */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return createPortal(<Palette onClose={onClose} />, document.body);
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { toggle } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    return [
      { id: "home", group: "Pages", title: "Home", hint: "Overview", icon: <Home size={15} />, run: go("/") },
      ...[...playgrounds, templatesLink].map((p) => ({
        id: p.href,
        group: "Pages" as const,
        title: p.title,
        hint: p.desc,
        icon: p.icon,
        run: go(p.href),
      })),
      ...Object.entries(componentMeta).map(([slug, m]) => ({
        id: slug,
        group: "Components" as const,
        title: m.title,
        hint: m.description,
        icon: <LayoutGrid size={15} />,
        run: go(`/#${slug}`),
      })),
      {
        id: "theme",
        group: "Actions",
        title: "Toggle light / dark",
        hint: "Switch the colour theme",
        icon: <Moon size={15} />,
        run: () => {
          toggle();
          onClose();
        },
      },
    ];
  }, [router, onClose, toggle]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => `${e.title} ${e.hint}`.toLowerCase().includes(q));
  }, [entries, query]);

  const current = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[current]?.run();
    }
  };

  let lastGroup = "";

  return (
    <div className="mk-palette-backdrop" onPointerDown={onClose}>
      <div
        className="mk-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="mk-palette-input">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search components, playgrounds…"
            role="combobox"
            aria-expanded="true"
            aria-controls="mk-palette-list"
            aria-activedescendant={results[current] ? `mk-opt-${results[current].id}` : undefined}
          />
          <kbd className="mk-kbd">Esc</kbd>
        </div>

        <div className="mk-palette-list" id="mk-palette-list" role="listbox" ref={listRef}>
          {results.length === 0 && <p className="mk-palette-empty">Nothing matches “{query}”.</p>}
          {results.map((e, i) => {
            const header = e.group !== lastGroup ? e.group : null;
            lastGroup = e.group;
            return (
              <div key={e.id}>
                {header && <p className="mk-palette-group">{header}</p>}
                <div
                  id={`mk-opt-${e.id}`}
                  role="option"
                  aria-selected={i === current}
                  data-index={i}
                  className="mk-palette-item"
                  onPointerMove={() => i !== current && setActive(i)}
                  onClick={e.run}
                >
                  <span className="mk-palette-icon">{e.icon}</span>
                  <span className="mk-palette-text">
                    <span className="mk-palette-title">{e.title}</span>
                    <span className="mk-palette-hint">{e.hint}</span>
                  </span>
                  {i === current && <CornerDownLeft size={14} className="mk-palette-enter" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
