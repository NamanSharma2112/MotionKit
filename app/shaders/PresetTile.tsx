"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  acquirePreviewHub,
  parseControls,
  releasePreviewHub,
  resolveValues,
  type PreviewHub,
  type UniformValues,
} from "./engine";
import type { ShaderPreset } from "./presets";

const controlsCache = new Map<string, ReturnType<typeof parseControls>>();
export const controlsFor = (p: ShaderPreset) => {
  let c = controlsCache.get(p.id);
  if (!c) {
    c = parseControls(p.source);
    controlsCache.set(p.id, c);
  }
  return c;
};

/* Preset tile. Thumbnails come from one shared WebGL context and are painted
   into a plain 2D canvas; hovering with a mouse plays it live. */
export default function PresetTile({
  preset,
  active,
  overrides,
  animate,
  onSelect,
}: {
  preset: ShaderPreset;
  active: boolean;
  overrides?: UniformValues;
  animate: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hubRef = useRef<PreviewHub | null>(null);
  const loopRef = useRef(0);
  const values = useMemo(() => resolveValues(controlsFor(preset), overrides), [preset, overrides]);

  useEffect(() => {
    hubRef.current = acquirePreviewHub();
    return () => {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = 0;
      hubRef.current = null;
      releasePreviewHub();
    };
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    const hub = hubRef.current;
    if (!c || !hub) return;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.round(r.width * dpr));
    c.height = Math.max(1, Math.round(r.height * dpr));
    hub.enqueue({ target: c, key: preset.id, source: preset.source, values, time: preset.thumbTime });
    return () => hub.cancel(c);
  }, [preset, values]);

  const startLive = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !animate || loopRef.current) return;
    const c = canvasRef.current;
    if (!c) return;
    let t = preset.thumbTime;
    let last = performance.now();
    const step = (now: number) => {
      const hub = hubRef.current;
      if (!hub) return;
      t += (now - last) / 1000;
      last = now;
      hub.render({ target: c, key: preset.id, source: preset.source, values, time: t });
      loopRef.current = requestAnimationFrame(step);
    };
    loopRef.current = requestAnimationFrame(step);
  };

  const stopLive = () => {
    cancelAnimationFrame(loopRef.current);
    loopRef.current = 0;
  };

  return (
    <button
      type="button"
      className="mk-option sh-tile"
      data-active={active}
      aria-pressed={active}
      onClick={onSelect}
      onPointerEnter={startLive}
      onPointerLeave={stopLive}
    >
      <canvas ref={canvasRef} className="sh-thumb" aria-hidden />
      <span className="mk-option-title">{preset.name}</span>
      <span className="mk-option-desc sh-tile-desc">{preset.description}</span>
    </button>
  );
}
