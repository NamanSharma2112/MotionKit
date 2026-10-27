"use client";

/*
  Workspace dashboard
  A calm, dense project-management home: sidebar, command palette, task list,
  project progress, deadlines, activity and toasts. Everything is local state,
  so every control works without a backend.

  Dependencies: react, framer-motion, lucide-react, Tailwind CSS v4.
  Dark mode follows a `.dark` class on an ancestor (Tailwind `dark:` variant).
*/

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent as ReactFocusEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useIsPresent,
  useReducedMotion,
} from "framer-motion";
import {
  Activity,
  Archive,
  ArrowDown,
  ArrowUp,
  Bell,
  Calendar,
  ChartGantt,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CircleCheck,
  CircleDashed,
  Clock,
  CornerDownLeft,
  FileText,
  FolderKanban,
  Globe,
  Headset,
  House,
  Inbox,
  Kanban,
  LayoutGrid,
  List,
  ListTodo,
  Lock,
  Maximize2,
  Megaphone,
  Menu,
  PanelLeft,
  Plus,
  Rocket,
  Search,
  Shapes,
  Smartphone,
  Star,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   Seed data
   Due dates are day offsets from today, so the demo always looks current.
   ──────────────────────────────────────────────────────────────────────────── */

const ME = "am";
const USER_FIRST_NAME = "Alex";

const WORKSPACES = [
  { id: "northwind", name: "Northwind Studio", letter: "N" },
  { id: "halcyon", name: "Halcyon Labs", letter: "H" },
];

type Tone = "blue" | "green" | "rose" | "amber" | "slate";
type Member = { id: string; name: string; initials: string; tone: Tone; email?: string };

const MEMBERS: Member[] = [
  { id: "am", name: "Alex Morgan", initials: "AM", tone: "blue" },
  { id: "sc", name: "Sara Chen", initials: "SC", tone: "rose" },
  { id: "jc", name: "Jordan Cole", initials: "JC", tone: "green" },
  { id: "ew", name: "Emma Wright", initials: "EW", tone: "amber" },
  { id: "pp", name: "Priya Patel", initials: "PP", tone: "slate" },
  { id: "lm", name: "Leo Martin", initials: "LM", tone: "blue" },
  { id: "nk", name: "Noah Kim", initials: "NK", tone: "green" },
  { id: "mo", name: "Maya Ortiz", initials: "MO", tone: "rose" },
  { id: "rs", name: "Ravi Shah", initials: "RS", tone: "amber" },
  { id: "tb", name: "Tom Becker", initials: "TB", tone: "slate" },
];

type ProjectStatus = "Planning" | "In progress" | "At risk" | "Paused";
const STATUSES: ProjectStatus[] = ["Planning", "In progress", "At risk", "Paused"];

type Project = {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string; // muted, used for dots and the project icon
  status: ProjectStatus;
  due: number;
  team: string[];
  locked?: boolean;
};

const PROJECTS: Project[] = [
  { id: "web", name: "Website Redesign", icon: Globe, color: "#5b7fd6", status: "In progress", due: 22, team: ["am", "sc", "jc", "ew", "pp", "lm", "nk"] },
  { id: "mobile", name: "Mobile App", icon: Smartphone, color: "#3f9e93", status: "In progress", due: 50, team: ["am", "jc", "ew", "mo", "rs"] },
  { id: "marketing", name: "Marketing Campaign", icon: Megaphone, color: "#c26a7d", status: "Planning", due: 38, team: ["am", "ew", "pp", "tb", "sc"] },
  { id: "launch", name: "Product Launch", icon: Rocket, color: "#c99a3d", status: "At risk", due: 10, team: ["am", "sc", "jc"] },
  { id: "design", name: "Design System", icon: Shapes, color: "#7b9a4f", status: "In progress", due: 68, team: ["sc", "jc", "ew"] },
  { id: "portal", name: "Customer Portal", icon: Headset, color: "#a87b62", status: "Paused", due: 80, team: ["lm", "nk", "rs", "mo"], locked: true },
];

type Priority = 0 | 1 | 2 | 3 | 4; // none, low, medium, high, urgent
type Task = {
  id: string;
  title: string;
  project: string;
  due: number;
  priority: Priority;
  mine: boolean;
  started: boolean;
  done: boolean;
  doneAt: number;
};

// [title, due offset, priority, flags]  m = assigned to you, s = started, d = done
type SeedRow = [string, number, Priority, string?];
const TASK_SEED: Record<string, SeedRow[]> = {
  web: [
    ["Weekly design sync notes", 0, 2, "m"],
    ["Prepare design system tokens", 3, 2, "m"],
    ["Image optimization pipeline", 0, 3, "s"],
    ["Design responsive navigation", 1, 2],
    ["Rewrite pricing page copy", 5, 1],
    ["Audit legacy redirects", -3, 2],
    ["Set up visual regression tests", 12, 1],
    ["Hero illustration handoff", -6, 2, "d"],
    ["Sitemap and IA review", -4, 2, "md"],
  ],
  mobile: [
    ["Triage beta tester feedback", 4, 2, "m"],
    ["Biometric sign-in", 0, 3, "s"],
    ["Dark mode palette", 0, 2],
    ["Offline mode sync", 2, 3],
    ["Push notification service", 3, 2],
    ["Onboarding flow prototype", 2, 2],
    ["Crash reporting setup", -2, 3],
    ["App store screenshots", 16, 1],
    ["Fix deep link routing", -5, 2, "d"],
    ["Release 2.4 to TestFlight", -1, 3, "d"],
  ],
  marketing: [
    ["Launch webinar deck", 13, 2, "m"],
    ["Paid social creatives", 5, 2],
    ["Customer story interviews", 4, 1],
    ["October newsletter", -4, 2],
    ["Landing page A/B test plan", 9, 1],
    ["Partner co-marketing brief", 18, 1],
    ["Draft launch announcement", -2, 2, "d"],
  ],
  launch: [
    ["Launch readiness checklist", 1, 4, "ms"],
    ["Go / no-go meeting", 9, 2, "m"],
    ["Pricing sign-off", -1, 4, "m"],
    ["Support macros for launch", 6, 2],
    ["Press kit assets", 5, 2],
    ["Analytics events QA", 11, 2],
  ],
  design: [
    ["Button component audit", 6, 1],
    ["Icon set refresh", 14, 1],
    ["Token naming RFC", 2, 2],
    ["Form field states", -5, 2],
    ["Document motion guidelines", 20, 1],
    ["Audit color contrast", -3, 2, "md"],
  ],
  portal: [
    ["SSO with Okta", 24, 2],
    ["Invoice history view", 27, 1],
    ["Role permissions matrix", -6, 2],
    ["Usage export to CSV", 30, 1],
    ["Account settings layout", 6, 1],
    ["Support ticket widget", 33, 1],
    ["Empty states pass", 35, 0],
    ["Discovery interviews", -9, 2, "d"],
    ["Portal requirements doc", -7, 2, "d"],
  ],
};

function seedTasks(now: number): Task[] {
  const out: Task[] = [];
  let n = 0;
  for (const [project, rows] of Object.entries(TASK_SEED)) {
    for (const [title, due, priority, flags = ""] of rows) {
      n += 1;
      const done = flags.includes("d");
      out.push({
        id: `t${n}`,
        title,
        project,
        due,
        priority,
        mine: flags.includes("m"),
        started: flags.includes("s"),
        done,
        doneAt: done ? now - n * 41 * 60_000 : 0,
      });
    }
  }
  return out;
}

type ActivityEntry = {
  id: string;
  actor: string;
  verb: string;
  target: string;
  extra?: string;
  project?: string;
  at: number;
};

// [actor, verb, target, project, extra, minutes ago]
const ACTIVITY_SEED: [string, string, string, string | undefined, string | undefined, number][] = [
  ["am", "created", "Triage beta tester feedback", "mobile", undefined, 18],
  ["am", "completed", "Sitemap and IA review", "web", undefined, 52],
  ["sc", "moved", "Product Launch", "launch", "to At risk", 128],
  ["jc", "completed", "Release 2.4 to TestFlight", "mobile", undefined, 190],
  ["ew", "joined", "Marketing Campaign", "marketing", undefined, 315],
  ["pp", "commented on", "Paid social creatives", "marketing", undefined, 1580],
];

/* ────────────────────────────────────────────────────────────────────────────
   Tokens and helpers
   ──────────────────────────────────────────────────────────────────────────── */

const EASE = [0.23, 1, 0.32, 1] as const;
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: "spring", duration: 0.38, bounce: 0.1 } as const;
const CARD_LIMIT = 6;
const DEADLINES_PER_GROUP = 4;

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const INK = "text-[#18181b] dark:text-[#ededef]";
const SUB = "text-[#52525b] dark:text-[#a9a9b0]";
const META = "text-[#6b6b74] dark:text-[#8e8e96]";
const AMBER = "text-[#a15c07] dark:text-[#f0b450]";
const RED = "text-[#c4242a] dark:text-[#f87171]";
const GREEN = "text-[#247b50] dark:text-[#4cc283]";
const CARD = "rounded-[10px] border border-[#e8e8ea] bg-white dark:border-[#262628] dark:bg-[#161617]";
const FLOAT =
  "rounded-[10px] border border-[#e3e3e6] bg-white shadow-[0_12px_32px_-8px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.05)] dark:border-[#2e2e31] dark:bg-[#1b1b1d] dark:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.7)]";
const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6bff]";
const FOCUS_IN = "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1f6bff]";
const HOVER = "pointer-fine:hover:bg-black/[0.04] dark:pointer-fine:hover:bg-white/[0.05]";
const PRESS = "transition-[transform,background-color,border-color,color,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]";
const BTN = `inline-flex h-8 shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium ${PRESS} ${FOCUS} disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`;
const BTN_PRIMARY = `${BTN} bg-[#1f6bff] text-white pointer-fine:hover:bg-[#1a5ee6] pointer-fine:disabled:hover:bg-[#1f6bff]`;
const BTN_SECONDARY = `${BTN} border border-[#dcdce0] bg-white text-[#18181b] pointer-fine:hover:bg-[#f4f4f5] dark:border-[#333336] dark:bg-[#161617] dark:text-[#ededef] dark:pointer-fine:hover:bg-[#1f1f21]`;
const BTN_GHOST = `${BTN} ${SUB} ${HOVER} pointer-fine:hover:text-[#18181b] dark:pointer-fine:hover:text-[#ededef]`;
const ICON_BTN = `inline-flex size-7 shrink-0 items-center justify-center rounded-md ${META} ${HOVER} ${PRESS} ${FOCUS} pointer-fine:hover:text-[#18181b] dark:pointer-fine:hover:text-[#ededef]`;
const FIELD =
  "h-9 w-full rounded-md border border-[#dcdce0] bg-white px-2.5 text-[13px] text-[#18181b] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#6b6b74] focus:border-[#1f6bff] focus:ring-2 focus:ring-[#1f6bff]/20 aria-[invalid=true]:border-[#c4242a] dark:border-[#333336] dark:bg-[#121213] dark:text-[#ededef] dark:[color-scheme:dark] dark:placeholder:text-[#8e8e96] dark:aria-[invalid=true]:border-[#f87171]";
const KBD =
  "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-[#dcdce0] bg-white px-1 font-sans text-[11px] leading-none text-[#6b6b74] dark:border-[#333336] dark:bg-transparent dark:text-[#8e8e96]";

const TONES: Record<Tone, string> = {
  blue: "bg-[#e6ecf8] text-[#2b4a8b] dark:bg-[#1c2638] dark:text-[#a5bff2]",
  green: "bg-[#e3f1e9] text-[#24613f] dark:bg-[#18291f] dark:text-[#93d3ab]",
  rose: "bg-[#f6e6ea] text-[#8a2f45] dark:bg-[#311b22] dark:text-[#eca6b6]",
  amber: "bg-[#f5eddc] text-[#7a5414] dark:bg-[#2d2516] dark:text-[#e4c488]",
  slate: "bg-[#ebebee] text-[#44444c] dark:bg-[#26262a] dark:text-[#c8c8cf]",
};

const DAY_MS = 86_400_000;
const clock = () => Date.now();

function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dateAt(today: number, offset: number) {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d;
}

function dueLabel(today: number, offset: number) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  const d = dateAt(today, offset);
  if (offset > 1 && offset < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(now: number, at: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  if (now - at < 2 * DAY_MS) return "yesterday";
  return `${Math.round((now - at) / DAY_MS)}d ago`;
}

function greetingFor(t: number) {
  const h = new Date(t).getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type TaskTab = "upcoming" | "overdue" | "completed";
type Scope = "mine" | "everyone";
type Layer = null | "palette" | "new" | "invite" | "workspace" | "all";

const tabOf = (t: Task): TaskTab => (t.done ? "completed" : t.due < 0 ? "overdue" : "upcoming");

function sortTasks(list: Task[], tab: TaskTab) {
  return [...list].sort((a, b) =>
    tab === "completed"
      ? b.doneAt - a.doneAt
      : a.due - b.due || b.priority - a.priority || a.title.localeCompare(b.title),
  );
}

function initialsFrom(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const raw = parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return raw.toUpperCase() || "?";
}

/* Scroll an element into view inside its nearest [data-scroll] container only,
   so the host page never jumps. */
function revealInScroll(el: HTMLElement, reduce: boolean) {
  const box = el.parentElement?.closest<HTMLElement>("[data-scroll]");
  if (!box) return;
  const r = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  if (r.top >= b.top + 8 && r.bottom <= b.bottom - 8) return;
  box.scrollTo({
    top: box.scrollTop + (r.top - b.top) - b.height / 2 + r.height / 2,
    behavior: reduce ? "auto" : "smooth",
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   Focus trap for dialogs, popovers and menus
   Focuses the first field, cycles Tab, closes on Esc and outside press,
   and hands focus back to the trigger when it closes.
   ──────────────────────────────────────────────────────────────────────────── */

const FOCUSABLE =
  'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  opts: { initial?: RefObject<HTMLElement | null>; trigger?: string } = {},
) {
  const present = useIsPresent();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  const { initial, trigger } = opts;

  useEffect(() => {
    if (!present) return;
    const node = ref.current;
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = initial?.current ?? node?.querySelector<HTMLElement>(FOCUSABLE) ?? node;
    first?.focus({ preventScroll: true });

    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!node || !t || node.contains(t)) return;
      if (trigger && t.closest(`[data-trigger="${trigger}"]`)) return;
      if (t.closest("[data-floating]") && !node.closest("[data-floating]")) return;
      close.current();
    };
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      const active = document.activeElement;
      if (prev?.isConnected && (!active || active === document.body || node?.contains(active))) {
        prev.focus({ preventScroll: true });
      }
    };
  }, [present, ref, initial, trigger]);

  return (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close.current();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.getClientRects().length > 0,
    );
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
}

/* Arrow-key movement between menu items. */
function onMenuKeys(e: ReactKeyboardEvent<HTMLElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next =
    e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
  items[next]?.focus();
}

/* Popover motion: scale from 0.96 plus a fade; fade only with reduced motion. */
function popMotion(reduce: boolean | null) {
  return {
    initial: { opacity: 0, transform: reduce ? "none" : "scale(0.96)" },
    animate: { opacity: 1, transform: "scale(1)" },
    exit: { opacity: 0, transform: reduce ? "none" : "scale(0.98)", transition: { duration: 0.12, ease: EASE } },
    transition: { duration: 0.18, ease: EASE },
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   Small pieces
   ──────────────────────────────────────────────────────────────────────────── */

function Avatar({ member, size = 22, ring = false }: { member: Member; size?: number; ring?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        TONES[member.tone],
        ring && "ring-2 ring-white dark:ring-[#161617]",
      )}
      style={{ width: size, height: size, fontSize: 9, letterSpacing: "-0.01em" }}
    >
      {member.initials}
    </span>
  );
}

function Dot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cx("inline-block size-1.5 shrink-0 rounded-full", className)} style={{ background: color }} />;
}

function StatusIcon({ state }: { state: "todo" | "started" | "done" }) {
  if (state === "done") {
    return (
      <svg role="img" aria-label="Done" viewBox="0 0 14 14" className="size-3.5 shrink-0">
        <circle cx="7" cy="7" r="6" className="fill-[#2f8f5b] dark:fill-[#3fae72]" />
        <path d="M4.4 7.2 6.2 9 9.6 5.2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "started") {
    return (
      <svg role="img" aria-label="In progress" viewBox="0 0 14 14" className="size-3.5 shrink-0">
        <circle cx="7" cy="7" r="5.5" fill="none" strokeWidth="1.5" className="stroke-[#c98a1c] dark:stroke-[#e0a83f]" />
        <path d="M7 3.5a3.5 3.5 0 0 1 0 7Z" className="fill-[#c98a1c] dark:fill-[#e0a83f]" />
      </svg>
    );
  }
  return (
    <svg role="img" aria-label="To do" viewBox="0 0 14 14" className="size-3.5 shrink-0">
      <circle cx="7" cy="7" r="5.5" fill="none" strokeWidth="1.5" className="stroke-[#9d9da5] dark:stroke-[#6c6c74]" />
    </svg>
  );
}

const PRIORITY_LABEL = ["No priority", "Low priority", "Medium priority", "High priority", "Urgent"];

function PriorityIcon({ level, className }: { level: Priority; className?: string }) {
  if (level === 4) {
    return (
      <svg role="img" aria-label="Urgent" viewBox="0 0 14 14" className={cx("size-3.5 shrink-0", className)}>
        <rect x="1" y="1" width="12" height="12" rx="3" className="fill-[#d9483b] dark:fill-[#e2574a]" />
        <path d="M7 4v3.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="7" cy="10" r="0.95" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg role="img" aria-label={PRIORITY_LABEL[level]} viewBox="0 0 14 14" className={cx("size-3.5 shrink-0", className)}>
      {[4, 7, 10].map((h, i) => (
        <rect
          key={h}
          x={1.5 + i * 4}
          y={12 - h}
          width="3"
          height={h}
          rx="0.8"
          className={i < level ? "fill-[#6b6b74] dark:fill-[#a9a9b0]" : "fill-[#dcdce0] dark:fill-[#3a3a3e]"}
        />
      ))}
    </svg>
  );
}

function ProjectTag({ project, className }: { project: Project; className?: string }) {
  return (
    <span className={cx("min-w-0 items-center gap-1.5 whitespace-nowrap text-[12px]", META, className)}>
      <Dot color={project.color} />
      <span className="truncate">{project.name}</span>
    </span>
  );
}

/* A number that slides when it changes. */
function Num({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cx("relative inline-flex overflow-hidden tabular-nums", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ opacity: 0, transform: reduce ? "none" : "translateY(45%)" }}
          animate={{ opacity: 1, transform: "translateY(0%)" }}
          exit={{ opacity: 0, transform: reduce ? "none" : "translateY(-45%)" }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Checkbox({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cx(
        "group/cb -m-1.5 flex size-7 shrink-0 items-center justify-center rounded-md transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.9]",
        FOCUS,
      )}
    >
      <span
        className={cx(
          "flex size-4 items-center justify-center rounded-[5px] border transition-[background-color,border-color] duration-150",
          checked
            ? "border-[#1f6bff] bg-[#1f6bff]"
            : "border-[#a8a8b0] bg-white pointer-fine:group-hover/cb:border-[#6b6b74] dark:border-[#56565c] dark:bg-transparent dark:pointer-fine:group-hover/cb:border-[#8e8e96]",
        )}
      >
        <AnimatePresence initial={false}>
          {checked && (
            <motion.svg
              viewBox="0 0 16 16"
              className="size-3 text-white"
              initial={{ opacity: 0, transform: reduce ? "none" : "scale(0.7)" }}
              animate={{ opacity: 1, transform: "scale(1)" }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.16, ease: EASE }}
            >
              <motion.path
                d="M3.5 8.5 6.5 11.5 12.5 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: reduce ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.22, ease: EASE }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
}

/* Segmented tabs with a sliding active pill. Arrow keys move between tabs. */
function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
  idBase,
  panelId,
  className,
}: {
  className?: string;
  options: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
  idBase: string;
  panelId: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: ReactKeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % options.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].key);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cx("flex shrink-0 items-center gap-0.5 rounded-lg bg-black/[0.045] p-0.5 dark:bg-white/[0.06]", className)}>
      {options.map((o, i) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idBase}-${o.key}`}
            aria-selected={on}
            aria-controls={panelId}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.key)}
            onKeyDown={(e) => onKey(e, i)}
            className={cx(
              "relative h-7 select-none rounded-md px-2.5 text-[12px] font-medium transition-colors duration-150",
              FOCUS,
              on ? INK : "text-[#5f5f68] pointer-fine:hover:text-[#18181b] dark:text-[#9a9aa2] dark:pointer-fine:hover:text-[#ededef]",
            )}
          >
            {on && (
              <motion.span
                layoutId={`${idBase}-pill`}
                aria-hidden
                className="absolute inset-0 rounded-md bg-white ring-1 ring-black/[0.07] dark:bg-[#2a2a2d] dark:ring-white/[0.06]"
                transition={{ type: "spring", duration: 0.32, bounce: 0.12 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.label}
              {o.count !== undefined && (
                <span className={cx("tabular-nums", on ? "text-[#5f5f68] dark:text-[#b4b4ba]" : "")}>
                  <Num value={o.count} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Task list
   ──────────────────────────────────────────────────────────────────────────── */

type Flash = { id: string; n: number } | null;

function TaskRow({
  task,
  project,
  today,
  onToggle,
  flashKey,
  showMine,
}: {
  task: Task;
  project: Project;
  today: number;
  onToggle: (id: string) => void;
  flashKey: number;
  showMine?: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (flashKey && ref.current) revealInScroll(ref.current, !!reduce);
  }, [flashKey, reduce]);

  const soon = !task.done && (task.due === 0 || task.due === 1);
  const late = !task.done && task.due < 0;

  return (
    <motion.li
      ref={ref}
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transform: reduce ? "none" : "translateX(12px)",
        transition: { duration: 0.18, ease: EASE },
      }}
      transition={{ layout: SPRING, opacity: { duration: 0.2, ease: EASE } }}
      className={cx("group relative flex min-h-11 items-center gap-2.5 rounded-md px-2.5", HOVER, "transition-colors duration-150")}
    >
      {flashKey ? (
        <motion.span
          key={flashKey}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md bg-[#1f6bff]/[0.12] dark:bg-[#1f6bff]/[0.2]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.8, times: [0, 0.12, 0.6, 1], ease: "easeOut" }}
        />
      ) : null}
      <Checkbox checked={task.done} label={task.title} onToggle={() => onToggle(task.id)} />
      <StatusIcon state={task.done ? "done" : task.started ? "started" : "todo"} />
      <div className="relative flex min-w-0 flex-1 flex-col py-1.5">
        <span
          className={cx(
            "truncate text-[13px] transition-colors duration-200",
            task.done ? "text-[#6b6b74] line-through decoration-[#a8a8b0] dark:text-[#8e8e96] dark:decoration-[#56565c]" : INK,
          )}
        >
          {task.title}
        </span>
        <ProjectTag project={project} className="mt-0.5 flex @min-[560px]/list:hidden" />
      </div>
      {showMine && task.mine && (
        <span className={cx("hidden shrink-0 text-[12px] @min-[420px]/list:inline", META)}>You</span>
      )}
      <ProjectTag project={project} className="relative hidden max-w-[170px] @min-[560px]/list:flex" />
      <PriorityIcon level={task.priority} className="relative hidden @min-[400px]/list:block" />
      <span
        className={cx(
          "relative w-[64px] shrink-0 text-right text-[12px] tabular-nums",
          task.done ? META : soon ? AMBER : late ? RED : META,
        )}
      >
        {dueLabel(today, task.due)}
      </span>
    </motion.li>
  );
}

const EMPTY_COPY: Record<TaskTab, { title: string; body: string }> = {
  upcoming: { title: "All caught up", body: "Nothing upcoming. New tasks you create land here." },
  overdue: { title: "Nothing overdue", body: "Everything is on schedule." },
  completed: { title: "Nothing completed yet", body: "Tick off a task and it moves here." },
};

function TaskList({
  tasks,
  tab,
  today,
  projects,
  onToggle,
  flash,
  limit,
  onShowAll,
  onNew,
  showMine,
  scopeNote,
}: {
  tasks: Task[];
  tab: TaskTab;
  today: number;
  projects: Map<string, Project>;
  onToggle: (id: string) => void;
  flash: Flash;
  limit?: number;
  onShowAll?: () => void;
  onNew?: () => void;
  showMine?: boolean;
  scopeNote?: string;
}) {
  const flashIndex = flash ? tasks.findIndex((t) => t.id === flash.id) : -1;
  const max = limit ? Math.max(limit, flashIndex + 1) : tasks.length;
  const visible = tasks.slice(0, max);
  const hidden = tasks.length - visible.length;
  const empty = EMPTY_COPY[tab];

  return (
    <div className="@container/list">
      <ul key={tab} className="relative flex flex-col">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((t) => {
            const project = projects.get(t.project);
            if (!project) return null;
            return (
              <TaskRow
                key={t.id}
                task={t}
                project={project}
                today={today}
                onToggle={onToggle}
                flashKey={flash?.id === t.id ? flash.n : 0}
                showMine={showMine}
              />
            );
          })}
        </AnimatePresence>
      </ul>
      <AnimatePresence initial={false}>
        {visible.length === 0 && (
          <motion.div
            key={`empty-${tab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2, delay: 0.12 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="flex flex-col items-center px-4 py-8 text-center"
          >
            <CircleCheck aria-hidden className={cx("size-5", tab === "upcoming" ? GREEN : META)} strokeWidth={1.75} />
            <p className={cx("mt-2.5 text-[13px] font-medium", INK)}>{empty.title}</p>
            <p className={cx("mt-1 text-[12px]", META)}>
              {empty.body}
              {scopeNote ? ` ${scopeNote}` : ""}
            </p>
            {tab === "upcoming" && onNew && (
              <button type="button" onClick={onNew} className={cx(BTN_SECONDARY, "mt-3 h-7 px-2.5 text-[12px]")}>
                <Plus aria-hidden className="size-3.5" />
                New task
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {hidden > 0 && onShowAll && (
        <button
          type="button"
          onClick={onShowAll}
          className={cx("mt-0.5 flex h-8 w-full items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium", SUB, HOVER, FOCUS_IN)}
        >
          <span>
            View all <Num value={tasks.length} /> tasks
          </span>
          <ChevronRight aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Toasts
   ──────────────────────────────────────────────────────────────────────────── */

type ToastData = {
  id: number;
  message: string;
  detail?: string;
  icon?: LucideIcon;
  tone?: "success" | "neutral";
  action?: { label: string; run: () => void };
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(5000);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => dismiss.current(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(1200, remaining.current - (Date.now() - started));
    };
  }, [paused, toast.id]);

  const Icon = toast.icon ?? CircleCheck;
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, transform: reduce ? "none" : "translateY(10px) scale(0.98)" }}
      animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      exit={{ opacity: 0, transform: reduce ? "none" : "scale(0.97)", transition: { duration: 0.14, ease: EASE } }}
      transition={{ duration: 0.24, ease: EASE, layout: SPRING }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cx(FLOAT, "pointer-events-auto flex items-center gap-2.5 py-2 pl-3 pr-1.5")}
    >
      <Icon aria-hidden className={cx("size-4 shrink-0", toast.tone === "neutral" ? META : GREEN)} strokeWidth={1.9} />
      <p className="min-w-0 flex-1 text-[13px] leading-[18px]">
        <span className={cx("font-medium", INK)}>{toast.message}</span>
        {toast.detail && <span className={cx("block truncate text-[12px]", META)}>{toast.detail}</span>}
      </p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.run();
            onDismiss(toast.id);
          }}
          className={cx(BTN_GHOST, "h-7 px-2 text-[12px]", INK)}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)} className={ICON_BTN}>
        <X aria-hidden className="size-3.5" />
      </button>
    </motion.li>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Sidebar
   ──────────────────────────────────────────────────────────────────────────── */

type TipHandlers = { show: (el: HTMLElement, label: string) => void; hide: () => void };

function tipProps(tip: TipHandlers | undefined, label: string) {
  if (!tip) return {};
  return {
    onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") tip.show(e.currentTarget, label);
    },
    onPointerLeave: () => tip.hide(),
    onFocus: (e: ReactFocusEvent<HTMLElement>) => {
      if (e.currentTarget.matches(":focus-visible")) tip.show(e.currentTarget, label);
    },
    onBlur: () => tip.hide(),
  };
}

const NAV_IDLE = `${SUB} ${HOVER} pointer-fine:hover:text-[#18181b] dark:pointer-fine:hover:text-[#ededef]`;
const NAV_ACTIVE = "bg-black/[0.06] text-[#18181b] dark:bg-white/[0.08] dark:text-white";

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  rail,
  tip,
  trailing,
  railBadge,
  ariaLabel,
  expanded,
  indent,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  rail?: boolean;
  tip?: TipHandlers;
  trailing?: ReactNode;
  railBadge?: boolean;
  ariaLabel?: string;
  expanded?: boolean;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-expanded={expanded}
      aria-label={rail ? ariaLabel ?? label : ariaLabel}
      {...tipProps(rail ? tip : undefined, label)}
      className={cx(
        "relative flex h-8 shrink-0 select-none items-center gap-2.5 rounded-md text-[13px]",
        PRESS,
        "active:scale-[0.98]",
        FOCUS_IN,
        rail ? "w-9 justify-center" : cx("w-full px-2", indent && "pl-[30px]"),
        active ? NAV_ACTIVE : NAV_IDLE,
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={1.75}
        className={cx(indent ? "size-3.5" : "size-4", "shrink-0", active ? "" : "text-[#71717a] dark:text-[#8e8e96]")}
      />
      {!rail && <span className="min-w-0 flex-1 truncate text-left">{label}</span>}
      {!rail && trailing}
      {rail && railBadge && (
        <span aria-hidden className="absolute right-1 top-1 size-1.5 rounded-full bg-[#1f6bff] ring-2 ring-[#f6f6f7] dark:ring-[#0b0b0c]" />
      )}
    </button>
  );
}

function SectionLabel({ children, rail }: { children: ReactNode; rail?: boolean }) {
  if (rail) return <div aria-hidden className="mx-2 my-3 h-px bg-black/[0.07] dark:bg-white/[0.07]" />;
  return (
    <h2 className={cx("px-2 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-[0.06em]", META)}>{children}</h2>
  );
}

function Count({ value }: { value: number }) {
  return <span className={cx("text-[12px] tabular-nums", META)}>{value}</span>;
}

type SidebarProps = {
  variant: "inline" | "drawer";
  rail: boolean;
  workspace: (typeof WORKSPACES)[number];
  nav: string;
  projects: Project[];
  favorites: Set<string>;
  expanded: Set<string>;
  favOpen: boolean;
  inboxCount: number;
  notifCount: number;
  myTaskCount: number;
  menuOpen: boolean;
  tip?: TipHandlers;
  onNav: (key: string) => void;
  onProject: (id: string, sub?: string) => void;
  onToggleExpand: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleFavOpen: () => void;
  onCollapse: () => void;
  onClose?: () => void;
  onMenu: () => void;
};

const PROJECT_SUBS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "board", label: "Board", icon: Kanban },
  { key: "list", label: "List", icon: List },
  { key: "timeline", label: "Timeline", icon: ChartGantt },
  { key: "files", label: "Files", icon: FileText },
];

const WORKSPACE_NAV: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "timeline", label: "Timeline", icon: ChartGantt },
  { key: "members", label: "Members", icon: Users },
  { key: "activity", label: "Activity", icon: Activity },
];

const TEAMS = [
  { key: "team-design", label: "Design", letter: "D" },
  { key: "team-eng", label: "Engineering", letter: "E" },
];

function Sidebar(p: SidebarProps) {
  const reduce = useReducedMotion();
  const { rail, tip } = p;
  const favProjects = p.projects.filter((x) => p.favorites.has(x.id));
  const heightAnim = {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: reduce ? 0 : 0.2, ease: EASE },
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Workspace switcher */}
      <div className={cx("flex h-12 shrink-0 items-center gap-1", rail ? "justify-center px-2" : "pl-2 pr-2.5")}>
        <button
          type="button"
          data-trigger="workspace"
          aria-haspopup="menu"
          aria-expanded={p.menuOpen}
          aria-label={rail ? `${p.workspace.name}, switch workspace` : undefined}
          onClick={p.onMenu}
          {...tipProps(rail ? tip : undefined, p.workspace.name)}
          className={cx(
            "flex h-8 min-w-0 items-center gap-2 rounded-md",
            rail ? "w-9 justify-center" : "flex-1 px-1.5",
            HOVER,
            PRESS,
            "active:scale-[0.98]",
            FOCUS_IN,
          )}
        >
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-[#18181b] text-[11px] font-semibold text-white dark:bg-[#ededef] dark:text-[#18181b]">
            {p.workspace.letter}
          </span>
          {!rail && (
            <>
              <span className={cx("truncate text-[13px] font-semibold", INK)}>{p.workspace.name}</span>
              <ChevronsUpDown aria-hidden className={cx("size-3.5 shrink-0", META)} />
            </>
          )}
        </button>
        {!rail &&
          (p.variant === "drawer" ? (
            <button type="button" aria-label="Close sidebar" onClick={p.onClose} className={ICON_BTN}>
              <X aria-hidden className="size-4" />
            </button>
          ) : (
            <button type="button" aria-label="Collapse sidebar" onClick={p.onCollapse} className={ICON_BTN}>
              <PanelLeft aria-hidden className="size-4" strokeWidth={1.75} />
            </button>
          ))}
      </div>

      <nav
        aria-label="Workspace navigation"
        className={cx(
          "min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4 [scrollbar-width:thin]",
          rail ? "flex flex-col items-center px-2" : "px-2",
        )}
      >
        {rail && (
          <NavItem icon={PanelLeft} label="Expand sidebar" rail tip={tip} onClick={p.onCollapse} />
        )}
        <NavItem icon={House} label="Home" rail={rail} tip={tip} active={p.nav === "home"} onClick={() => p.onNav("home")} />
        <NavItem
          icon={Inbox}
          label="Inbox"
          rail={rail}
          tip={tip}
          active={p.nav === "inbox"}
          onClick={() => p.onNav("inbox")}
          ariaLabel={p.inboxCount ? `Inbox, ${p.inboxCount} unread` : undefined}
          railBadge={p.inboxCount > 0}
          trailing={
            <AnimatePresence initial={false}>
              {p.inboxCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transform: reduce ? "none" : "scale(0.8)" }}
                  transition={{ duration: 0.16, ease: EASE }}
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1f6bff] px-1 text-[11px] font-medium tabular-nums text-white"
                >
                  {p.inboxCount}
                </motion.span>
              )}
            </AnimatePresence>
          }
        />
        <NavItem
          icon={CircleCheck}
          label="My Tasks"
          rail={rail}
          tip={tip}
          active={p.nav === "mytasks"}
          onClick={() => p.onNav("mytasks")}
          ariaLabel={p.myTaskCount ? `My Tasks, ${p.myTaskCount} due soon` : undefined}
          trailing={p.myTaskCount > 0 ? <Count value={p.myTaskCount} /> : null}
        />
        {!rail && (
          <NavItem
            icon={Star}
            label="Favorites"
            expanded={p.favOpen}
            onClick={p.onToggleFavOpen}
            trailing={
              <ChevronDown
                aria-hidden
                className={cx("size-3.5 transition-transform duration-200", META, p.favOpen ? "" : "-rotate-90")}
              />
            }
          />
        )}
        {!rail && (
          <AnimatePresence initial={false}>
            {p.favOpen && (
              <motion.div key="favs" {...heightAnim} className="overflow-hidden">
                {favProjects.length === 0 ? (
                  <p className={cx("py-1.5 pl-[30px] pr-2 text-[12px]", META)}>Star a project to pin it here.</p>
                ) : (
                  <ul>
                    <AnimatePresence initial={false}>
                      {favProjects.map((fp) => (
                        <motion.li key={fp.id} {...heightAnim} className="overflow-hidden">
                          <button
                            type="button"
                            onClick={() => p.onProject(fp.id)}
                            aria-current={p.nav === `p:${fp.id}` ? "page" : undefined}
                            className={cx(
                              "flex h-8 w-full items-center gap-2 rounded-md pl-[30px] pr-2 text-[13px]",
                              PRESS,
                              "active:scale-[0.98]",
                              FOCUS_IN,
                              p.nav === `p:${fp.id}` ? NAV_ACTIVE : NAV_IDLE,
                            )}
                          >
                            <Dot color={fp.color} />
                            <span className="truncate">{fp.name}</span>
                          </button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
        <NavItem
          icon={Search}
          label="Search"
          rail={rail}
          tip={tip}
          onClick={() => p.onNav("search")}
          trailing={<kbd className={KBD}>/</kbd>}
        />
        <NavItem
          icon={Bell}
          label="Notifications"
          rail={rail}
          tip={tip}
          active={p.nav === "notifications"}
          onClick={() => p.onNav("notifications")}
          ariaLabel={p.notifCount ? `Notifications, ${p.notifCount} unread` : undefined}
          railBadge={p.notifCount > 0}
          trailing={p.notifCount > 0 ? <Count value={p.notifCount} /> : null}
        />

        <SectionLabel rail={rail}>Workspace</SectionLabel>
        {WORKSPACE_NAV.map((n) => (
          <NavItem
            key={n.key}
            icon={n.icon}
            label={n.label}
            rail={rail}
            tip={tip}
            active={p.nav === n.key}
            onClick={() => p.onNav(n.key)}
          />
        ))}

        <SectionLabel rail={rail}>Projects</SectionLabel>
        <ul className={cx(rail && "flex flex-col items-center")}>
          {p.projects.map((proj) => {
            const active = p.nav === `p:${proj.id}`;
            const within = active || p.nav.startsWith(`p:${proj.id}:`);
            const open = p.expanded.has(proj.id);
            const fav = p.favorites.has(proj.id);
            const Icon = proj.icon;
            if (rail) {
              return (
                <li key={proj.id}>
                  <button
                    type="button"
                    aria-label={proj.name}
                    aria-current={within ? "page" : undefined}
                    onClick={() => p.onProject(proj.id)}
                    {...tipProps(tip, proj.name)}
                    className={cx(
                      "flex size-9 items-center justify-center rounded-md",
                      PRESS,
                      FOCUS_IN,
                      within ? NAV_ACTIVE : NAV_IDLE,
                    )}
                  >
                    <Icon aria-hidden className="size-4" strokeWidth={1.75} style={{ color: proj.color }} />
                  </button>
                </li>
              );
            }
            return (
              <li key={proj.id}>
                <div
                  className={cx(
                    "group/proj relative flex h-8 items-center gap-0.5 rounded-md pr-1 text-[13px]",
                    "has-[.proj-select:focus-visible]:outline-2 has-[.proj-select:focus-visible]:-outline-offset-2 has-[.proj-select:focus-visible]:outline-[#1f6bff]",
                    active ? NAV_ACTIVE : NAV_IDLE,
                  )}
                >
                  <button
                    type="button"
                    onClick={() => p.onProject(proj.id)}
                    aria-current={active ? "page" : undefined}
                    className="proj-select flex min-w-0 items-center gap-2 rounded-md py-1.5 pl-2 outline-none before:absolute before:inset-0 before:rounded-md before:content-['']"
                  >
                    <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} style={{ color: proj.color }} />
                    <span className="truncate">{proj.name}</span>
                    {proj.locked && <Lock aria-label="Private" className={cx("size-3 shrink-0", META)} />}
                  </button>
                  <button
                    type="button"
                    aria-label={fav ? `Remove ${proj.name} from favorites` : `Add ${proj.name} to favorites`}
                    aria-pressed={fav}
                    onClick={() => p.onToggleFavorite(proj.id)}
                    className={cx(
                      "relative z-[1] flex size-5 shrink-0 items-center justify-center rounded",
                      PRESS,
                      "active:scale-[0.85]",
                      FOCUS,
                      fav
                        ? "text-[#c98a1c] dark:text-[#e0a83f]"
                        : "text-[#8a8a92] opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover/proj:opacity-100 focus-visible:opacity-100 pointer-fine:hover:text-[#18181b] dark:text-[#8e8e96] dark:pointer-fine:hover:text-[#ededef]",
                    )}
                  >
                    <Star aria-hidden className="size-3.5" fill={fav ? "currentColor" : "none"} strokeWidth={1.75} />
                  </button>
                  <span className="flex-1" />
                  <Dot color={proj.color} className="mx-1" />
                  <button
                    type="button"
                    aria-label={`${open ? "Collapse" : "Expand"} ${proj.name}`}
                    aria-expanded={open}
                    onClick={() => p.onToggleExpand(proj.id)}
                    className={cx("relative z-[1] flex size-5 shrink-0 items-center justify-center rounded", META, PRESS, FOCUS, HOVER)}
                  >
                    <ChevronRight
                      aria-hidden
                      className={cx("size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]", open && "rotate-90")}
                    />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.ul key="subs" {...heightAnim} className="overflow-hidden">
                      {PROJECT_SUBS.map((s) => (
                        <li key={s.key}>
                          <NavItem
                            icon={s.icon}
                            label={s.label}
                            indent
                            ariaLabel={`${proj.name} ${s.label.toLowerCase()}`}
                            active={p.nav === `p:${proj.id}:${s.key}`}
                            onClick={() => p.onProject(proj.id, s.key)}
                          />
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
        <NavItem icon={Archive} label="Archive" rail={rail} tip={tip} active={p.nav === "archive"} onClick={() => p.onNav("archive")} />

        <SectionLabel rail={rail}>Teams</SectionLabel>
        {TEAMS.map((t) =>
          rail ? (
            <button
              key={t.key}
              type="button"
              aria-label={`${t.label} team`}
              aria-current={p.nav === t.key ? "page" : undefined}
              onClick={() => p.onNav(t.key)}
              {...tipProps(tip, `${t.label} team`)}
              className={cx("flex size-9 items-center justify-center rounded-md", PRESS, FOCUS_IN, p.nav === t.key ? NAV_ACTIVE : NAV_IDLE)}
            >
              <span className="flex size-[18px] items-center justify-center rounded bg-black/[0.07] text-[10px] font-semibold dark:bg-white/[0.1]">
                {t.letter}
              </span>
            </button>
          ) : (
            <button
              key={t.key}
              type="button"
              aria-current={p.nav === t.key ? "page" : undefined}
              onClick={() => p.onNav(t.key)}
              className={cx(
                "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px]",
                PRESS,
                "active:scale-[0.98]",
                FOCUS_IN,
                p.nav === t.key ? NAV_ACTIVE : NAV_IDLE,
              )}
            >
              <span className="flex size-4 items-center justify-center rounded bg-black/[0.07] text-[10px] font-semibold dark:bg-white/[0.1]">
                {t.letter}
              </span>
              <span className="truncate">{t.label}</span>
            </button>
          ),
        )}
      </nav>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Floating layers
   ──────────────────────────────────────────────────────────────────────────── */

function WorkspaceMenu({
  current,
  onPick,
  onInvite,
  onSearch,
  onClose,
}: {
  current: string;
  onPick: (id: string) => void;
  onInvite: () => void;
  onSearch: () => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = useFocusTrap(ref, onClose, { trigger: "workspace" });
  const item = cx(
    "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px]",
    INK,
    HOVER,
    "focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07] outline-none",
  );
  return (
    <motion.div
      ref={ref}
      role="menu"
      aria-label="Workspace"
      data-floating
      onKeyDown={(e) => {
        onKeyDown(e);
        onMenuKeys(e);
      }}
      {...popMotion(reduce)}
      className={cx(FLOAT, "absolute left-2 top-[46px] z-[60] w-[232px] origin-top-left p-1")}
    >
      <p className={cx("px-2 pb-1 pt-1.5 text-[12px]", META)}>Workspaces</p>
      {WORKSPACES.map((w) => (
        <button key={w.id} type="button" role="menuitemradio" aria-checked={w.id === current} onClick={() => onPick(w.id)} className={item}>
          <span className="flex size-5 items-center justify-center rounded bg-[#18181b] text-[10px] font-semibold text-white dark:bg-[#ededef] dark:text-[#18181b]">
            {w.letter}
          </span>
          <span className="flex-1 truncate">{w.name}</span>
          {w.id === current && <Check aria-hidden className="size-3.5 text-[#1f6bff]" />}
        </button>
      ))}
      <div role="separator" className="mx-1 my-1 h-px bg-black/[0.07] dark:bg-white/[0.08]" />
      <button type="button" role="menuitem" onClick={onInvite} className={item}>
        <UserPlus aria-hidden className={cx("size-4", META)} strokeWidth={1.75} />
        Invite members
      </button>
      <button type="button" role="menuitem" onClick={onSearch} className={item}>
        <Search aria-hidden className={cx("size-4", META)} strokeWidth={1.75} />
        <span className="flex-1">Search</span>
        <kbd className={KBD}>/</kbd>
      </button>
    </motion.div>
  );
}

function NewTaskPopover({
  projects,
  defaultProject,
  today,
  onClose,
  onCreate,
}: {
  projects: Project[];
  defaultProject: string;
  today: number;
  onClose: () => void;
  onCreate: (v: { title: string; project: string; due: number }) => void;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const onKeyDown = useFocusTrap(ref, onClose, { initial: titleRef, trigger: "new" });
  const id = useId();
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(defaultProject);
  const [due, setDue] = useState("1");
  const dueOptions: [number, string][] = [
    [0, "Today"],
    [1, "Tomorrow"],
    [3, dateAt(today, 3).toLocaleDateString("en-US", { weekday: "long" })],
    [7, `Next week · ${dateAt(today, 7).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`],
    [14, `In two weeks · ${dateAt(today, 14).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`],
  ];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onCreate({ title: t, project, due: Number(due) });
  };

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      data-floating
      onKeyDown={onKeyDown}
      {...popMotion(reduce)}
      className={cx(
        FLOAT,
        "absolute right-0 top-[calc(100%+6px)] z-30 w-[min(360px,100cqw)] origin-top-right p-3.5 @max-[560px]/main:left-0 @max-[560px]/main:right-auto @max-[560px]/main:origin-top-left",
      )}
    >
      <form onSubmit={submit} noValidate>
        <div className="flex items-center justify-between">
          <h2 id={`${id}-title`} className={cx("text-[14px] font-semibold", INK)}>
            New task
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className={ICON_BTN}>
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <label className="mt-3 block">
          <span className={cx("mb-1.5 block text-[12px] font-medium", SUB)}>Title</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Review launch checklist"
            maxLength={80}
            className={FIELD}
          />
        </label>
        <div className="mt-3 grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-2.5">
          <label className="block min-w-0">
            <span className={cx("mb-1.5 block text-[12px] font-medium", SUB)}>Project</span>
            <SelectField value={project} onChange={setProject}>
              {projects.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}
                </option>
              ))}
            </SelectField>
          </label>
          <label className="block min-w-0">
            <span className={cx("mb-1.5 block text-[12px] font-medium", SUB)}>Due</span>
            <SelectField value={due} onChange={setDue}>
              {dueOptions.map(([v, l]) => (
                <option key={v} value={String(v)}>
                  {l}
                </option>
              ))}
            </SelectField>
          </label>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN_GHOST}>
            Cancel
          </button>
          <button type="submit" disabled={!title.trim()} className={BTN_PRIMARY}>
            Create task
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function SelectField({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <span className="relative block">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cx(FIELD, "appearance-none truncate pr-7")}>
        {children}
      </select>
      <ChevronDown aria-hidden className={cx("pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2", META)} />
    </span>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function InvitePopover({
  projects,
  members,
  defaultProject,
  onClose,
  onInvite,
}: {
  projects: Project[];
  members: Map<string, Member>;
  defaultProject: string;
  onClose: () => void;
  onInvite: (email: string, project: string) => void;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const onKeyDown = useFocusTrap(ref, onClose, { initial: emailRef, trigger: "invite" });
  const id = useId();
  const [email, setEmail] = useState("");
  const [project, setProject] = useState(defaultProject);
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    const proj = projects.find((x) => x.id === project);
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address, like name@company.com.");
      emailRef.current?.focus();
      return;
    }
    if (proj?.team.some((m) => members.get(m)?.email === value)) {
      setError(`${value} is already on ${proj.name}.`);
      emailRef.current?.focus();
      return;
    }
    onInvite(value, project);
  };

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      data-floating
      onKeyDown={onKeyDown}
      {...popMotion(reduce)}
      className={cx(
        FLOAT,
        "absolute right-0 top-[calc(100%+6px)] z-30 w-[min(360px,100cqw)] origin-top-right p-3.5 @max-[560px]/main:left-0 @max-[560px]/main:right-auto @max-[560px]/main:origin-top-left",
      )}
    >
      <form onSubmit={submit} noValidate>
        <div className="flex items-center justify-between">
          <h2 id={`${id}-title`} className={cx("text-[14px] font-semibold", INK)}>
            Invite a member
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className={ICON_BTN}>
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <p id={`${id}-desc`} className={cx("mt-1 text-[12px]", META)}>
          They get an email and join the project&apos;s team.
        </p>
        <label className="mt-3 block">
          <span className={cx("mb-1.5 block text-[12px] font-medium", SUB)}>Email</span>
          <input
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            placeholder="name@company.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            className={FIELD}
          />
        </label>
        <AnimatePresence initial={false}>
          {error && (
            <motion.p
              key="err"
              id={`${id}-err`}
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
              className={cx("overflow-hidden text-[12px]", RED)}
            >
              <span className="block pt-1.5">{error}</span>
            </motion.p>
          )}
        </AnimatePresence>
        <label className="mt-3 block">
          <span className={cx("mb-1.5 block text-[12px] font-medium", SUB)}>Project</span>
          <SelectField value={project} onChange={setProject}>
            {projects.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.name}
              </option>
            ))}
          </SelectField>
        </label>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN_GHOST}>
            Cancel
          </button>
          <button type="submit" disabled={!email.trim()} className={BTN_PRIMARY}>
            Send invite
          </button>
        </div>
      </form>
    </motion.div>
  );
}

type PaletteItem = {
  key: string;
  group: "Actions" | "Projects" | "Tasks";
  label: string;
  hint?: string;
  icon: LucideIcon;
  color?: string;
  done?: boolean;
  run: () => void;
};

function Palette({ items, onClose }: { items: (q: string) => PaletteItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useFocusTrap(ref, onClose, { initial: inputRef });
  const id = useId();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => items(q), [items, q]);
  const current = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-index="${current}"]`);
    if (!list || !el) return;
    if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop - 28;
    else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight + 4;
  }, [current]);

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      const d = e.key === "ArrowDown" ? 1 : -1;
      setActive((current + d + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[current]?.run();
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center px-3 pt-[12%]" data-floating>
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/25 dark:bg-black/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Search or jump to"
        onKeyDown={onKeyDown}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className={cx(FLOAT, "relative flex max-h-[min(460px,calc(100%-80px))] w-full max-w-[560px] flex-col overflow-hidden")}
      >
        <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-[#ececee] px-3.5 dark:border-[#2a2a2d]">
          <Search aria-hidden className={cx("size-4 shrink-0", META)} />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={results.length ? `${id}-opt-${current}` : undefined}
            aria-autocomplete="list"
            aria-label="Search tasks, projects and actions"
            placeholder="Search tasks, projects and actions…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            className={cx("h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#6b6b74] dark:placeholder:text-[#8e8e96]", INK)}
          />
          <kbd className={KBD}>esc</kbd>
        </div>
        <div ref={listRef} id={`${id}-list`} role="listbox" aria-label="Results" className="relative min-h-0 flex-1 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className={cx("px-3 py-8 text-center text-[13px]", META)}>
              No results for &ldquo;{q}&rdquo;. Try a project or task name.
            </p>
          )}
          {results.map((r, i) => {
            const header = i === 0 || results[i - 1].group !== r.group;
            const Icon = r.icon;
            const on = i === current;
            return (
              <div key={r.key} role="presentation">
                {header && (
                  <div role="presentation" className={cx("px-2.5 pb-1 pt-2 text-[12px]", META)}>
                    {r.group}
                  </div>
                )}
                <div
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={on}
                  data-index={i}
                  onPointerMove={() => {
                    if (!on) setActive(i);
                  }}
                  onClick={() => r.run()}
                  className={cx(
                    "flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 text-[13px]",
                    on ? "bg-black/[0.055] dark:bg-white/[0.08]" : "",
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} style={r.color ? { color: r.color } : undefined} />
                  <span className={cx("min-w-0 flex-1 truncate", r.done ? cx(META, "line-through") : INK)}>{r.label}</span>
                  {r.hint && <span className={cx("shrink-0 truncate text-[12px]", META)}>{r.hint}</span>}
                  {on && <CornerDownLeft aria-hidden className={cx("size-3.5 shrink-0", META)} />}
                </div>
              </div>
            );
          })}
        </div>
        <div className={cx("hidden h-9 shrink-0 items-center gap-4 border-t border-[#ececee] px-3.5 text-[12px] sm:flex dark:border-[#2a2a2d]", META)}>
          <span className="flex items-center gap-1.5">
            <kbd className={KBD}>
              <ArrowUp aria-hidden className="size-3" />
            </kbd>
            <kbd className={KBD}>
              <ArrowDown aria-hidden className="size-3" />
            </kbd>
            to move
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={KBD}>
              <CornerDownLeft aria-hidden className="size-3" />
            </kbd>
            to open
          </span>
          <span className="ml-auto tabular-nums">
            {results.length} {results.length === 1 ? "result" : "results"}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function AllTasksDialog({
  tasks,
  scope,
  tab,
  onScope,
  onTab,
  today,
  projects,
  onToggle,
  flash,
  onClose,
}: {
  tasks: Task[];
  scope: Scope;
  tab: TaskTab;
  onScope: (s: Scope) => void;
  onTab: (t: TaskTab) => void;
  today: number;
  projects: Map<string, Project>;
  onToggle: (id: string) => void;
  flash: Flash;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = useFocusTrap(ref, onClose);
  const id = useId();
  const pool = tasks.filter((t) => scope === "everyone" || t.mine);
  const counts = {
    upcoming: pool.filter((t) => tabOf(t) === "upcoming").length,
    overdue: pool.filter((t) => tabOf(t) === "overdue").length,
    completed: pool.filter((t) => tabOf(t) === "completed").length,
  };
  const list = sortTasks(
    pool.filter((t) => tabOf(t) === tab),
    tab,
  );

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 @min-[640px]:p-8" data-floating>
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/25 dark:bg-black/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={onKeyDown}
        initial={{ opacity: 0, transform: reduce ? "none" : "scale(0.96)" }}
        animate={{ opacity: 1, transform: "scale(1)" }}
        exit={{ opacity: 0, transform: reduce ? "none" : "scale(0.98)", transition: { duration: 0.14, ease: EASE } }}
        transition={{ duration: 0.22, ease: EASE }}
        className={cx(FLOAT, "relative flex max-h-full w-full max-w-[720px] flex-col overflow-hidden")}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-[#ececee] px-4 py-3 dark:border-[#2a2a2d]">
          <h2 id={`${id}-title`} className={cx("mr-auto text-[14px] font-semibold", INK)}>
            All tasks
          </h2>
          <Segmented
            label="Whose tasks"
            idBase={`${id}-scope`}
            panelId={`${id}-panel`}
            value={scope}
            onChange={onScope}
            options={[
              { key: "mine", label: "Mine" },
              { key: "everyone", label: "Everyone" },
            ]}
          />
          <button type="button" aria-label="Close" onClick={onClose} className={ICON_BTN}>
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div className="flex items-center px-4 pt-3">
          <Segmented
            label="Task status"
            idBase={`${id}-tab`}
            panelId={`${id}-panel`}
            value={tab}
            onChange={onTab}
            options={[
              { key: "upcoming", label: "Upcoming", count: counts.upcoming },
              { key: "overdue", label: "Overdue", count: counts.overdue },
              { key: "completed", label: "Completed", count: counts.completed },
            ]}
          />
        </div>
        <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} data-scroll className="min-h-[200px] flex-1 overflow-y-auto px-2 pb-2 pt-2">
          <TaskList tasks={list} tab={tab} today={today} projects={projects} onToggle={onToggle} flash={flash} showMine={scope === "everyone"} />
        </div>
      </motion.div>
    </div>
  );
}

function StatusPill({
  project,
  menuId,
  open,
  onOpen,
  onClose,
  onPick,
}: {
  project: Project;
  menuId: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPick: (s: ProjectStatus) => void;
}) {
  return (
    <div className={cx("relative inline-block", open ? "z-30" : "z-[1]")}>
      <button
        type="button"
        data-trigger={`status-${menuId}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${project.status}, change status of ${project.name}`}
        onClick={open ? onClose : onOpen}
        className={cx(
          "inline-flex h-6 select-none items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-[12px] font-medium",
          PRESS,
          FOCUS,
          STATUS_STYLE[project.status].pill,
        )}
      >
        <span aria-hidden className={cx("size-1.5 rounded-full", STATUS_STYLE[project.status].dot)} />
        {project.status}
      </button>
      <AnimatePresence>
        {open && <StatusMenu project={project} trigger={`status-${menuId}`} onClose={onClose} onPick={onPick} />}
      </AnimatePresence>
    </div>
  );
}

const STATUS_STYLE: Record<ProjectStatus, { pill: string; dot: string }> = {
  "In progress": {
    pill: "border-[#e3e3e6] bg-[#f6f6f7] text-[#3f3f46] pointer-fine:hover:bg-[#eeeef0] dark:border-[#2e2e31] dark:bg-[#1e1e20] dark:text-[#d4d4d8] dark:pointer-fine:hover:bg-[#262628]",
    dot: "bg-[#1f6bff]",
  },
  Planning: {
    pill: "border-[#e3e3e6] bg-[#f6f6f7] text-[#3f3f46] pointer-fine:hover:bg-[#eeeef0] dark:border-[#2e2e31] dark:bg-[#1e1e20] dark:text-[#d4d4d8] dark:pointer-fine:hover:bg-[#262628]",
    dot: "bg-[#8e8e96]",
  },
  "At risk": {
    pill: "border-[#f5d0cd] bg-[#fff1ef] text-[#8f1f24] pointer-fine:hover:bg-[#ffe6e2] dark:border-[#4a2327] dark:bg-[#2a171a] dark:text-[#f5a3a3] dark:pointer-fine:hover:bg-[#331c20]",
    dot: "bg-[#d9483b]",
  },
  Paused: {
    pill: "border-[#efe1c2] bg-[#fdf7ea] text-[#7a5414] pointer-fine:hover:bg-[#f9efd9] dark:border-[#3d321b] dark:bg-[#241e12] dark:text-[#e4c488] dark:pointer-fine:hover:bg-[#2c2415]",
    dot: "bg-[#c99a3d]",
  },
};

function StatusMenu({
  project,
  trigger,
  onClose,
  onPick,
}: {
  project: Project;
  trigger: string;
  onClose: () => void;
  onPick: (s: ProjectStatus) => void;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const onKeyDown = useFocusTrap(ref, onClose, { initial: firstRef, trigger });
  return (
    <motion.div
      ref={ref}
      role="menu"
      aria-label={`Status of ${project.name}`}
      data-floating
      onKeyDown={(e) => {
        onKeyDown(e);
        onMenuKeys(e);
      }}
      {...popMotion(reduce)}
      className={cx(FLOAT, "absolute left-0 top-[calc(100%+4px)] w-[168px] origin-top-left p-1")}
    >
      {STATUSES.map((s) => (
        <button
          key={s}
          ref={s === project.status ? firstRef : undefined}
          type="button"
          role="menuitemradio"
          aria-checked={s === project.status}
          onClick={() => onPick(s)}
          className={cx(
            "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] outline-none",
            INK,
            HOVER,
            "focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]",
          )}
        >
          <span aria-hidden className={cx("size-1.5 rounded-full", STATUS_STYLE[s].dot)} />
          <span className="flex-1">{s}</span>
          {s === project.status && <Check aria-hidden className="size-3.5 text-[#1f6bff]" />}
        </button>
      ))}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Dashboard
   ──────────────────────────────────────────────────────────────────────────── */

const NAV_LABELS: Record<string, string> = {
  home: "Home",
  inbox: "Inbox",
  mytasks: "My Tasks",
  notifications: "Notifications",
  overview: "Overview",
  projects: "Projects",
  tasks: "Tasks",
  calendar: "Calendar",
  timeline: "Timeline",
  members: "Members",
  activity: "Activity",
  archive: "Archive",
  "team-design": "Design",
  "team-eng": "Engineering",
};

const NAV_SCROLL: Record<string, string> = {
  home: "top",
  overview: "top",
  mytasks: "tasks",
  projects: "projects",
  members: "projects",
  calendar: "deadlines",
  timeline: "deadlines",
  activity: "activity",
};

const TONE_CYCLE: Tone[] = ["green", "rose", "amber", "slate", "blue"];

function Dashboard() {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const seq = useRef(0);
  const uid = useId();

  const [boot] = useState(clock);
  const today = useMemo(() => startOfDay(boot), [boot]);
  const [now, setNow] = useState(boot);
  useEffect(() => {
    const t = window.setInterval(() => setNow(clock()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const [workspaceId, setWorkspaceId] = useState(WORKSPACES[0].id);
  const workspace = WORKSPACES.find((w) => w.id === workspaceId) ?? WORKSPACES[0];
  const [tasks, setTasks] = useState<Task[]>(() => seedTasks(boot));
  const [projectList, setProjectList] = useState<Project[]>(PROJECTS);
  const [memberList, setMemberList] = useState<Member[]>(MEMBERS);
  const [activity, setActivity] = useState<ActivityEntry[]>(() =>
    ACTIVITY_SEED.map(([actor, verb, target, project, extra, mins], i) => ({
      id: `seed-${i}`,
      actor,
      verb,
      target,
      project,
      extra,
      at: boot - mins * 60_000,
    })),
  );
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const [nav, setNav] = useState("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(["web"]));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["web"]));
  const [favOpen, setFavOpen] = useState(true);
  const [seen, setSeen] = useState({ inbox: false, notifications: false });
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [layer, setLayer] = useState<Layer>(null);
  const [statusMenu, setStatusMenu] = useState<string | null>(null);
  const [tab, setTab] = useState<TaskTab>("upcoming");
  const [allScope, setAllScope] = useState<Scope>("mine");
  const [allTab, setAllTab] = useState<TaskTab>("upcoming");
  const [leaving, setLeaving] = useState<Record<string, TaskTab>>({});
  const [flash, setFlash] = useState<Flash>(null);
  const [projFlash, setProjFlash] = useState<Flash>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [deadlinesOpen, setDeadlinesOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);

  // Refs mirror state for event handlers that outlive a render.
  const tasksRef = useRef(tasks);
  const leavingRef = useRef(leaving);
  useEffect(() => {
    tasksRef.current = tasks;
    leavingRef.current = leaving;
  });
  const timers = useRef(new Map<string, number>());
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => window.clearTimeout(t));
  }, []);

  const projects = useMemo(() => new Map(projectList.map((p) => [p.id, p])), [projectList]);
  const members = useMemo(() => new Map(memberList.map((m) => [m.id, m])), [memberList]);

  /* ── derived numbers ── */
  const openTasks = tasks.filter((t) => !t.done);
  const mineOpen = openTasks.filter((t) => t.mine);
  const stats = {
    active: projectList.filter((p) => p.status !== "Paused").length,
    atRisk: projectList.filter((p) => p.status === "At risk").length,
    open: openTasks.length,
    assigned: mineOpen.length,
    completed: tasks.filter((t) => t.done).length,
    overdue: openTasks.filter((t) => t.due < 0).length,
  };
  const myTaskCount = mineOpen.filter((t) => t.due === 0 || t.due === 1).length;

  const myPool = tasks.filter((t) => t.mine && (!selected || t.project === selected));
  const tabCounts = {
    upcoming: myPool.filter((t) => tabOf(t) === "upcoming").length,
    overdue: myPool.filter((t) => tabOf(t) === "overdue").length,
    completed: myPool.filter((t) => tabOf(t) === "completed").length,
  };
  const myList = sortTasks(
    myPool.filter((t) => (leaving[t.id] ?? tabOf(t)) === tab),
    tab,
  );

  const progress = (pid: string) => {
    const list = tasks.filter((t) => t.project === pid);
    return list.length ? Math.round((list.filter((t) => t.done).length / list.length) * 100) : 0;
  };

  /* ── helpers ── */
  const nextId = (prefix: string) => {
    seq.current += 1;
    return `${prefix}${seq.current}`;
  };

  const log = (verb: string, target: string, project?: string, extra?: string) => {
    const id = nextId("act-");
    setActivity((list) => [{ id, actor: ME, verb, target, project, extra, at: clock() }, ...list].slice(0, 30));
    setNow(clock());
    return id;
  };
  const unlog = (id: string) => setActivity((list) => list.filter((a) => a.id !== id));

  const toast = (t: Omit<ToastData, "id">) => {
    seq.current += 1;
    const id = seq.current;
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
  };
  const dismissToast = (id: number) => setToasts((list) => list.filter((t) => t.id !== id));

  const scrollToSection = (name: string) => {
    const box = mainRef.current;
    if (!box) return;
    if (name === "top") {
      box.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    const el = box.querySelector<HTMLElement>(`[data-section="${name}"]`);
    if (!el) return;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 16;
    box.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  /* ── task actions ── */
  const toggleTask = (id: string, quiet = false) => {
    const t = tasksRef.current.find((x) => x.id === id);
    if (!t) return;
    const done = !t.done;
    const from = tabOf(t);
    setTasks((list) => list.map((x) => (x.id === id ? { ...x, done, doneAt: done ? clock() : 0 } : x)));

    // Let the row linger in its old list for a beat, then animate it out.
    const prior = timers.current.get(id);
    if (prior) window.clearTimeout(prior);
    if (leavingRef.current[id] !== undefined) {
      timers.current.delete(id);
      setLeaving((l) => {
        const n = { ...l };
        delete n[id];
        return n;
      });
    } else {
      setLeaving((l) => ({ ...l, [id]: from }));
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          setLeaving((l) => {
            const n = { ...l };
            delete n[id];
            return n;
          });
        }, 520),
      );
    }

    if (quiet) return;
    const actId = log(done ? "completed" : "reopened", t.title, t.project);
    if (done) {
      toast({
        message: "Task completed",
        detail: t.title,
        action: {
          label: "Undo",
          run: () => {
            toggleTask(id, true);
            unlog(actId);
          },
        },
      });
    }
  };

  const createTask = (v: { title: string; project: string; due: number }) => {
    const id = nextId("n");
    const task: Task = { id, ...v, priority: 2, mine: true, started: false, done: false, doneAt: 0 };
    setTasks((list) => [task, ...list]);
    setLayer(null);
    setTab("upcoming");
    if (selected && selected !== v.project) {
      setSelected(null);
      setNav("home");
    }
    setFlash({ id, n: clock() });
    const actId = log("created", v.title, v.project);
    toast({
      message: "Task created",
      detail: `${v.title} · ${dueLabel(today, v.due)}`,
      icon: Plus,
      tone: "neutral",
      action: {
        label: "Undo",
        run: () => {
          setTasks((list) => list.filter((x) => x.id !== id));
          unlog(actId);
        },
      },
    });
  };

  const invite = (email: string, projectId: string) => {
    const project = projects.get(projectId);
    if (!project) return;
    const id = nextId("m");
    const member: Member = {
      id,
      name: email,
      email,
      initials: initialsFrom(email),
      tone: TONE_CYCLE[seq.current % TONE_CYCLE.length],
    };
    setMemberList((list) => [...list, member]);
    setProjectList((list) => list.map((p) => (p.id === projectId ? { ...p, team: [id, ...p.team] } : p)));
    setLayer(null);
    const actId = log("invited", email, projectId);
    toast({
      message: `Invite sent to ${project.name}`,
      detail: email,
      icon: UserPlus,
      tone: "neutral",
      action: {
        label: "Undo",
        run: () => {
          setProjectList((list) => list.map((p) => (p.id === projectId ? { ...p, team: p.team.filter((m) => m !== id) } : p)));
          unlog(actId);
        },
      },
    });
  };

  const setStatus = (pid: string, status: ProjectStatus) => {
    const project = projects.get(pid);
    setStatusMenu(null);
    if (!project || project.status === status) return;
    const prev = project.status;
    setProjectList((list) => list.map((p) => (p.id === pid ? { ...p, status } : p)));
    const actId = log("moved", project.name, pid, `to ${status}`);
    toast({
      message: `${project.name} is now ${status.toLowerCase()}`,
      icon: FolderKanban,
      tone: "neutral",
      action: {
        label: "Undo",
        run: () => {
          setProjectList((list) => list.map((p) => (p.id === pid ? { ...p, status: prev } : p)));
          unlog(actId);
        },
      },
    });
  };

  const toggleFavorite = (pid: string) => {
    const on = !favorites.has(pid);
    setFavorites((s) => {
      const n = new Set(s);
      if (on) n.add(pid);
      else n.delete(pid);
      return n;
    });
    const name = projects.get(pid)?.name ?? "";
    log(on ? "starred" : "unstarred", name, pid);
    if (on) setFavOpen(true);
  };

  /* ── navigation ── */
  const go = (key: string) => {
    if (key === "search") {
      setDrawer(false);
      setLayer("palette");
      return;
    }
    setNav(key);
    setSelected(null);
    setDrawer(false);
    if (key === "inbox" || key === "notifications") setSeen((s) => ({ ...s, [key]: true }));
    if (key === "tasks") {
      setAllScope("everyone");
      setAllTab("upcoming");
      setLayer("all");
      return;
    }
    const target = NAV_SCROLL[key];
    if (target) window.requestAnimationFrame(() => scrollToSection(target));
  };

  const selectProject = (pid: string, sub?: string, reveal = false) => {
    setNav(sub ? `p:${pid}:${sub}` : `p:${pid}`);
    setSelected(pid);
    setDrawer(false);
    setLayer(null);
    if (projectList.findIndex((p) => p.id === pid) >= 5) setShowAllProjects(true);
    if (reveal) {
      setProjFlash({ id: pid, n: clock() });
      window.requestAnimationFrame(() => scrollToSection("projects"));
    }
  };

  const highlightTask = (id: string) => {
    const t = tasksRef.current.find((x) => x.id === id);
    if (!t) return;
    const target = tabOf(t);
    setDrawer(false);
    setFlash({ id, n: clock() });
    if (t.mine && (!selected || selected === t.project)) {
      setLayer(null);
      setTab(target);
      window.requestAnimationFrame(() => {
        const row = mainRef.current?.querySelector<HTMLElement>(`[data-section="tasks"]`);
        if (row && mainRef.current && mainRef.current.scrollTop > row.offsetTop) scrollToSection("tasks");
      });
      return;
    }
    setAllScope(t.mine ? "mine" : "everyone");
    setAllTab(target);
    setLayer("all");
  };

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2000);
    return () => window.clearTimeout(t);
  }, [flash]);
  useEffect(() => {
    if (!projFlash) return;
    const t = window.setTimeout(() => setProjFlash(null), 2000);
    return () => window.clearTimeout(t);
  }, [projFlash]);

  /* ── keyboard: ⌘K / Ctrl+K and "/" only while focus or pointer is inside ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const active = document.activeElement;
      const focusInside = !!active && root.contains(active);
      const focusFree = !active || active === document.body;
      if (!focusInside && !(hoverRef.current && focusFree)) return;
      const target = e.target as HTMLElement | null;
      const typing = !!target?.closest?.("input, textarea, select, [contenteditable='true']");
      const isK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !e.altKey;
      const isSlash = e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey;
      if (!isK && !isSlash) return;
      e.preventDefault();
      e.stopPropagation();
      setStatusMenu(null);
      setLayer((l) => (isK && l === "palette" ? null : "palette"));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  /* ── rail tooltips, positioned inside the frame ── */
  const tipTimer = useRef<number | undefined>(undefined);
  const tipWarm = useRef(0);
  const tipShown = useRef(false);
  const railTip: TipHandlers = {
    show: (el, label) => {
      const root = rootRef.current;
      if (!root) return;
      const r = el.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      const next = { label, top: r.top - b.top + r.height / 2, left: r.right - b.left + 8 };
      window.clearTimeout(tipTimer.current);
      const instant = tipShown.current || clock() - tipWarm.current < 500;
      if (instant) {
        tipShown.current = true;
        setTip(next);
      } else {
        tipTimer.current = window.setTimeout(() => {
          tipShown.current = true;
          setTip(next);
        }, 450);
      }
    },
    hide: () => {
      window.clearTimeout(tipTimer.current);
      if (tipShown.current) tipWarm.current = clock();
      tipShown.current = false;
      setTip(null);
    },
  };

  /* ── palette results ── */
  const paletteItems = (q: string): PaletteItem[] => {
    const query = q.trim().toLowerCase();
    const match = (s: string) => !query || s.toLowerCase().includes(query);
    const actions: PaletteItem[] = [
      { key: "act-new", group: "Actions", label: "Create a new task", icon: Plus, run: () => setLayer("new") },
      { key: "act-invite", group: "Actions", label: "Invite a member", icon: UserPlus, run: () => setLayer("invite") },
      { key: "act-all", group: "Actions", label: "Open all tasks", icon: ListTodo, run: () => { setAllScope("everyone"); setAllTab("upcoming"); setLayer("all"); } },
      {
        key: "act-sidebar",
        group: "Actions",
        label: collapsed ? "Expand sidebar" : "Collapse sidebar",
        icon: PanelLeft,
        run: () => {
          setLayer(null);
          setCollapsed((c) => !c);
        },
      },
      { key: "act-home", group: "Actions", label: "Go to Home", icon: House, run: () => { setLayer(null); go("home"); } },
    ].filter((a) => match(a.label)) as PaletteItem[];
    const proj: PaletteItem[] = projectList
      .filter((p) => match(p.name))
      .map((p) => ({
        key: `p-${p.id}`,
        group: "Projects",
        label: p.name,
        hint: `${p.status} · ${progress(p.id)}%`,
        icon: p.icon,
        color: p.color,
        run: () => selectProject(p.id, undefined, true),
      }));
    const pool = query
      ? tasks.filter((t) => match(t.title) || match(projects.get(t.project)?.name ?? ""))
      : sortTasks(mineOpen, "upcoming");
    const taskItems: PaletteItem[] = pool.slice(0, query ? 12 : 6).map((t) => ({
      key: `t-${t.id}`,
      group: "Tasks",
      label: t.title,
      hint: `${projects.get(t.project)?.name ?? ""} · ${t.done ? "Done" : dueLabel(today, t.due)}`,
      icon: t.done ? CircleCheck : CircleDashed,
      done: t.done,
      run: () => highlightTask(t.id),
    }));
    return query ? [...taskItems, ...proj, ...actions] : [...actions.slice(0, 3), ...taskItems, ...proj];
  };

  /* ── deadlines ── */
  const deadlineGroups = [
    { key: "today", label: "Today", items: openTasks.filter((t) => t.due === 0) },
    { key: "tomorrow", label: "Tomorrow", items: openTasks.filter((t) => t.due === 1) },
    { key: "week", label: "This week", items: openTasks.filter((t) => t.due >= 2 && t.due <= 6) },
  ].map((g) => ({ ...g, items: [...g.items].sort((a, b) => a.due - b.due || a.title.localeCompare(b.title)) }));
  const hiddenDeadlines = deadlineGroups.reduce((n, g) => n + Math.max(0, g.items.length - DEADLINES_PER_GROUP), 0);

  const visibleProjects = showAllProjects ? projectList : projectList.slice(0, 5);
  const activityShown = activity.slice(0, activityOpen ? 12 : 5);

  const crumb =
    nav.startsWith("p:")
      ? (() => {
          const [, pid, sub] = nav.split(":");
          const name = projects.get(pid)?.name ?? "";
          return sub ? [name, PROJECT_SUBS.find((s) => s.key === sub)?.label ?? ""] : [name];
        })()
      : [NAV_LABELS[nav] ?? "Home"];

  const greeting = greetingFor(now);
  const longDate = new Date(today).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const defaultProject = selected ?? projectList[0].id;

  const sidebarProps: Omit<SidebarProps, "variant" | "rail"> = {
    workspace,
    nav,
    projects: projectList,
    favorites,
    expanded,
    favOpen,
    inboxCount: seen.inbox ? 0 : 4,
    notifCount: seen.notifications ? 0 : 6,
    myTaskCount,
    menuOpen: layer === "workspace",
    onNav: go,
    onProject: (id, sub) => selectProject(id, sub),
    onToggleExpand: (id) =>
      setExpanded((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    onToggleFavorite: toggleFavorite,
    onToggleFavOpen: () => setFavOpen((o) => !o),
    onCollapse: () => {
      railTip.hide();
      setCollapsed((c) => !c);
    },
    onClose: () => setDrawer(false),
    onMenu: () => setLayer((l) => (l === "workspace" ? null : "workspace")),
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={rootRef}
        onPointerEnter={() => {
          hoverRef.current = true;
        }}
        onPointerLeave={() => {
          hoverRef.current = false;
        }}
        className={cx(
          "relative flex h-[760px] w-full overflow-hidden rounded-[10px] border text-left font-sans text-[13px] leading-5 antialiased",
          "border-[#e3e3e6] bg-[#f6f6f7] dark:border-[#232325] dark:bg-[#0b0b0c]",
          INK,
          "selection:bg-[#1f6bff]/20",
        )}
      >
        {/* Sidebar (inline) */}
        <motion.aside
          aria-label="Sidebar"
          initial={false}
          animate={{ width: collapsed ? 56 : 240 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
          className="hidden shrink-0 overflow-hidden border-r border-[#e8e8ea] @4xl:flex dark:border-[#1f1f21]"
        >
          <div className="h-full w-full" style={{ minWidth: collapsed ? 56 : 240 }}>
            <Sidebar variant="inline" rail={collapsed} tip={collapsed ? railTip : undefined} {...sidebarProps} />
          </div>
        </motion.aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#fbfbfb] dark:bg-[#0f0f10]">
          {/* Top bar */}
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#ececee] px-3 @lg:px-5 dark:border-[#1f1f21]">
            <button
              type="button"
              aria-label="Open sidebar"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
              className={cx(ICON_BTN, "@4xl:hidden")}
            >
              <Menu aria-hidden className="size-4" />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
                <li className="hidden shrink-0 @md:block">
                  <button
                    type="button"
                    onClick={() => go("home")}
                    className={cx("flex h-7 items-center gap-2 rounded-md px-1.5", SUB, HOVER, PRESS, FOCUS)}
                  >
                    <span className="flex size-[18px] items-center justify-center rounded bg-[#18181b] text-[10px] font-semibold text-white dark:bg-[#ededef] dark:text-[#18181b]">
                      {workspace.letter}
                    </span>
                    {workspace.name}
                  </button>
                </li>
                {crumb.map((c, i) => (
                  <li key={`${c}-${i}`} className="flex min-w-0 items-center gap-1.5">
                    <span aria-hidden className={cx(META, i === 0 && "hidden @md:inline")}>
                      /
                    </span>
                    <span
                      aria-current={i === crumb.length - 1 ? "page" : undefined}
                      className={cx("truncate", i === crumb.length - 1 ? cx(INK, "font-medium") : SUB)}
                    >
                      {c}
                    </span>
                  </li>
                ))}
              </ol>
            </nav>
            <button
              type="button"
              data-trigger="palette"
              aria-haspopup="dialog"
              aria-keyshortcuts="Meta+K Control+K /"
              onClick={() => setLayer("palette")}
              className={cx(
                "flex h-8 shrink-0 items-center gap-2 rounded-md border border-[#e3e3e6] bg-white px-2 text-[13px] dark:border-[#2a2a2d] dark:bg-[#161617]",
                META,
                PRESS,
                FOCUS,
                "pointer-fine:hover:border-[#d4d4d8] dark:pointer-fine:hover:border-[#3a3a3e]",
                "w-8 justify-center @xl:w-[240px] @xl:justify-start @xl:px-2.5",
              )}
            >
              <Search aria-hidden className="size-4 shrink-0" />
              <span className="sr-only @xl:not-sr-only @xl:flex-1 @xl:text-left">Search or jump to…</span>
              <span className="hidden @xl:flex">
                <kbd className={KBD}>⌘K</kbd>
              </span>
            </button>
          </header>

          {/* Scrolling content */}
          <div ref={mainRef} data-scroll className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
            <div data-section="top" className="@container/main mx-auto w-full max-w-[1200px] px-4 pb-10 pt-6 @lg:px-6 @lg:pt-8">
              {/* Title row */}
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div className="min-w-0">
                  <h1 className={cx("text-[22px] font-semibold leading-7 tracking-[-0.015em]", INK)}>
                    {greeting}, {USER_FIRST_NAME}
                  </h1>
                  <p className={cx("mt-1 text-[13px]", META)}>
                    <time dateTime={new Date(today).toISOString().slice(0, 10)}>{longDate}</time>
                    <span aria-hidden> · </span>
                    Here&apos;s what&apos;s happening across your workspace.
                  </p>
                </div>
                <div className="relative flex items-center gap-2 @max-[560px]/main:w-full">
                  <button
                    type="button"
                    data-trigger="invite"
                    aria-haspopup="dialog"
                    aria-expanded={layer === "invite"}
                    onClick={() => setLayer((l) => (l === "invite" ? null : "invite"))}
                    className={BTN_SECONDARY}
                  >
                    <UserPlus aria-hidden className="size-4" strokeWidth={1.75} />
                    Invite member
                  </button>
                  <button
                    type="button"
                    data-trigger="new"
                    aria-haspopup="dialog"
                    aria-expanded={layer === "new"}
                    onClick={() => setLayer((l) => (l === "new" ? null : "new"))}
                    className={BTN_PRIMARY}
                  >
                    <Plus aria-hidden className="size-4" />
                    New
                  </button>
                  <AnimatePresence>
                    {layer === "invite" && (
                      <InvitePopover
                        key="invite"
                        projects={projectList}
                        members={members}
                        defaultProject={defaultProject}
                        onClose={() => setLayer(null)}
                        onInvite={invite}
                      />
                    )}
                    {layer === "new" && (
                      <NewTaskPopover
                        key="new"
                        projects={projectList}
                        defaultProject={defaultProject}
                        today={today}
                        onClose={() => setLayer(null)}
                        onCreate={createTask}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Stats */}
              <dl className={cx(CARD, "mt-6 grid grid-cols-2 @min-[680px]/main:grid-cols-4")}>
                {[
                  { label: "Active projects", icon: FolderKanban, value: stats.active, sub: `${stats.atRisk} at risk`, subTone: META },
                  { label: "Open tasks", icon: CircleDashed, value: stats.open, sub: `${stats.assigned} assigned to you`, subTone: META },
                  { label: "Completed", icon: CircleCheck, value: stats.completed, sub: "this week", subTone: GREEN },
                  {
                    label: "Overdue",
                    icon: Clock,
                    value: stats.overdue,
                    sub: stats.overdue ? "need attention" : "all on track",
                    subTone: stats.overdue ? RED : META,
                    valueTone: stats.overdue ? RED : INK,
                  },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className={cx(
                      "flex min-w-0 flex-col px-4 py-3.5",
                      i % 2 === 1 && "border-l border-[#ececee] dark:border-[#262628]",
                      i >= 2 && "border-t border-[#ececee] @min-[680px]/main:border-t-0 dark:border-[#262628]",
                      i === 2 && "@min-[680px]/main:border-l",
                    )}
                  >
                    <dt className={cx("flex items-center gap-1.5 text-[12px]", SUB)}>
                      <s.icon aria-hidden className={cx("size-3.5", META)} strokeWidth={1.75} />
                      {s.label}
                    </dt>
                    <dd className={cx("mt-1.5 text-[22px] font-medium leading-7", s.valueTone ?? INK)}>
                      <Num value={s.value} />
                    </dd>
                    <dd className={cx("mt-0.5 truncate text-[12px] tabular-nums", s.subTone)}>{s.sub}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 grid items-start gap-4 @min-[860px]/main:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 flex-col gap-4">
                  {/* My tasks */}
                  <section data-section="tasks" aria-labelledby={`${uid}-tasks`} className={CARD}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-2 pt-3">
                      <h2 id={`${uid}-tasks`} className={cx("text-[14px] font-semibold", INK)}>
                        My tasks
                      </h2>
                      <AnimatePresence initial={false}>
                        {selected && projects.get(selected) && (
                          <motion.span
                            key={selected}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className={cx(
                              "inline-flex h-6 items-center gap-1.5 rounded-md border border-[#e3e3e6] pl-2 pr-0.5 text-[12px] dark:border-[#2e2e31]",
                              SUB,
                            )}
                          >
                            <Dot color={projects.get(selected)?.color ?? "#999"} />
                            {projects.get(selected)?.name}
                            <button
                              type="button"
                              aria-label="Clear project filter"
                              onClick={() => {
                                setSelected(null);
                                setNav("home");
                              }}
                              className={cx(ICON_BTN, "size-5")}
                            >
                              <X aria-hidden className="size-3" />
                            </button>
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <div className="ml-auto flex items-center gap-1.5 @max-[520px]/main:contents">
                        <Segmented
                          className="@max-[520px]/main:order-last @max-[520px]/main:w-full @max-[520px]/main:*:flex-1 @max-[520px]/main:*:px-1.5"
                          label="Filter my tasks"
                          idBase={`${uid}-tab`}
                          panelId={`${uid}-panel`}
                          value={tab}
                          onChange={setTab}
                          options={[
                            { key: "upcoming", label: "Upcoming", count: tabCounts.upcoming },
                            { key: "overdue", label: "Overdue", count: tabCounts.overdue },
                            { key: "completed", label: "Completed", count: tabCounts.completed },
                          ]}
                        />
                        <button
                          type="button"
                          aria-label="Open all tasks"
                          aria-haspopup="dialog"
                          data-expand
                          onClick={() => {
                            setAllScope("mine");
                            setAllTab(tab);
                            setLayer("all");
                          }}
                          className={cx(ICON_BTN, "@max-[520px]/main:ml-auto")}
                        >
                          <Maximize2 aria-hidden className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`} className="px-1.5 pb-1.5">
                      <TaskList
                        tasks={myList}
                        tab={tab}
                        today={today}
                        projects={projects}
                        onToggle={(id) => toggleTask(id)}
                        flash={layer === "all" ? null : flash}
                        limit={CARD_LIMIT}
                        onShowAll={() => {
                          setAllScope("mine");
                          setAllTab(tab);
                          setLayer("all");
                        }}
                        onNew={() => setLayer("new")}
                        scopeNote={selected ? `Filtered to ${projects.get(selected)?.name}.` : undefined}
                      />
                    </div>
                  </section>

                  {/* Project progress */}
                  <section data-section="projects" aria-labelledby={`${uid}-proj`} className={CARD}>
                    <div className="flex items-center gap-3 px-4 pb-1 pt-3">
                      <h2 id={`${uid}-proj`} className={cx("text-[14px] font-semibold", INK)}>
                        Project progress
                      </h2>
                      <button
                        type="button"
                        aria-expanded={showAllProjects}
                        onClick={() => setShowAllProjects((s) => !s)}
                        className={cx(BTN_GHOST, "ml-auto h-7 px-2 text-[12px]")}
                      >
                        {showAllProjects ? "Show fewer" : `All projects · ${projectList.length}`}
                        <ChevronDown
                          aria-hidden
                          className={cx("size-3.5 transition-transform duration-200", showAllProjects && "rotate-180")}
                        />
                      </button>
                    </div>
                    <div className="@container/table px-1.5 pb-1.5">
                      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
                        <thead>
                          <tr className={cx("text-[12px]", META)}>
                            <th scope="col" className="h-9 px-2.5 font-normal">
                              Project
                            </th>
                            <th scope="col" className="hidden w-[112px] px-2 font-normal @min-[440px]/table:table-cell">
                              Status
                            </th>
                            <th scope="col" className="w-[92px] px-2 font-normal @min-[440px]/table:w-[34%] @min-[500px]/table:w-[26%]">
                              Progress
                            </th>
                            <th scope="col" className="hidden w-[64px] px-2 text-right font-normal @min-[500px]/table:table-cell">
                              Due
                            </th>
                            <th scope="col" className="hidden w-[100px] px-2.5 text-right font-normal @min-[580px]/table:table-cell">
                              Team
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence initial={false}>
                            {visibleProjects.map((p) => {
                              const pct = progress(p.id);
                              const isSel = selected === p.id;
                              const Icon = p.icon;
                              const team = p.team.map((m) => members.get(m)).filter((m): m is Member => !!m);
                              const late = p.due < 0;
                              const cell = cx(
                                "h-11 border-t border-[#f0f0f2] px-2 py-2 dark:border-[#1f1f21] @min-[440px]/table:py-0",
                                isSel ? "bg-black/[0.04] dark:bg-white/[0.05]" : "pointer-fine:group-hover/row:bg-black/[0.025] dark:pointer-fine:group-hover/row:bg-white/[0.035]",
                                "transition-colors duration-150",
                              );
                              return (
                                <motion.tr
                                  key={p.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="group/row relative has-[.row-select:focus-visible]:outline-2 has-[.row-select:focus-visible]:-outline-offset-2 has-[.row-select:focus-visible]:outline-[#1f6bff]"
                                >
                                  <td className={cx(cell, "rounded-l-md pl-2.5")}>
                                    {projFlash?.id === p.id && (
                                      <motion.span
                                        key={projFlash.n}
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 rounded-md bg-[#1f6bff]/[0.12] dark:bg-[#1f6bff]/[0.2]"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 1, 1, 0] }}
                                        transition={{ duration: 1.8, times: [0, 0.12, 0.6, 1] }}
                                      />
                                    )}
                                    {/* The button's ::before stretches over the whole row, so the row is clickable. */}
                                    <button
                                      type="button"
                                      aria-pressed={isSel}
                                      onClick={() => (isSel ? go("home") : selectProject(p.id))}
                                      className="row-select flex w-full min-w-0 cursor-pointer items-center gap-2.5 text-left outline-none before:absolute before:inset-0 before:rounded-md before:content-['']"
                                    >
                                      <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} style={{ color: p.color }} />
                                      <span className="flex min-w-0 flex-col">
                                        <span className={cx("truncate text-[13px] font-medium", INK)}>{p.name}</span>
                                        <span className={cx("hidden text-[12px] tabular-nums @min-[440px]/table:block @min-[500px]/table:hidden", late ? RED : META)}>
                                          Due {dueLabel(today, p.due)}
                                        </span>
                                      </span>
                                    </button>
                                    <div className="mt-1.5 flex items-center gap-2 pl-[26px] @min-[440px]/table:hidden">
                                      <StatusPill
                                        project={p}
                                        menuId={`${p.id}-compact`}
                                        open={statusMenu === `${p.id}-compact`}
                                        onOpen={() => {
                                          setLayer(null);
                                          setStatusMenu(`${p.id}-compact`);
                                        }}
                                        onClose={() => setStatusMenu(null)}
                                        onPick={(s) => setStatus(p.id, s)}
                                      />
                                      <span className={cx("whitespace-nowrap text-[12px] tabular-nums", late ? RED : META)}>
                                        <span className="sr-only">Due </span>
                                        {dueLabel(today, p.due)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className={cx(cell, "hidden @min-[440px]/table:table-cell")}>
                                    <StatusPill
                                      project={p}
                                      menuId={p.id}
                                      open={statusMenu === p.id}
                                      onOpen={() => {
                                        setLayer(null);
                                        setStatusMenu(p.id);
                                      }}
                                      onClose={() => setStatusMenu(null)}
                                      onPick={(s) => setStatus(p.id, s)}
                                    />
                                  </td>
                                  <td className={cx(cell, "@max-[499px]/table:rounded-r-md")}>
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        role="progressbar"
                                        aria-label={`${p.name} progress`}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={pct}
                                        className="h-1.5 min-w-0 flex-1 rounded-full bg-black/[0.07] dark:bg-white/[0.09]"
                                      >
                                        <motion.div
                                          className="h-full rounded-full bg-[#1f6bff]"
                                          initial={false}
                                          animate={{ clipPath: `inset(0 ${100 - pct}% 0 0 round 999px)` }}
                                          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                                        />
                                      </div>
                                      <span className={cx("w-9 shrink-0 text-right text-[12px] tabular-nums", SUB)}>{pct}%</span>
                                    </div>
                                  </td>
                                  <td className={cx(cell, "hidden text-right text-[12px] tabular-nums @min-[500px]/table:table-cell @max-[579px]/table:rounded-r-md", late ? RED : SUB)}>
                                    {dueLabel(today, p.due)}
                                  </td>
                                  <td className={cx(cell, "hidden rounded-r-md pr-2.5 @min-[580px]/table:table-cell")}>
                                    <span role="img" aria-label={`Team: ${team.map((m) => m.name).join(", ")}`} className="flex justify-end">
                                      <span className="flex -space-x-1">
                                        <AnimatePresence initial={false}>
                                          {team.slice(0, 3).map((m) => (
                                            <motion.span
                                              key={m.id}
                                              layout="position"
                                              initial={{ opacity: 0, transform: reduce ? "none" : "scale(0.8)" }}
                                              animate={{ opacity: 1, transform: "scale(1)" }}
                                              exit={{ opacity: 0 }}
                                              transition={{ duration: 0.2, ease: EASE, layout: SPRING }}
                                              className="flex"
                                            >
                                              <Avatar member={m} size={22} ring />
                                            </motion.span>
                                          ))}
                                        </AnimatePresence>
                                        {team.length > 3 && (
                                          <span
                                            aria-hidden
                                            className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#ececee] px-1 text-[9px] font-semibold tabular-nums text-[#52525b] ring-2 ring-white dark:bg-[#2a2a2d] dark:text-[#c8c8cf] dark:ring-[#161617]"
                                          >
                                            +{team.length - 3}
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                {/* Right column */}
                <div className="flex min-w-0 flex-col gap-4">
                  <section data-section="deadlines" aria-labelledby={`${uid}-dl`} className={CARD}>
                    <h2 id={`${uid}-dl`} className={cx("px-4 pb-1 pt-3.5 text-[14px] font-semibold", INK)}>
                      Upcoming deadlines
                    </h2>
                    <div className="px-1.5 pb-1.5">
                      {deadlineGroups.every((g) => g.items.length === 0) && (
                        <p className={cx("px-2.5 py-6 text-center text-[12px]", META)}>No deadlines in the next 7 days.</p>
                      )}
                      {deadlineGroups.map((g) =>
                        g.items.length === 0 ? null : (
                          <div key={g.key} className="pt-1.5">
                            <h3 className={cx("flex items-center gap-1.5 px-2.5 pb-0.5 pt-1 text-[12px]", META)}>
                              <span className={cx("font-medium", g.key === "week" ? SUB : AMBER)}>{g.label}</span>
                              <span className="tabular-nums">
                                <Num value={g.items.length} />
                              </span>
                            </h3>
                            <ul>
                              <AnimatePresence initial={false}>
                                {(deadlinesOpen ? g.items : g.items.slice(0, DEADLINES_PER_GROUP)).map((t) => {
                                  const proj = projects.get(t.project);
                                  return (
                                    <motion.li
                                      key={t.id}
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 32, opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
                                      className="overflow-hidden"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => highlightTask(t.id)}
                                        aria-label={`${t.title}, ${proj?.name ?? ""}. Show task`}
                                        className={cx(
                                          "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px]",
                                          INK,
                                          HOVER,
                                          PRESS,
                                          "active:scale-[0.98]",
                                          FOCUS_IN,
                                        )}
                                      >
                                        <Dot color={proj?.color ?? "#999"} />
                                        <span className="truncate">{t.title}</span>
                                        {t.mine && <span className={cx("ml-auto shrink-0 text-[12px]", META)}>You</span>}
                                      </button>
                                    </motion.li>
                                  );
                                })}
                              </AnimatePresence>
                            </ul>
                          </div>
                        ),
                      )}
                      {(hiddenDeadlines > 0 || deadlinesOpen) && (
                        <button
                          type="button"
                          aria-expanded={deadlinesOpen}
                          onClick={() => setDeadlinesOpen((o) => !o)}
                          className={cx("mt-1 flex h-8 w-full items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium", SUB, HOVER, FOCUS_IN)}
                        >
                          {deadlinesOpen ? "Show less" : `+${hiddenDeadlines} more`}
                          <ChevronDown
                            aria-hidden
                            className={cx("size-3.5 transition-transform duration-200", deadlinesOpen && "rotate-180")}
                          />
                        </button>
                      )}
                    </div>
                  </section>

                  <section data-section="activity" aria-labelledby={`${uid}-act`} className={CARD}>
                    <div className="flex items-center px-4 pb-1 pt-3">
                      <h2 id={`${uid}-act`} className={cx("text-[14px] font-semibold", INK)}>
                        Recent activity
                      </h2>
                      {activity.length > 5 && (
                        <button
                          type="button"
                          aria-expanded={activityOpen}
                          onClick={() => setActivityOpen((o) => !o)}
                          className={cx(BTN_GHOST, "ml-auto h-7 px-2 text-[12px]")}
                        >
                          {activityOpen ? "Show less" : "View all"}
                        </button>
                      )}
                    </div>
                    <ul className="px-1.5 pb-2">
                      <AnimatePresence initial={false}>
                        {activityShown.map((a) => {
                          const actor = members.get(a.actor);
                          const proj = a.project ? projects.get(a.project) : undefined;
                          return (
                            <motion.li
                              key={a.id}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}
                              className="overflow-hidden"
                            >
                              <div className="flex gap-2.5 px-2.5 py-2">
                                {actor && <Avatar member={actor} size={20} />}
                                <div className="min-w-0 flex-1 text-[13px] leading-[18px]">
                                  <p className={SUB}>
                                    <span className={cx("font-medium", INK)}>{a.actor === ME ? "You" : actor?.name}</span> {a.verb}{" "}
                                    <span className={INK}>{a.target}</span>
                                    {a.extra ? ` ${a.extra}` : ""}
                                  </p>
                                  <p className={cx("mt-0.5 text-[12px]", META)}>
                                    {proj && proj.name !== a.target && `${proj.name} · `}
                                    <time dateTime={new Date(a.at).toISOString()}>{timeAgo(now, a.at)}</time>
                                  </p>
                                </div>
                              </div>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer (narrow frames) */}
        <AnimatePresence>
          {drawer && (
            <DrawerLayer key="drawer" onClose={() => setDrawer(false)}>
              <Sidebar variant="drawer" rail={false} {...sidebarProps} />
            </DrawerLayer>
          )}
        </AnimatePresence>

        {/* Workspace menu */}
        <AnimatePresence>
          {layer === "workspace" && (
            <WorkspaceMenu
              key="ws"
              current={workspaceId}
              onClose={() => setLayer(null)}
              onPick={(id) => {
                setLayer(null);
                if (id !== workspaceId) {
                  setWorkspaceId(id);
                  toast({ message: `Switched to ${WORKSPACES.find((w) => w.id === id)?.name}`, icon: Check, tone: "neutral" });
                }
              }}
              onInvite={() => {
                setDrawer(false);
                setLayer("invite");
              }}
              onSearch={() => {
                setDrawer(false);
                setLayer("palette");
              }}
            />
          )}
        </AnimatePresence>

        {/* Command palette */}
        <AnimatePresence>{layer === "palette" && <Palette key="palette" items={paletteItems} onClose={() => setLayer(null)} />}</AnimatePresence>

        {/* All tasks */}
        <AnimatePresence>
          {layer === "all" && (
            <AllTasksDialog
              key="all"
              tasks={tasks}
              scope={allScope}
              tab={allTab}
              onScope={setAllScope}
              onTab={setAllTab}
              today={today}
              projects={projects}
              onToggle={(id) => toggleTask(id)}
              flash={flash}
              onClose={() => setLayer(null)}
            />
          )}
        </AnimatePresence>

        {/* Rail tooltip */}
        {tip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-[70] -translate-y-1/2 whitespace-nowrap rounded-md bg-[#18181b] px-2 py-1 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] dark:bg-[#ededef] dark:text-[#18181b]"
            style={{ top: tip.top, left: tip.left }}
          >
            {tip.label}
          </div>
        )}

        {/* Toasts */}
        <ol
          aria-live="polite"
          aria-label="Notifications"
          className="pointer-events-none absolute bottom-3 right-3 z-[80] flex w-[min(340px,calc(100%-24px))] flex-col gap-2"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </MotionConfig>
  );
}

function DrawerLayer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = useFocusTrap(ref, onClose);
  return (
    <div className="absolute inset-0 z-40 @4xl:hidden">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/30 dark:bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Sidebar"
        onKeyDown={onKeyDown}
        initial={{ opacity: reduce ? 0 : 1, transform: reduce ? "none" : "translateX(-100%)" }}
        animate={{ opacity: 1, transform: "translateX(0%)" }}
        exit={{ opacity: reduce ? 0 : 1, transform: reduce ? "none" : "translateX(-100%)", transition: { duration: 0.2, ease: EASE_DRAWER } }}
        transition={{ duration: 0.28, ease: EASE_DRAWER }}
        className="absolute inset-y-0 left-0 w-[272px] max-w-[86%] border-r border-[#e3e3e6] bg-[#f6f6f7] shadow-[8px_0_32px_-12px_rgba(0,0,0,0.25)] dark:border-[#232325] dark:bg-[#0f0f10]"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* Render on the client only: greetings, dates and relative times depend on the
   viewer's clock, so server HTML would never match. The frame keeps its size. */
const subscribeNoop = () => () => {};

export default function WorkspaceDashboard() {
  const ready = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  return (
    <div className="@container w-full">
      {ready ? (
        <Dashboard />
      ) : (
        <div aria-hidden className="h-[760px] w-full rounded-[10px] border border-[#e3e3e6] bg-[#fbfbfb] dark:border-[#232325] dark:bg-[#0f0f10]" />
      )}
    </div>
  );
}
