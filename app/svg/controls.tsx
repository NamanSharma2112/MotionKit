"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Copy, ImageUp } from "lucide-react";

export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mk-field">
      <div className="mk-field-row">
        <label htmlFor={id}>{label}</label>
        <span className="mk-value">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="mk-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ "--p": `${pct}%` } as CSSProperties}
      />
    </div>
  );
}

/* Swatch row plus a native colour picker for anything else. */
export function ColorField({
  label,
  value,
  onChange,
  swatches,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  swatches: string[];
}) {
  const id = useId();
  const custom = !swatches.some((s) => s.toLowerCase() === value.toLowerCase());
  return (
    <div className="mk-field">
      <div className="mk-field-row">
        <span>{label}</span>
        <span className="mk-value uppercase">{value}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            className="mk-swatch"
            data-active={value.toLowerCase() === c.toLowerCase()}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={`Use ${c}`}
            title={c}
          />
        ))}
        <label
          htmlFor={id}
          className="mk-swatch relative grid place-items-center overflow-hidden"
          data-active={custom}
          title="Custom colour"
          style={{
            background: custom
              ? value
              : "conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
          }}
        >
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Custom colour"
          />
        </label>
      </div>
    </div>
  );
}

export function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), timeout);
  };
  return { copied, copy };
}

export function CopyButton({ text, label = "Copy", disabled }: { text: string; label?: string; disabled?: boolean }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      className="mk-btn mk-btn-ghost mk-btn-sm"
      onClick={() => copy(text)}
      disabled={disabled}
      aria-live="polite"
    >
      <span className="mk-swap" data-state={copied ? "b" : "a"}>
        <Copy size={14} className="mk-swap-a" />
        <Check size={14} className="mk-swap-b" />
      </span>
      {copied ? "Copied" : label}
    </button>
  );
}

/* Click-or-drop image picker. */
export function Dropzone({
  onFile,
  fileName,
  hint,
}: {
  onFile: (file: File) => void;
  fileName?: string;
  hint: string;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      className="mk-dropzone"
      data-drag={drag}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) onFile(file);
      }}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <ImageUp size={20} className="text-mk-text" />
      <span className="font-medium text-mk-text">{fileName ? "Replace image" : "Upload an image"}</span>
      <span className="max-w-full truncate text-[12px]">{fileName ?? hint}</span>
    </label>
  );
}

const fmtNum = (n: number) => String(Math.round(n * 100) / 100);

/* Compact numeric input for the inspector. Type and press Enter (or blur),
   use ↑/↓ (Shift ×10), or drag the label sideways to scrub. `value: null`
   shows "Mixed" for multi-selections with differing values. */
export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
  disabled,
  title,
}: {
  label: ReactNode;
  value: number | null;
  onChange: (v: number, scrubbing?: boolean) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
  title?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const scrub = useRef<{ x: number; start: number } | null>(null);
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  const commitDraft = () => {
    if (draft === null) return;
    const v = parseFloat(draft);
    setDraft(null);
    if (Number.isFinite(v) && v !== value) onChange(clamp(v));
  };
  return (
    <div className="mk-num" data-disabled={disabled || undefined} title={title}>
      <label
        htmlFor={id}
        className="mk-num-label"
        onPointerDown={(e) => {
          if (disabled || value === null || e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub.current = { x: e.clientX, start: value };
        }}
        onPointerMove={(e) => {
          const s = scrub.current;
          if (!s) return;
          const steps = Math.round((e.clientX - s.x) / 2);
          const v = clamp(Math.round((s.start + steps * step) / step) * step);
          if (v !== value) onChange(v, true);
        }}
        onPointerUp={() => {
          scrub.current = null;
        }}
        onPointerCancel={() => {
          scrub.current = null;
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="mk-num-input"
        disabled={disabled}
        value={draft ?? (value === null ? "" : fmtNum(value))}
        placeholder={value === null ? "Mixed" : undefined}
        onFocus={(e) => {
          setDraft(value === null ? "" : fmtNum(value));
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitDraft();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && value !== null) {
            e.preventDefault();
            const v = clamp(value + (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1));
            setDraft(fmtNum(v));
            onChange(v, true);
          }
        }}
      />
      {suffix && <span className="mk-num-suffix">{suffix}</span>}
    </div>
  );
}
