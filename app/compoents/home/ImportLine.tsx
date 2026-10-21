"use client";

import { useEffect, useState } from "react";

const NAMES = ["GooeySearch", "MagneticButton", "LetterSwap", "StackedCards", "TextScramble"];
const kebab = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

/* Types, holds, deletes, then moves to the next component name. */
export default function ImportLine() {
  const [n, setN] = useState(0);
  const [len, setLen] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const name = NAMES[n];

  useEffect(() => {
    let delay = deleting ? 28 : 55;
    if (!deleting && len === name.length) delay = 1800;
    if (deleting && len === 0) delay = 250;

    const id = setTimeout(() => {
      if (!deleting && len === name.length) setDeleting(true);
      else if (deleting && len === 0) {
        setDeleting(false);
        setN((v) => (v + 1) % NAMES.length);
      } else setLen((v) => v + (deleting ? -1 : 1));
    }, delay);
    return () => clearTimeout(id);
  }, [len, deleting, name]);

  const typed = name.slice(0, len);

  return (
    <p className="mk-import" aria-hidden>
      <span className="mk-tok-kw">import</span> <span className="mk-tok-name">{typed}</span>
      <span className="mk-caret mk-caret-sm" aria-hidden />{" "}
      <span className="mk-tok-kw">from</span>{" "}
      <span className="mk-tok-str">&quot;./motion/{kebab(typed)}&quot;</span>
    </p>
  );
}
