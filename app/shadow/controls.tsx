"use client";

import type { CSSProperties, ReactNode } from "react";
import { Pipette } from "lucide-react";

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "px",
  format,
  onChange,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const shown = format ? format(value) : `${Math.round(value * 10) / 10}${unit}`;
  return (
    <label className="mk-field gap-1.5">
      <span className="mk-field-row">
        <span>{label}</span>
        <span className="mk-value">{shown}</span>
      </span>
      <input
        type="range"
        className="mk-range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--p": `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

/** Swatch row with an optional "Auto" (theme) chip and a custom colour picker. */
export function ColorRow({
  label,
  value,
  swatches,
  onChange,
  allowAuto = false,
}: {
  label: string;
  value: string;
  swatches: string[];
  onChange: (v: string) => void;
  allowAuto?: boolean;
}) {
  const isCustom = value !== "auto" && !swatches.includes(value.toLowerCase());
  return (
    <div className="mk-field gap-2">
      <span className="mk-field-row">
        <span>{label}</span>
        <span className="mk-value">{value === "auto" ? "Theme" : value}</span>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {allowAuto && (
          <button
            type="button"
            className="mk-swatch relative overflow-hidden"
            data-active={value === "auto"}
            aria-label="Follow theme"
            title="Follow theme"
            onClick={() => onChange("auto")}
            style={{ background: "linear-gradient(135deg, #ffffff 50%, #18181b 50%)" }}
          />
        )}
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            className="mk-swatch"
            data-active={value.toLowerCase() === c}
            aria-label={c}
            title={c}
            onClick={() => onChange(c)}
            style={{ background: c }}
          />
        ))}
        <label
          className="mk-swatch relative grid place-items-center text-white"
          data-active={isCustom}
          title="Custom colour"
          style={{
            background: isCustom
              ? value
              : "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
          }}
        >
          <Pipette size={12} strokeWidth={2.25} className="drop-shadow" aria-hidden />
          <input
            type="color"
            aria-label={`Custom ${label.toLowerCase()} colour`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={value === "auto" ? "#ffffff" : value}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
