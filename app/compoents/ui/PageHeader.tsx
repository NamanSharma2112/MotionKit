import type { CSSProperties, ReactNode } from "react";

/* Shared top-of-page block for every tool page: title, lead and an optional
   row (usually SegmentedTabs). The heading carries the page on its own; no
   label sits above it. Entrance staggers like the homepage. */
export default function PageHeader({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
  return (
    <header className="mk-page-head">
      <h1 className="mk-page-title mk-rise" style={d(0)}>
        {title}
      </h1>
      {description && (
        <p className="mk-lead mk-rise" style={d(60)}>
          {description}
        </p>
      )}
      {children && (
        <div className="mk-page-head-row mk-rise" style={d(120)}>
          {children}
        </div>
      )}
    </header>
  );
}
