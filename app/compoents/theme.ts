"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const EVENT = "mk-themechange";

function read(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme, persist = true) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
  if (persist) {
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }
  window.dispatchEvent(new Event(EVENT));
}

/* Applies the saved (or system) theme. Call once on mount. */
export function initTheme() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("theme");
  } catch {}
  const isDark =
    saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  applyTheme(isDark ? "dark" : "light", false);
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/* Shared theme state, so every toggle on the page stays in sync. */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, read, () => "light");
  const toggle = () => applyTheme(theme === "light" ? "dark" : "light");
  return { theme, toggle };
}
