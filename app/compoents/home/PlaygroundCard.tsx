"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Playground } from "../site";

/* Small looping illustration per tool; it only plays while the card is hovered. */
export function PlaygroundArt({ kind }: { kind: string }) {
  switch (kind) {
    case "svg":
      return (
        <svg viewBox="0 0 120 60" className="mk-art-svg" aria-hidden>
          <path d="M8 46 C 30 4, 52 4, 60 30 S 92 58, 112 14" pathLength={1} />
          <circle cx="8" cy="46" r="3" />
          <circle cx="112" cy="14" r="3" />
        </svg>
      );
    case "shader":
      return <div className="mk-art-shader" aria-hidden />;
    case "ascii":
      return (
        <pre className="mk-art-ascii" aria-hidden>
          {"  .:-=+*#%@\n .:-=+*#%@%\n:-=+*#%@%#*\n-=+*#%@%#*+"}
        </pre>
      );
    case "iso":
      return (
        <div className="mk-art-iso" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      );
    case "shadow":
      return <div className="mk-art-shadow" aria-hidden />;
    case "bg":
      return <div className="mk-art-bg" aria-hidden />;
    case "css":
      return (
        <code className="mk-art-css" aria-hidden>
          <span>transform</span>: scale(<b>0.97</b>);
        </code>
      );
    default:
      return (
        <div className="mk-art-tpl" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      );
  }
}

export default function PlaygroundCard({ playground: p }: { playground: Playground }) {
  return (
    <Link href={p.href} className="mk-play">
      <div className="mk-play-art">
        <PlaygroundArt kind={p.art} />
      </div>
      <div className="mk-play-body">
        <span className="mk-play-icon">{p.icon}</span>
        <div>
          <h3 className="mk-card-title">{p.title}</h3>
          <p className="mk-card-desc">{p.desc}</p>
        </div>
        <ArrowRight size={15} className="mk-play-arrow" />
      </div>
    </Link>
  );
}
