# MotionKit


https://github.com/user-attachments/assets/3b8f7188-6380-4c8c-9b89-3109fd123367














https://github.com/user-attachments/assets/7cac809d-4899-4b41-839f-c9d3e69b69c9


**Production-ready animated React components you can copy, paste, and ship.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-ff69b4)](https://www.framer.com/motion/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)

> No npm install. No dependencies to manage. Just copy the component file into your project and it works.

---

## 🎯 What is MotionKit?

MotionKit is a curated collection of **8 animated React components** built with Framer Motion and Tailwind CSS. Each component is:

- **Self-contained** — one file, zero external dependencies beyond `framer-motion`
- **Copy-paste ready** — click a button, get production code, paste into your project
- **Fully typed** — TypeScript-first with complete prop interfaces
- **Live previewed** — every component has an interactive demo page

This isn't a component library you install. It's a set of patterns you own and modify.

---

## 🧩 Components

| Component | Description | Key Technique |
|-----------|-------------|---------------|
| **Staggered List Reveal** | Children animate in sequence with configurable direction and delay | `motion.ul` + `staggerChildren` |
| **Magnetic Button** | Cursor-following button with spring physics and radial highlight | `useMotionValue` + `useSpring` |
| **Text Scramble** | Characters shuffle randomly then resolve to target string | `useRef` interval + character set |
| **Animated Counter** | Numbers count up with cubic easing when scrolled into view | `useInView` + `animate()` |
| **Parallax Tilt Card** | 3D perspective tilt with mouse tracking and glare effect | `rotateX/Y` springs + `useTransform` |
| **Scroll Reveal** | Elements animate in from any direction on scroll | `useInView` wrapper component |
| **Typewriter Effect** | Multi-string typewriter with configurable speed and pausing | Character-by-character state machine |
| **Spotlight Card** | Radial gradient spotlight that follows the cursor | CSS variables + mouse tracking |

---

## 🚀 Quick Start

```bash
git clone https://github.com/yourusername/motionkit.git
cd motionkit
npm install
npm run dev

motionkit/
├── app/
│   ├── page.tsx                         # Landing page with all previews
│   └── components/
│       ├── staggered-list/page.tsx      # Live demo + copy UI
│       ├── magnetic-button/page.tsx
│       ├── text-scramble/page.tsx
│       ├── animated-counter/page.tsx
│       ├── parallax-tilt/page.tsx
│       ├── scroll-reveal/page.tsx
│       ├── typewriter/page.tsx
│       └── spotlight/page.tsx
├── components/
│   ├── staggered-list/
│   │   ├── StaggeredListReveal.tsx      # The actual component
│   │   └── index.ts                     # Barrel export
│   ├── magnetic-button/
│   │   ├── MagneticButton.tsx
│   │   └── index.ts
│   ├── text-scramble/
│   │   ├── TextScramble.tsx
│   │   └── index.ts
│   └── ... (repeat for each component)
└── lib/
    └── utils.ts                         # Shared utilities (cn, etc.)
