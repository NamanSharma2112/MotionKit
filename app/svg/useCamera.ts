/* Zoom and pan for the canvas stage. The camera maps artboard units to stage
   pixels: screen = world * z + (x, y). While `fit` is on, the camera is derived
   from the stage size so the artboard stays centred as the layout changes. */

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { Board } from "./history";

export type Cam = { x: number; y: number; z: number };
type View = { fit: true } | ({ fit: false } & Cam);

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 100;
const STEPS = [0.02, 0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 100];

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function fitCam(board: Board, size: { w: number; h: number }): Cam {
  if (!size.w || !size.h) return { x: 0, y: 0, z: 1 };
  const pad = size.w < 560 ? 20 : 56;
  const z = clampZoom(Math.min((size.w - pad * 2) / board.w, (size.h - pad * 2) / board.h));
  return { z, x: (size.w - board.w * z) / 2, y: (size.h - board.h * z) / 2 };
}

export function useCamera(stageRef: RefObject<HTMLElement | null>, board: Board) {
  const [view, setView] = useState<View>({ fit: true });
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stageRef]);

  const cam: Cam = view.fit ? fitCam(board, size) : view;

  /* Zoom by `factor` keeping the stage point (sx, sy) fixed. */
  const zoomAt = useCallback(
    (sx: number, sy: number, factor: number | ((z: number) => number)) => {
      setView((v) => {
        const c = v.fit ? fitCam(board, size) : v;
        const z = clampZoom(typeof factor === "function" ? factor(c.z) : c.z * factor);
        return { fit: false, z, x: sx - (sx - c.x) * (z / c.z), y: sy - (sy - c.y) * (z / c.z) };
      });
    },
    [board, size],
  );

  const step = useCallback(
    (dir: 1 | -1) =>
      zoomAt(size.w / 2, size.h / 2, (z) =>
        dir > 0 ? (STEPS.find((s) => s > z * 1.001) ?? MAX_ZOOM) : ([...STEPS].reverse().find((s) => s < z * 0.999) ?? MIN_ZOOM),
      ),
    [zoomAt, size],
  );

  const setZoom = useCallback((z: number) => zoomAt(size.w / 2, size.h / 2, () => z), [zoomAt, size]);
  const fit = useCallback(() => setView({ fit: true }), []);
  const setCam = useCallback((c: Cam) => setView({ fit: false, ...c }), []);

  /* Ctrl/⌘ + wheel (and trackpad pinch, which arrives as ctrl+wheel) zooms
     toward the cursor. A plain wheel is left alone so the page scrolls. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-Math.max(-60, Math.min(60, dy)) * 0.01));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [stageRef, zoomAt]);

  return { cam, size, fitted: view.fit, zoomAt, step, setZoom, fit, setCam };
}
