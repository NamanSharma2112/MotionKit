"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { DialRoot, useDialKit, type DialConfig } from "dialkit";
import "dialkit/styles.css";
import { useTheme } from "../theme";
import type { CatalogItem, Props } from "./catalog";

/* ─── Which preview is being tweaked (one at a time, site-wide) ─── */

let active: string | null = null;
const listeners = new Set<() => void>();

export function setActiveTweak(id: string | null) {
  active = id;
  listeners.forEach((l) => l());
}

export function useActiveTweak() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => active,
    () => null,
  );
}

/* ─── Default values straight from a DialKit config ─── */

type Opt = string | { value: string; label: string };

function defaultsOf(config: DialConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(config)) {
    if (key.startsWith("_")) continue;
    if (Array.isArray(def)) out[key] = def[0];
    else if (def === null || typeof def !== "object") out[key] = def;
    else if ("type" in def) {
      const d = def as { type: string; default?: unknown; options?: Opt[] };
      if (d.type === "action") continue;
      if (d.type === "spring" || d.type === "easing") out[key] = def;
      else if (d.type === "select") {
        const first = d.options?.[0];
        out[key] = d.default ?? (typeof first === "object" ? first.value : first);
      } else out[key] = d.default;
    } else out[key] = defaultsOf(def as DialConfig);
  }
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Props that differ from the panel defaults, layered over the item's base props. */
export function changedProps(item: CatalogItem, values: Record<string, unknown>) {
  if (!item.tweak) return { props: item.props, changed: [] as string[] };
  const next = item.tweak.toProps(values);
  const base = item.tweak.toProps(defaultsOf(item.tweak.config));
  const changed = Object.keys(next).filter((k) => !same(next[k], base[k]));
  const props: Props = { ...item.props };
  for (const k of changed) props[k] = next[k];
  return { props, changed };
}

/* ─── Bridge: registers the panel and streams props back to the preview ─── */

export function TweakBridge({
  id,
  item,
  onProps,
  onReplay,
}: {
  id: string;
  item: CatalogItem;
  onProps: (props: Props, changed: string[]) => void;
  onReplay: () => void;
}) {
  const config = useMemo<DialConfig>(
    () => ({ ...item.tweak!.config, done: { type: "action", label: "Done tweaking" } }),
    [item],
  );
  const actions = useRef({ onReplay });
  useEffect(() => {
    actions.current.onReplay = onReplay;
  }, [onReplay]);

  const values = useDialKit(item.title, config, {
    id: `mk-${id}`,
    onAction: (a) => {
      if (a === "replay") actions.current.onReplay();
      if (a === "done") setActiveTweak(null);
    },
  }) as Record<string, unknown>;

  const json = JSON.stringify(values);
  const emit = useRef(onProps);
  useEffect(() => {
    emit.current = onProps;
  }, [onProps]);
  useEffect(() => {
    const { props, changed } = changedProps(item, JSON.parse(json));
    emit.current(props, changed);
  }, [json, item]);

  return null;
}

/* ─── The floating panel, themed with the site ─── */

export function TweakRoot() {
  const activeId = useActiveTweak();
  const { theme } = useTheme();
  if (!activeId) return null;
  return <DialRoot position="top-right" theme={theme} productionEnabled />;
}

/* ─── Snippets ─── */

const round = (n: number) => Math.round(n * 10000) / 10000;

function literal(v: unknown): string {
  if (typeof v === "number") return String(round(v));
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(literal).join(", ")}]`;
  if (v && typeof v === "object") {
    const parts = Object.entries(v)
      .filter(([, x]) => x !== undefined)
      .map(([k, x]) => `${k}: ${literal(x)}`);
    return `{ ${parts.join(", ")} }`;
  }
  return String(v);
}

function attr(name: string, v: unknown) {
  if (v === true) return name;
  if (typeof v === "string" && !/["{}]/.test(v)) return `${name}="${v}"`;
  return `${name}={${literal(v)}}`;
}

/** `<Component prop={...} />` for the given props. */
export function usageSnippet(item: CatalogItem, props: Props) {
  const attrs = Object.entries(props)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => attr(k, v));
  const children = item.component === "ScrollReveal" ? "\n  {/* your content */}\n" : null;
  const oneLine = `<${item.component}${attrs.length ? " " + attrs.join(" ") : ""}`;
  const open =
    oneLine.length <= 72
      ? oneLine
      : `<${item.component}\n${attrs.map((a) => `  ${a}`).join("\n")}\n`;
  if (children) return `${open}>${children}</${item.component}>`;
  return `${open}${open.endsWith("\n") ? "" : " "}/>`;
}

function dependencies(code: string) {
  const deps: string[] = [];
  if (/from ["']framer-motion["']/.test(code)) deps.push("framer-motion");
  if (/from ["']motion\/react(-client)?["']/.test(code)) deps.push("motion");
  return deps;
}

/** A prompt someone can paste into an AI assistant to add this component. */
export function aiPrompt(item: CatalogItem, props: Props, changed: string[]) {
  const deps = dependencies(item.code);
  const tailwind = /className=/.test(item.code);
  const file = `components/motion/${item.file}`;
  const lines = [
    `Add the "${item.title}" animation component from MotionKit to my React project.`,
    "",
    `What it does: ${item.description}`,
    "",
    "Steps:",
    deps.length ? `1. Install the dependency: npm install ${deps.join(" ")}` : "1. No extra dependencies are needed beyond React.",
    `2. Create \`${file}\` with the exact source below. Keep the "use client" directive at the top (needed for the Next.js App Router; harmless elsewhere).`,
    "3. Render it where I want it:",
    "",
    "```tsx",
    `import ${item.component} from "@/${file.replace(/\.tsx$/, "")}";`,
    "",
    usageSnippet(item, props),
    "```",
    "",
    "Notes:",
    tailwind
      ? "- It is styled with Tailwind CSS utility classes. If my project doesn't use Tailwind, convert them to equivalent CSS and keep the look the same."
      : "- It is styled with inline styles, so no CSS setup is needed.",
    changed.length
      ? `- ${changed.length === 1 ? "The prop" : "The props"} ${changed.map((c) => `\`${c}\``).join(", ")} ${changed.length === 1 ? "was" : "were"} tuned by hand in MotionKit's live editor. Keep ${changed.length === 1 ? "that value" : "those values"} exactly.`
      : "- The props above are the defaults shown on MotionKit.",
    "- Adjust the import path to match my project's folder structure and path aliases.",
    /useReducedMotion/.test(item.code)
      ? "- Don't change the animation values or remove the reduced-motion handling."
      : "- Don't change the animation values. If my project has a reduced-motion policy, respect it with `useReducedMotion`.",
    "",
    `Source for \`${file}\`:`,
    "",
    "```tsx",
    item.code.trimEnd(),
    "```",
  ];
  return lines.join("\n");
}
