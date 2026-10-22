/* Hover outline, selection frame, resize/rotate handles and the marquee,
   drawn in artboard units but sized in screen pixels (divided by zoom). */

import { HANDLE_POS, handleCursor, usableHandles, type Frame } from "./transform";
import { boxCenter, shapeBounds, type Box, type Shape } from "./shapes";

const ACCENT = "var(--mk-accent)";

function rotateAttr(box: Box, rotation: number) {
  if (!rotation) return undefined;
  const c = boxCenter(box);
  return `rotate(${rotation} ${c.x} ${c.y})`;
}

function Outline({ s, opacity, width = 1 }: { s: Shape; opacity: number; width?: number }) {
  const b = shapeBounds(s);
  return (
    <rect
      x={b.x}
      y={b.y}
      width={b.w}
      height={b.h}
      fill="none"
      stroke={ACCENT}
      strokeWidth={width}
      opacity={opacity}
      vectorEffect="non-scaling-stroke"
      transform={rotateAttr(b, s.rotation ?? 0)}
    />
  );
}

export default function SelectionOverlay({
  z,
  selection,
  frame,
  hover,
  marquee,
  handles,
}: {
  z: number;
  selection: Shape[];
  frame: Frame | null;
  hover: Shape | null;
  marquee: Box | null;
  handles: boolean;
}) {
  const k = 1 / z;
  const box = frame?.box;
  return (
    <g pointerEvents="none">
      {hover && <Outline s={hover} opacity={0.7} width={1.5} />}
      {selection.length > 1 && selection.map((s) => <Outline key={s.id} s={s} opacity={0.45} />)}

      {frame && box && (
        <g transform={rotateAttr(box, frame.rotation)}>
          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke={ACCENT} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          {handles && (
            <>
              <line
                x1={box.x + box.w / 2}
                y1={box.y}
                x2={box.x + box.w / 2}
                y2={box.y - 22 * k}
                stroke={ACCENT}
                strokeWidth={1.25}
                vectorEffect="non-scaling-stroke"
              />
              <g data-handle="rotate" pointerEvents="all" style={{ cursor: "grab" }}>
                <circle cx={box.x + box.w / 2} cy={box.y - 22 * k} r={13 * k} fill="transparent" />
                <circle
                  className="svg-handle"
                  cx={box.x + box.w / 2}
                  cy={box.y - 22 * k}
                  r={4.5 * k}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
              {usableHandles(frame, 1e-3).map((h) => {
                const [fx, fy] = HANDLE_POS[h];
                const cx = box.x + box.w * fx;
                const cy = box.y + box.h * fy;
                return (
                  <g key={h} data-handle={h} pointerEvents="all" style={{ cursor: handleCursor(h, frame.rotation) }}>
                    <rect x={cx - 10 * k} y={cy - 10 * k} width={20 * k} height={20 * k} fill="transparent" />
                    <rect
                      className="svg-handle"
                      x={cx - 4 * k}
                      y={cy - 4 * k}
                      width={8 * k}
                      height={8 * k}
                      rx={1.5 * k}
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
            </>
          )}
        </g>
      )}

      {marquee && (
        <rect
          x={marquee.x}
          y={marquee.y}
          width={marquee.w}
          height={marquee.h}
          fill={ACCENT}
          fillOpacity={0.08}
          stroke={ACCENT}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}
