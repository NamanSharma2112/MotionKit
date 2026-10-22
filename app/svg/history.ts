/* Undo/redo for the canvas document (shapes + artboard).
   - commit(next, mergeKey?): a new undo step. Commits that share a mergeKey
     within MERGE_MS fold into one step (slider scrubs, repeated nudges).
   - setLive(next): change the document without a step (mid-drag).
   - record(before): close a live gesture into one step. */

import { useCallback, useState } from "react";
import type { Shape } from "./shapes";

export type Board = { w: number; h: number };
export type Doc = { shapes: Shape[]; board: Board };

const LIMIT = 150;
const MERGE_MS = 900;

type State = { past: Doc[]; present: Doc; future: Doc[]; mergeKey: string | null; mergeAt: number };

type Next = Doc | ((d: Doc) => Doc);
const resolve = (next: Next, d: Doc) => (typeof next === "function" ? next(d) : next);

export function useHistory(initial: Doc) {
  const [state, setState] = useState<State>({ past: [], present: initial, future: [], mergeKey: null, mergeAt: 0 });

  const commit = useCallback((next: Next, mergeKey?: string) => {
    const now = Date.now();
    setState((s) => {
      const doc = resolve(next, s.present);
      if (doc === s.present) return s;
      const merge = mergeKey !== undefined && s.mergeKey === mergeKey && now - s.mergeAt < MERGE_MS;
      return {
        past: merge ? s.past : [...s.past, s.present].slice(-LIMIT),
        present: doc,
        future: [],
        mergeKey: mergeKey ?? null,
        mergeAt: now,
      };
    });
  }, []);

  const setLive = useCallback((next: Next) => {
    setState((s) => ({ ...s, present: resolve(next, s.present) }));
  }, []);

  const record = useCallback((before: Doc) => {
    setState((s) =>
      s.present === before ? s : { ...s, past: [...s.past, before].slice(-LIMIT), future: [], mergeKey: null },
    );
  }, []);

  const undo = useCallback(() => {
    setState((s) =>
      s.past.length
        ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future], mergeKey: null, mergeAt: 0 }
        : s,
    );
  }, []);

  const redo = useCallback(() => {
    setState((s) =>
      s.future.length
        ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1), mergeKey: null, mergeAt: 0 }
        : s,
    );
  }, []);

  return {
    doc: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit,
    setLive,
    record,
    undo,
    redo,
  };
}
