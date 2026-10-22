"use client";

/* Layer list, top-most first. Click selects (Shift/⌘ adds), double-click
   renames, the eye and lock toggle visibility and locking, rows drag to
   reorder and the arrows move the selection one step. */

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import { SHAPE_ICON } from "./editorConfig";
import { shapeName, type Shape } from "./shapes";

type Drop = { id: string; place: "above" | "below" } | null;

export default function LayersPanel({
  shapes,
  selectedIds,
  hoverId,
  mod,
  onSelect,
  onHover,
  onToggle,
  onRename,
  onReorder,
  onStep,
}: {
  shapes: Shape[];
  selectedIds: string[];
  hoverId: string | null;
  mod: string;
  onSelect: (id: string, additive: boolean) => void;
  onHover: (id: string | null) => void;
  onToggle: (id: string, key: "hidden" | "locked") => void;
  onRename: (id: string, name: string) => void;
  onReorder: (dragId: string, targetId: string, place: "above" | "below") => void;
  onStep: (dir: 1 | -1) => void;
}) {
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop>(null);
  const rows = [...shapes].reverse();
  const selected = new Set(selectedIds);
  const top = shapes.length - 1;
  const selIdx = shapes.map((s, i) => (selected.has(s.id) ? i : -1)).filter((i) => i >= 0);
  const canUp = selIdx.length > 0 && Math.max(...selIdx) < top;
  const canDown = selIdx.length > 0 && Math.min(...selIdx) > 0;

  const finishRename = () => {
    if (renaming) onRename(renaming.id, renaming.value.trim());
    setRenaming(null);
  };

  return (
    <section className="mk-panel">
      <div className="mk-panel-head mb-2!">
        <h2 className="mk-panel-title">
          Layers <span className="ml-1 font-normal text-mk-faint tabular-nums">{shapes.length}</span>
        </h2>
        <div className="flex gap-0.5">
          <button type="button" className="mk-tool h-7! min-w-7! px-0!" onClick={() => onStep(1)} disabled={!canUp} aria-label="Bring forward" title="Bring forward (])">
            <ArrowUp size={15} />
          </button>
          <button type="button" className="mk-tool h-7! min-w-7! px-0!" onClick={() => onStep(-1)} disabled={!canDown} aria-label="Send backward" title="Send backward ([)">
            <ArrowDown size={15} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="m-0 py-3 text-[12.5px] text-mk-muted">No layers yet. Shapes you draw appear here, top-most first.</p>
      ) : (
        <ul className="svg-layers" aria-label="Layers" onPointerLeave={() => onHover(null)}>
          {rows.map((s) => {
            const isRenaming = renaming?.id === s.id;
            return (
              <li
                key={s.id}
                className="svg-layer"
                data-selected={selected.has(s.id)}
                data-hover={hoverId === s.id && !selected.has(s.id)}
                data-hidden={!!s.hidden}
                data-dragging={dragId === s.id}
                data-drop={drop?.id === s.id && dragId !== s.id ? drop.place : undefined}
                draggable={!isRenaming}
                onDragStart={(e) => {
                  setDragId(s.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", s.id);
                }}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  const place = e.clientY < r.top + r.height / 2 ? "above" : "below";
                  if (drop?.id !== s.id || drop.place !== place) setDrop({ id: s.id, place });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && drop && dragId !== drop.id) onReorder(dragId, drop.id, drop.place);
                  setDragId(null);
                  setDrop(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDrop(null);
                }}
                onPointerEnter={() => onHover(s.id)}
              >
                <span className="svg-layer-icon">{SHAPE_ICON[s.type]}</span>
                {isRenaming ? (
                  <input
                    className="svg-layer-rename"
                    value={renaming.value}
                    autoFocus
                    aria-label="Layer name"
                    onChange={(e) => setRenaming({ id: s.id, value: e.target.value })}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={finishRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") finishRename();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="svg-layer-name"
                    onClick={(e) => onSelect(s.id, e.shiftKey || e.metaKey || e.ctrlKey)}
                    onDoubleClick={() => setRenaming({ id: s.id, value: shapeName(s) })}
                    title={s.locked ? "Locked. Unlock to select it on the canvas." : `Click to select, Shift/${mod} click to add, double-click to rename`}
                    aria-pressed={selected.has(s.id)}
                  >
                    {shapeName(s)}
                  </button>
                )}
                <button
                  type="button"
                  className="svg-layer-act"
                  data-on={!!s.hidden}
                  onClick={() => onToggle(s.id, "hidden")}
                  aria-label={s.hidden ? `Show ${shapeName(s)}` : `Hide ${shapeName(s)}`}
                  title={s.hidden ? `Show (${mod} Shift H)` : `Hide (${mod} Shift H)`}
                >
                  {s.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  type="button"
                  className="svg-layer-act"
                  data-on={!!s.locked}
                  onClick={() => onToggle(s.id, "locked")}
                  aria-label={s.locked ? `Unlock ${shapeName(s)}` : `Lock ${shapeName(s)}`}
                  title={s.locked ? `Unlock (${mod} Shift L)` : `Lock (${mod} Shift L)`}
                >
                  {s.locked ? <Lock size={14} /> : <LockOpen size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
