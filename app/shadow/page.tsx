"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import Link from "next/link";


// ── types ──────────────────────────────────────────────
interface ShadowConfig {
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: string;
    opacity: number;
    inset: boolean;
}

interface BorderConfig {
    width: number;
    style: "solid" | "dashed" | "dotted" | "double" | "none";
    color: string;
    radius: number;
}

type PreviewTarget = "button" | "card" | "input" | "badge";

const FOOTER_LINKS = [
    { label: "Home", href: "/" },
    { label: "Components", href: "/components" },
    { label: "GitHub", href: "https://github.com/NamanSharma2112" },
];

// ── helpers ──────────────────────────────────────────────
function hexToRgba(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity.toFixed(2)})`;
}

function buildBoxShadow(s: ShadowConfig): string {
    const color = hexToRgba(s.color, s.opacity);
    return `${s.inset ? "inset " : ""}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${color}`;
}

function buildBorder(b: BorderConfig): string {
    if (b.style === "none") return "none";
    return `${b.width}px ${b.style} ${b.color}`;
}

function buildCSS(shadow: ShadowConfig, border: BorderConfig): string {
    const lines: string[] = [];
    lines.push(`box-shadow: ${buildBoxShadow(shadow)};`);
    if (border.style !== "none") {
        lines.push(`border: ${buildBorder(border)};`);
    }
    if (border.radius > 0) {
        lines.push(`border-radius: ${border.radius}px;`);
    }
    return lines.join("\n");
}

// ── slider component ──────────────────────────────────────────────
function Slider({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    unit = "px",
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    unit?: string;
}) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {label}
                </label>
                <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 tabular-nums">
                    {value}
                    {unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-violet-500 bg-zinc-200 dark:bg-zinc-700"
            />
        </div>
    );
}

// ── color swatch picker ──────────────────────────────────────────────
function ColorPicker({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    const SWATCHES = [
        "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
        "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
    ];
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {label}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
                {SWATCHES.map((c) => (
                    <button
                        key={c}
                        onClick={() => onChange(c)}
                        title={c}
                        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
                        style={{
                            background: c,
                            borderColor: value === c ? "#8b5cf6" : "transparent",
                            outline: value === c ? "2px solid #8b5cf6" : "none",
                            outlineOffset: "1px",
                        }}
                    />
                ))}
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent p-0"
                    title="Custom colour"
                />
            </div>
        </div>
    );
}

// ── preview components ──────────────────────────────────────────────
function PreviewButton({
    boxShadow,
    border,
    borderRadius,
}: {
    boxShadow: string;
    border: string;
    borderRadius: number;
}) {
    return (
        <button
            className="px-6 py-3 font-medium text-sm bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 transition-all duration-200 cursor-default select-none"
            style={{ boxShadow, border, borderRadius }}
        >
            Click me
        </button>
    );
}

function PreviewCard({
    boxShadow,
    border,
    borderRadius,
}: {
    boxShadow: string;
    border: string;
    borderRadius: number;
}) {
    return (
        <div
            className="w-52 p-4 bg-white dark:bg-zinc-900 transition-all duration-200"
            style={{ boxShadow, border, borderRadius }}
        >
            <div className="w-full h-2 rounded bg-zinc-200 dark:bg-zinc-700 mb-3" />
            <div className="w-3/4 h-2 rounded bg-zinc-100 dark:bg-zinc-800 mb-2" />
            <div className="w-1/2 h-2 rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
    );
}

function PreviewInput({
    boxShadow,
    border,
    borderRadius,
}: {
    boxShadow: string;
    border: string;
    borderRadius: number;
}) {
    return (
        <input
            type="text"
            placeholder="Type something…"
            className="px-4 py-2.5 text-sm bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none w-56 transition-all duration-200"
            style={{ boxShadow, border, borderRadius }}
            readOnly
        />
    );
}

function PreviewBadge({
    boxShadow,
    border,
    borderRadius,
}: {
    boxShadow: string;
    border: string;
    borderRadius: number;
}) {
    return (
        <span
            className="px-3 py-1 text-xs font-semibold bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 transition-all duration-200"
            style={{ boxShadow, border, borderRadius }}
        >
            New ✦
        </span>
    );
}

// ── main page ──────────────────────────────────────────────
export default function ShadowPage() {
    const [shadow, setShadow] = useState<ShadowConfig>({
        offsetX: 4,
        offsetY: 8,
        blur: 24,
        spread: 0,
        color: "#8b5cf6",
        opacity: 0.35,
        inset: false,
    });

    const [border, setBorder] = useState<BorderConfig>({
        width: 1,
        style: "solid",
        color: "#e4e4e7",
        radius: 10,
    });

    const [target, setTarget] = useState<PreviewTarget>("button");
    const [copied, setCopied] = useState(false);

    const updateShadow = useCallback(
        <K extends keyof ShadowConfig>(key: K, val: ShadowConfig[K]) =>
            setShadow((p) => ({ ...p, [key]: val })),
        []
    );

    const updateBorder = useCallback(
        <K extends keyof BorderConfig>(key: K, val: BorderConfig[K]) =>
            setBorder((p) => ({ ...p, [key]: val })),
        []
    );

    const boxShadowValue = buildBoxShadow(shadow);
    const borderValue = buildBorder(border);
    const cssOutput = buildCSS(shadow, border);

    const handleCopy = () => {
        navigator.clipboard.writeText(cssOutput);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const TARGETS: PreviewTarget[] = ["button", "card", "input", "badge"];

    const previewProps = {
        boxShadow: boxShadowValue,
        border: borderValue,
        borderRadius: border.radius,
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
        >
            <main className="relative max-w-[900px] mx-auto px-8 pt-14 pb-0 text-zinc-800 dark:text-zinc-200 leading-[1.7] antialiased border-l border-r border-dashed border-zinc-200 dark:border-zinc-800">
                {/* Header */}
                <header className="mb-10 animate-[fadeUp_0.7s_cubic-bezier(0.22,1,0.36,1)_0.05s_backwards]">
                    <div className="flex items-center justify-between mb-1">
                        <h1 className="text-base font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
                            Shadow Studio
                        </h1>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors duration-200 no-underline"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5" />
                                <polyline points="12 19 5 12 12 5" />
                            </svg>
                            Back home
                        </Link>
                    </div>
                    <p className="text-[13px] text-zinc-400 font-normal">
                        Visually design box-shadows and borders. Copy the CSS when you&apos;re happy.
                    </p>
                </header>

                {/* Main canvas */}
                <div className="animate-[fadeUp_0.7s_cubic-bezier(0.22,1,0.36,1)_0.1s_backwards] grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-10">

                    {/* ── Preview pane ── */}
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.04),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.08),transparent_70%)] overflow-hidden">
                        {/* target tabs */}
                        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-4 pt-3">
                            {TARGETS.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTarget(t)}
                                    className={`px-3 py-1.5 text-[12px] font-medium capitalize rounded-t-md transition-colors -mb-px ${target === t
                                        ? "text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 border-b-white dark:border-b-zinc-900 bg-white dark:bg-zinc-900"
                                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border border-transparent"
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* preview canvas */}
                        <div
                            className="flex items-center justify-center"
                            style={{
                                minHeight: 280,
                                backgroundImage:
                                    "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
                                backgroundSize: "20px 20px",
                            }}
                        >
                            <motion.div
                                key={target}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.25 }}
                            >
                                {target === "button" && <PreviewButton {...previewProps} />}
                                {target === "card" && <PreviewCard {...previewProps} />}
                                {target === "input" && <PreviewInput {...previewProps} />}
                                {target === "badge" && <PreviewBadge {...previewProps} />}
                            </motion.div>
                        </div>

                        {/* CSS output */}
                        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                                    Generated CSS
                                </span>
                                <button
                                    onClick={handleCopy}
                                    className="text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors flex items-center gap-1"
                                >
                                    {copied ? (
                                        <>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                            Copy CSS
                                        </>
                                    )}
                                </button>
                            </div>
                            <pre className="font-mono text-[12px] text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950 rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                                {cssOutput}
                            </pre>
                        </div>
                    </div>

                    {/* ── Controls pane ── */}
                    <div className="flex flex-col gap-6">
                        {/* Shadow controls */}
                        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-4 bg-white/50 dark:bg-zinc-900/50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                    Box Shadow
                                </h2>
                                <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={shadow.inset}
                                        onChange={(e) => updateShadow("inset", e.target.checked)}
                                        className="accent-violet-500 w-3 h-3"
                                    />
                                    Inset
                                </label>
                            </div>

                            <Slider label="Offset X" value={shadow.offsetX} min={-80} max={80} onChange={(v) => updateShadow("offsetX", v)} />
                            <Slider label="Offset Y" value={shadow.offsetY} min={-80} max={80} onChange={(v) => updateShadow("offsetY", v)} />
                            <Slider label="Blur" value={shadow.blur} min={0} max={120} onChange={(v) => updateShadow("blur", v)} />
                            <Slider label="Spread" value={shadow.spread} min={-40} max={60} onChange={(v) => updateShadow("spread", v)} />
                            <Slider label="Opacity" value={shadow.opacity} min={0} max={1} step={0.01} onChange={(v) => updateShadow("opacity", v)} unit="" />
                            <ColorPicker label="Color" value={shadow.color} onChange={(v) => updateShadow("color", v)} />
                        </section>

                        {/* Border controls */}
                        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-4 bg-white/50 dark:bg-zinc-900/50">
                            <h2 className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                Border
                            </h2>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Style
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {(["none", "solid", "dashed", "dotted", "double"] as const).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => updateBorder("style", s)}
                                            className={`px-2.5 py-1 text-[11px] rounded-md capitalize transition-colors ${border.style === s
                                                ? "bg-violet-500 text-white"
                                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Slider label="Width" value={border.width} min={0} max={12} onChange={(v) => updateBorder("width", v)} />
                            <Slider label="Radius" value={border.radius} min={0} max={60} onChange={(v) => updateBorder("radius", v)} />
                            <ColorPicker label="Color" value={border.color} onChange={(v) => updateBorder("color", v)} />
                        </section>

                        {/* Reset */}
                        <button
                            onClick={() => {
                                setShadow({ offsetX: 4, offsetY: 8, blur: 24, spread: 0, color: "#8b5cf6", opacity: 0.35, inset: false });
                                setBorder({ width: 1, style: "solid", color: "#e4e4e7", radius: 10 });
                            }}
                            className="text-[12px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-left"
                        >
                            ↺ Reset to defaults
                        </button>
                    </div>
                </div>

                {/* Presets */}
                <section className="mb-10 animate-[fadeUp_0.7s_cubic-bezier(0.22,1,0.36,1)_0.15s_backwards]">
                    <h2 className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                        Presets
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            {
                                label: "Soft Glow",
                                shadow: { offsetX: 0, offsetY: 0, blur: 40, spread: 0, color: "#8b5cf6", opacity: 0.4, inset: false },
                                border: { width: 1, style: "solid" as const, color: "#ddd6fe", radius: 14 },
                            },
                            {
                                label: "Hard Drop",
                                shadow: { offsetX: 6, offsetY: 6, blur: 0, spread: 0, color: "#000000", opacity: 0.9, inset: false },
                                border: { width: 2, style: "solid" as const, color: "#000000", radius: 0 },
                            },
                            {
                                label: "Inner Depth",
                                shadow: { offsetX: 0, offsetY: 4, blur: 12, spread: -2, color: "#000000", opacity: 0.2, inset: true },
                                border: { width: 1, style: "solid" as const, color: "#e4e4e7", radius: 10 },
                            },
                            {
                                label: "Neon Blue",
                                shadow: { offsetX: 0, offsetY: 0, blur: 20, spread: 2, color: "#3b82f6", opacity: 0.7, inset: false },
                                border: { width: 1, style: "solid" as const, color: "#3b82f6", radius: 8 },
                            },
                        ].map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => {
                                    setShadow(preset.shadow);
                                    setBorder(preset.border);
                                }}
                                className="group relative flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 hover:border-violet-300 dark:hover:border-violet-700 transition-all duration-200 hover:bg-violet-50/50 dark:hover:bg-violet-950/30"
                            >
                                {/* mini preview */}
                                <div
                                    className="w-10 h-10 bg-zinc-900 dark:bg-zinc-100 rounded-md transition-all duration-300"
                                    style={{
                                        boxShadow: buildBoxShadow(preset.shadow),
                                        border: buildBorder(preset.border),
                                        borderRadius: preset.border.radius,
                                    }}
                                />
                                <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                    {preset.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

            </main>
        </motion.div>
    );
}
