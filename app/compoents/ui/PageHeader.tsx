import type { CSSProperties, ReactNode } from "react";

/* Shared top-of-page block for every tool page: eyebrow pill, title, lead and
   an optional row (usually SegmentedTabs). Entrance staggers like the homepage. */
export default function PageHeader({
  icon,
  eyebrow = "Playground",
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
  return (
    <header className="mk-page-head">
      <span className="mk-eyebrow mk-rise" style={d(0)}>
        {icon}
        {eyebrow}
      </span>
      <h1 className="mk-page-title mk-rise" style={d(50)}>
        {title}
      </h1>
      {description && (
        <p className="mk-lead mk-rise" style={d(100)}>
          {description}
        </p>
      )}
      {children && (
        <div className="mk-page-head-row mk-rise" style={d(150)}>
          {children}
        </div>
      )}
    </header>
  );
}
