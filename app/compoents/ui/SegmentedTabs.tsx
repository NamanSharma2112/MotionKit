"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export type SegmentedItem<T extends string> = { value: T; label: ReactNode; icon?: ReactNode };

/* Segmented control. The active pill is a second copy of the row clipped to
   the selected item, so pill and text colour move together in one transition. */
export default function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  label,
  size = "md",
}: {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    items.findIndex((i) => i.value === value),
  );

  useLayoutEffect(() => {
    const measure = () => {
      const list = listRef.current;
      const overlay = overlayRef.current;
      const el = itemRefs.current[index];
      if (!list || !overlay || !el) return;
      const left = el.offsetLeft;
      const right = list.offsetWidth - (left + el.offsetWidth);
      overlay.style.clipPath = `inset(0 ${right}px 0 ${left}px round 999px)`;
    };
    measure();
    // First placement is instant; later changes animate.
    const raf = requestAnimationFrame(() => {
      if (overlayRef.current) overlayRef.current.dataset.ready = "true";
    });
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [index]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length;
    onChange(items[next].value);
    itemRefs.current[next]?.focus();
  };

  const row = (decorative: boolean) =>
    items.map((item, i) => (
      <button
        key={item.value}
        ref={decorative ? undefined : (el) => { itemRefs.current[i] = el; }}
        type="button"
        role={decorative ? undefined : "tab"}
        aria-selected={decorative ? undefined : i === index}
        tabIndex={decorative ? -1 : i === index ? 0 : -1}
        className="mk-tab"
        onClick={decorative ? undefined : () => onChange(item.value)}
      >
        {item.icon}
        {item.label}
      </button>
    ));

  return (
    <div className="mk-tabs-wrap">
      <div
        className="mk-tabs"
        data-size={size}
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        {row(false)}
        <div className="mk-tabs-active" ref={overlayRef} aria-hidden>
          {row(true)}
        </div>
      </div>
    </div>
  );
}
