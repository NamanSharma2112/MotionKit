"use client";

import { useImperativeHandle, useMemo, useRef, type Ref } from "react";

export type CodeEditorHandle = { focusLine: (line: number) => void };

const INDENT = "  ";

/* A small GLSL editor: monospace textarea with a synced line-number gutter,
   error-line highlights, Tab/Shift+Tab indent, auto-indent on Enter and
   ⌘/Ctrl+S to compile now. Press Esc, then Tab, to move focus out. */
export default function CodeEditor({
  value,
  onChange,
  onSubmit,
  errorLines,
  ref,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  errorLines: number[];
  ref?: Ref<CodeEditorHandle>;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<HTMLDivElement>(null);
  const escaped = useRef(false);

  const lineCount = useMemo(() => value.split("\n").length, [value]);
  const errorSet = useMemo(() => new Set(errorLines), [errorLines]);

  const syncScroll = () => {
    const ta = taRef.current;
    if (!ta) return;
    const y = `translateY(${-ta.scrollTop}px)`;
    if (gutterRef.current) gutterRef.current.style.transform = y;
    if (marksRef.current) marksRef.current.style.transform = y;
  };

  useImperativeHandle(ref, () => ({
    focusLine(line: number) {
      const ta = taRef.current;
      if (!ta) return;
      const lines = ta.value.split("\n");
      const n = Math.min(Math.max(1, line), lines.length);
      let start = 0;
      for (let i = 0; i < n - 1; i++) start += lines[i].length + 1;
      ta.focus();
      ta.setSelectionRange(start, start + lines[n - 1].length);
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      ta.scrollTop = Math.max(0, (n - 1) * lh - ta.clientHeight / 2);
      syncScroll();
    },
  }));

  // execCommand keeps the native undo stack; fall back to setRangeText.
  const insert = (text: string, start: number, end: number) => {
    const ta = taRef.current;
    if (!ta) return;
    ta.setSelectionRange(start, end);
    let ok = false;
    try {
      ok = document.execCommand("insertText", false, text);
    } catch {
      ok = false;
    }
    if (!ok) {
      ta.setRangeText(text, start, end, "end");
      onChange(ta.value);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const { selectionStart: s, selectionEnd: en, value: v } = ta;
    const lineStart = v.lastIndexOf("\n", s - 1) + 1;

    if (e.key === "Escape") {
      escaped.current = true;
      return;
    }
    if (e.key === "Tab" && escaped.current) {
      escaped.current = false;
      return;
    }
    escaped.current = false;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onSubmit?.();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      if (s === en && !e.shiftKey) {
        insert(INDENT, s, en);
        return;
      }
      const end = en > s && v[en - 1] === "\n" ? en - 1 : en;
      const lineEnd = v.indexOf("\n", end);
      const blockEnd = lineEnd === -1 ? v.length : lineEnd;
      const block = v.slice(lineStart, blockEnd);
      const next = e.shiftKey ? block.replace(/^ {1,2}/gm, "") : block.replace(/^/gm, INDENT);
      if (next === block) return;
      insert(next, lineStart, blockEnd);
      if (s === en) {
        const removed = block.length - next.length;
        const caret = Math.max(lineStart, s - removed);
        ta.setSelectionRange(caret, caret);
      } else {
        ta.setSelectionRange(lineStart, lineStart + next.length);
      }
      return;
    }

    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      const before = v.slice(lineStart, s);
      const indent = before.match(/^[ \t]*/)?.[0] ?? "";
      const opens = /\{\s*$/.test(before);
      insert("\n" + indent + (opens ? INDENT : ""), s, en);
      return;
    }

    // Typing "}" on a whitespace-only line steps the indent back.
    if (e.key === "}" && s === en) {
      const before = v.slice(lineStart, s);
      if (before.length >= 2 && /^ +$/.test(before)) {
        e.preventDefault();
        insert("}", s - 2, s);
      }
    }
  };

  return (
    <div className="sh-editor">
      <div className="sh-gutter" aria-hidden>
        <div ref={gutterRef}>
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i} data-error={errorSet.has(i + 1) || undefined}>
              {i + 1}
            </span>
          ))}
        </div>
      </div>
      <div className="sh-code">
        <div className="sh-marks" ref={marksRef} aria-hidden>
          {[...errorSet].map((l) => (
            <div key={l} style={{ "--ln": l - 1 } as React.CSSProperties} />
          ))}
        </div>
        <textarea
          ref={taRef}
          className="sh-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="off"
          aria-label="Fragment shader source"
          aria-describedby="sh-editor-help"
        />
      </div>
    </div>
  );
}
