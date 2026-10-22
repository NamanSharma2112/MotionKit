"use client";

/* Right-panel sections for the canvas editor: the selection inspector, the
   style used for new shapes, and the artboard settings. */

import type { ReactNode } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  CopyPlus,
  Scan,
  Trash2,
} from "lucide-react";
import { ColorField, NumberField, RangeField } from "./controls";
import { BOARD_PRESETS, DASHES, FILL_SWATCHES, STROKE_SWATCHES } from "./editorConfig";
import { SHAPE_LABEL, type Dash, type Shape, type ToolType } from "./shapes";
import type { AlignKind, Frame } from "./transform";
import type { Board } from "./history";

/* The shared value of a property across the selection, or null when mixed. */
function common<T>(values: T[]): T | null {
  if (!values.length) return null;
  return values.every((v) => v === values[0]) ? values[0] : null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

const Mixed = ({ label, mixed }: { label: string; mixed: boolean }) => (
  <>
    {label}
    {mixed && <span className="ml-1.5 text-mk-faint">mixed</span>}
  </>
);

function Chips<T extends string>({ items, value, onChange }: { items: { value: T; label: ReactNode }[]; value: T | null; onChange: (v: T) => void }) {
  return (
    <div className="mk-chips">
      {items.map((d) => (
        <button key={d.value} type="button" className="mk-chip flex-1" data-active={value === d.value} onClick={() => onChange(d.value)}>
          {d.label}
        </button>
      ))}
    </div>
  );
}

/* ── Selection ─────────────────────────────────────────── */

export type FrameField = "x" | "y" | "w" | "h";

export function SelectionInspector({
  selection,
  frame,
  mod,
  onPatch,
  onFrame,
  onRotation,
  onAlign,
  onDistribute,
  onDuplicate,
  onDelete,
}: {
  selection: Shape[];
  frame: Frame;
  mod: string;
  onPatch: (patch: (s: Shape) => Shape, key?: string) => void;
  onFrame: (field: FrameField, value: number, key?: string) => void;
  onRotation: (deg: number, key?: string) => void;
  onAlign: (kind: AlignKind) => void;
  onDistribute: (axis: "h" | "v") => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const single = selection.length === 1 ? selection[0] : null;
  const stroked = selection.filter((s) => s.type !== "text");
  const fillable = selection.filter((s) => "fill" in s) as Extract<Shape, { fill: string }>[];
  const dashed = selection.filter((s) => "dash" in s) as Extract<Shape, { dash: string }>[];
  const color = common(selection.map((s) => s.color));
  const width = common(stroked.map((s) => ("width" in s ? s.width : 0)));
  const opacity = common(selection.map((s) => Math.round(s.opacity * 100)));
  const fills = fillable.map((s) => s.fill);
  const hasFill = fills.some((f) => f !== "none");
  const usedFills = fills.filter((f) => f !== "none");
  const fillColor = common(usedFills) ?? usedFills[0] ?? "#c7d7fe";
  const fillMixed = usedFills.length > 1 && common(usedFills) === null;
  const dash = common(dashed.map((s) => s.dash as Dash));
  const target = single ? "the artboard" : "the selection";

  const ALIGN: { kind: AlignKind; label: string; keys: string; icon: ReactNode }[] = [
    { kind: "left", label: "Align left", keys: "Alt A", icon: <AlignStartVertical size={15} /> },
    { kind: "hcenter", label: "Align horizontal centres", keys: "Alt H", icon: <AlignCenterVertical size={15} /> },
    { kind: "right", label: "Align right", keys: "Alt D", icon: <AlignEndVertical size={15} /> },
    { kind: "top", label: "Align top", keys: "Alt W", icon: <AlignStartHorizontal size={15} /> },
    { kind: "vcenter", label: "Align vertical centres", keys: "Alt V", icon: <AlignCenterHorizontal size={15} /> },
    { kind: "bottom", label: "Align bottom", keys: "Alt S", icon: <AlignEndHorizontal size={15} /> },
  ];

  return (
    <section className="mk-panel flex flex-col gap-4">
      <div className="mk-panel-head mb-0!">
        <h2 className="mk-panel-title">Selection</h2>
        <span className="mk-badge">{single ? SHAPE_LABEL[single.type] : `${selection.length} shapes`}</span>
      </div>

      <div className="svg-icon-row" role="toolbar" aria-label="Align and distribute">
        {ALIGN.map((a) => (
          <button
            key={a.kind}
            type="button"
            className="mk-tool"
            onClick={() => onAlign(a.kind)}
            aria-label={`${a.label} to ${target}`}
            title={`${a.label} to ${target} (${a.keys})`}
          >
            {a.icon}
          </button>
        ))}
        <button
          type="button"
          className="mk-tool"
          onClick={() => onDistribute("h")}
          disabled={selection.length < 3}
          aria-label="Distribute horizontally"
          title="Distribute horizontal spacing (3+ shapes)"
        >
          <AlignHorizontalDistributeCenter size={15} />
        </button>
        <button
          type="button"
          className="mk-tool"
          onClick={() => onDistribute("v")}
          disabled={selection.length < 3}
          aria-label="Distribute vertically"
          title="Distribute vertical spacing (3+ shapes)"
        >
          <AlignVerticalDistributeCenter size={15} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={r2(frame.box.x)} onChange={(v, s) => onFrame("x", v, s ? "frame-x" : undefined)} />
        <NumberField label="Y" value={r2(frame.box.y)} onChange={(v, s) => onFrame("y", v, s ? "frame-y" : undefined)} />
        <NumberField
          label="W"
          value={r2(frame.box.w)}
          min={0.1}
          disabled={frame.box.w < 1e-3}
          onChange={(v, s) => onFrame("w", v, s ? "frame-w" : undefined)}
        />
        <NumberField
          label="H"
          value={r2(frame.box.h)}
          min={0.1}
          disabled={frame.box.h < 1e-3}
          onChange={(v, s) => onFrame("h", v, s ? "frame-h" : undefined)}
        />
        <NumberField
          label={<span aria-label="Rotation">R</span>}
          suffix="°"
          title={single ? "Rotation (Shift-drag the round handle for 15° steps)" : "Rotation applies per shape"}
          value={single ? (single.rotation ?? 0) : common(selection.map((s) => s.rotation ?? 0))}
          onChange={(v, s) => onRotation(v, s ? "rotate" : undefined)}
        />
        {single?.type === "rect" && (
          <NumberField
            label={<span aria-label="Corner radius">CR</span>}
            value={single.rx}
            min={0}
            onChange={(v, s) => onPatch((x) => (x.type === "rect" ? { ...x, rx: v } : x), s ? "rx" : undefined)}
          />
        )}
        {single?.type === "polygon" && (
          <NumberField
            label={<span aria-label="Sides">N</span>}
            value={single.sides}
            min={3}
            max={12}
            onChange={(v, s) => onPatch((x) => (x.type === "polygon" ? { ...x, sides: Math.round(v) } : x), s ? "sides" : undefined)}
          />
        )}
      </div>

      <ColorField
        label={<Mixed label={stroked.length ? "Stroke" : "Colour"} mixed={color === null} />}
        value={color ?? selection[0].color}
        onChange={(c) => onPatch((s) => ({ ...s, color: c }), "color")}
        swatches={STROKE_SWATCHES}
      />
      {stroked.length > 0 && (
        <RangeField
          label="Stroke width"
          value={width ?? 0}
          onChange={(v) => onPatch((s) => ("width" in s ? { ...s, width: v } : s), "width")}
          min={0.5}
          max={40}
          step={0.5}
          unit="px"
        />
      )}
      {fillable.length > 0 && (
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-mk-muted">
            <input
              type="checkbox"
              className="mk-check"
              checked={hasFill}
              onChange={(e) => onPatch((s) => ("fill" in s ? { ...s, fill: e.target.checked ? fillColor : "none" } : s), "fill-toggle")}
            />
            Fill
          </label>
          {hasFill && (
            <ColorField label={<Mixed label="Fill colour" mixed={fillMixed} />} value={fillColor} onChange={(c) => onPatch((s) => ("fill" in s ? { ...s, fill: c } : s), "fill")} swatches={FILL_SWATCHES} />
          )}
        </div>
      )}
      <RangeField label="Opacity" value={opacity ?? 100} onChange={(v) => onPatch((s) => ({ ...s, opacity: v / 100 }), "opacity")} min={5} max={100} unit="%" />
      {dashed.length > 0 && (
        <div className="mk-field">
          <p className="mk-section-label mb-0!">Stroke style</p>
          <Chips items={DASHES} value={dash} onChange={(d) => onPatch((s) => ("dash" in s ? { ...s, dash: d } : s), "dash")} />
        </div>
      )}
      {single?.type === "text" && (
        <>
          <div className="mk-field">
            <label className="mk-section-label mb-0!" htmlFor="svg-sel-text">
              Text
            </label>
            <input
              id="svg-sel-text"
              type="text"
              className="mk-input"
              value={single.content}
              onChange={(e) => onPatch((s) => (s.type === "text" ? { ...s, content: e.target.value } : s), "content")}
            />
          </div>
          <RangeField
            label="Font size"
            value={single.fontSize}
            onChange={(v) => onPatch((s) => (s.type === "text" ? { ...s, fontSize: v } : s), "font-size")}
            min={1}
            max={240}
            unit="px"
          />
          <Chips
            items={[
              { value: "normal", label: "Regular" },
              { value: "bold", label: <b>Bold</b> },
            ]}
            value={single.fontWeight as "normal" | "bold"}
            onChange={(w) => onPatch((s) => (s.type === "text" ? { ...s, fontWeight: w } : s), "weight")}
          />
        </>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-mk-border pt-4">
        <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm justify-center" onClick={onDuplicate} title={`Duplicate (${mod} D)`}>
          <CopyPlus size={14} /> Duplicate
        </button>
        <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm justify-center" onClick={onDelete} title="Delete (Del)">
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </section>
  );
}

/* ── Style for new shapes ─────────────────────────────── */

export type DrawStyle = {
  strokeColor: string;
  useFill: boolean;
  fillColor: string;
  strokeWidth: number;
  strokeDash: Dash;
  opacity: number;
  cornerRadius: number;
  polygonSides: number;
  textContent: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
};

export function StylePanel({ tool, style, onChange }: { tool: ToolType; style: DrawStyle; onChange: (patch: Partial<DrawStyle>) => void }) {
  const set =
    <K extends keyof DrawStyle>(k: K) =>
    (v: DrawStyle[K]) =>
      onChange({ [k]: v } as Partial<DrawStyle>);
  return (
    <section className="mk-panel flex flex-col gap-5">
      <div className="mk-panel-head mb-0!">
        <h2 className="mk-panel-title">Style</h2>
        <span className="text-[12px] text-mk-faint">for new shapes</span>
      </div>
      <ColorField label={tool === "text" ? "Text colour" : "Stroke"} value={style.strokeColor} onChange={set("strokeColor")} swatches={STROKE_SWATCHES} />
      {tool !== "text" && tool !== "line" && (
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-mk-muted">
            <input type="checkbox" className="mk-check" checked={style.useFill} onChange={(e) => set("useFill")(e.target.checked)} />
            Fill shapes
          </label>
          {style.useFill && <ColorField label="Fill" value={style.fillColor} onChange={set("fillColor")} swatches={FILL_SWATCHES} />}
        </div>
      )}
      {tool !== "text" && <RangeField label="Stroke width" value={style.strokeWidth} onChange={set("strokeWidth")} min={0.5} max={40} step={0.5} unit="px" />}
      <RangeField label="Opacity" value={style.opacity} onChange={set("opacity")} min={10} max={100} unit="%" />
      {(tool === "brush" || tool === "line") && (
        <div className="mk-field">
          <p className="mk-section-label mb-0!">Stroke style</p>
          <Chips items={DASHES} value={style.strokeDash} onChange={set("strokeDash")} />
        </div>
      )}
      {tool === "rect" && <RangeField label="Corner radius" value={style.cornerRadius} onChange={set("cornerRadius")} min={0} max={100} unit="px" />}
      {tool === "polygon" && <RangeField label="Sides" value={style.polygonSides} onChange={set("polygonSides")} min={3} max={12} />}
      {tool === "text" && (
        <>
          <div className="mk-field">
            <label className="mk-section-label mb-0!" htmlFor="svg-text">
              Text
            </label>
            <input id="svg-text" type="text" className="mk-input" value={style.textContent} onChange={(e) => set("textContent")(e.target.value)} />
          </div>
          <RangeField label="Font size" value={style.fontSize} onChange={set("fontSize")} min={4} max={160} unit="px" />
          <Chips
            items={[
              { value: "normal", label: "Regular" },
              { value: "bold", label: <b>Bold</b> },
            ]}
            value={style.fontWeight}
            onChange={set("fontWeight")}
          />
        </>
      )}
    </section>
  );
}

/* ── Artboard ─────────────────────────────────────────── */

export function ArtboardPanel({
  board,
  grid,
  snap,
  hasShapes,
  onBoard,
  onGrid,
  onSnap,
  onTrim,
}: {
  board: Board;
  grid: number;
  snap: boolean;
  hasShapes: boolean;
  onBoard: (b: Board, grid?: number) => void;
  onGrid: (g: number) => void;
  onSnap: (v: boolean) => void;
  onTrim: () => void;
}) {
  const preset = BOARD_PRESETS.find((p) => p.w === board.w && p.h === board.h);
  return (
    <section className="mk-panel flex flex-col gap-4">
      <div className="mk-panel-head mb-0!">
        <h2 className="mk-panel-title">Artboard</h2>
        <span className="mk-value text-mk-muted!">
          {r2(board.w)} × {r2(board.h)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {BOARD_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="mk-chip h-auto! flex-col gap-0! px-1! py-1.5!"
            data-active={preset?.id === p.id}
            onClick={() => onBoard({ w: p.w, h: p.h }, p.grid)}
            title={`${p.w} × ${p.h}`}
          >
            <span>{p.label}</span>
            <span className="font-mono text-[10.5px] opacity-70">
              {p.w}×{p.h}
            </span>
          </button>
        ))}
        <span className="mk-chip h-auto! flex-col gap-0! px-1! py-1.5! pointer-events-none" data-active={!preset} aria-hidden={!!preset}>
          <span>Custom</span>
          <span className="font-mono text-[10.5px] opacity-70">set W, H</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="W" value={board.w} min={1} max={8192} onChange={(v) => onBoard({ w: Math.round(v), h: board.h })} title="Artboard width" />
        <NumberField label="H" value={board.h} min={1} max={8192} onChange={(v) => onBoard({ w: board.w, h: Math.round(v) })} title="Artboard height" />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-mk-border pt-4">
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-mk-muted">
          <input type="checkbox" className="mk-check" checked={snap} onChange={(e) => onSnap(e.target.checked)} />
          Snap to grid
        </label>
        <div className="w-[96px]">
          <NumberField label="px" value={grid} min={1} max={200} onChange={(v) => onGrid(Math.max(1, Math.round(v)))} title="Grid size" />
        </div>
      </div>
      <button
        type="button"
        className="mk-btn mk-btn-ghost mk-btn-sm justify-center"
        onClick={onTrim}
        disabled={!hasShapes}
        title="Resize the artboard to the visible shapes and move them to its origin"
      >
        <Scan size={14} /> Fit artboard to content
      </button>
    </section>
  );
}
