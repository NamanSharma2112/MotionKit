import type { CSSProperties } from "react";

/* Loading placeholders shaped like the real layouts, so nothing jumps when the
   content arrives. They pulse gently (static under reduced motion). */

export function Skeleton({
  w,
  h,
  r,
  style,
  className = "",
}: {
  w?: number | string;
  h?: number | string;
  r?: number | string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      className={`mk-skeleton ${className}`}
      style={{ width: w, height: h, borderRadius: r, ...style }}
      aria-hidden
    />
  );
}

function Announce({ label }: { label: string }) {
  return (
    <span className="mk-sr-only" role="status">
      {label}
    </span>
  );
}

/* Title, lead and an optional tab row, centred like PageHeader. */
function HeaderSkeleton({ tabs = true }: { tabs?: boolean }) {
  return (
    <div className="mk-page-head">
      <Skeleton w="min(420px, 70%)" h={48} r={12} />
      <Skeleton w="min(520px, 85%)" h={16} r={8} style={{ marginTop: 22 }} />
      <Skeleton w="min(380px, 65%)" h={16} r={8} style={{ marginTop: 10 }} />
      {tabs && <Skeleton w={260} h={44} r={999} style={{ marginTop: 28 }} />}
    </div>
  );
}

/* Tool pages: header, then canvas + side panel. */
export function ToolPageSkeleton({ label = "Loading playground", tabs = true }: { label?: string; tabs?: boolean }) {
  return (
    <div className="mk-page" aria-busy="true">
      <Announce label={label} />
      <HeaderSkeleton tabs={tabs} />
      <div className="mk-workspace">
        <div className="mk-stack-col">
          <Skeleton h={46} r={14} />
          <Skeleton h="min(60vh, 560px)" r={16} />
        </div>
        <div className="mk-stack-col">
          <div className="mk-skeleton-panel">
            <Skeleton w={90} h={14} r={6} />
            <div className="mk-skeleton-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} h={86} r={12} />
              ))}
            </div>
          </div>
          <div className="mk-skeleton-panel">
            <Skeleton w={70} h={14} r={6} />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} h={10} r={6} style={{ marginTop: 18 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Templates: header, then large preview cards. */
export function TemplatesSkeleton() {
  return (
    <div className="mk-page" aria-busy="true">
      <Announce label="Loading templates" />
      <HeaderSkeleton tabs={false} />
      <div className="mk-stack-col">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="mk-skeleton-panel">
            <Skeleton h={420} r={12} />
            <Skeleton w={180} h={16} r={6} style={{ marginTop: 16 }} />
            <Skeleton w={320} h={12} r={6} style={{ marginTop: 10 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Homepage: hero lines and a row of collage tiles. */
export function HomeSkeleton() {
  return (
    <div aria-busy="true">
      <Announce label="Loading MotionKit" />
      <div className="mk-hero">
        <Skeleton w="min(640px, 90%)" h={64} r={14} />
        <Skeleton w="min(520px, 75%)" h={64} r={14} style={{ marginTop: 12 }} />
        <Skeleton w="min(540px, 88%)" h={16} r={8} style={{ marginTop: 26 }} />
        <Skeleton w="min(420px, 70%)" h={16} r={8} style={{ marginTop: 10 }} />
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          <Skeleton w={180} h={40} r={10} />
          <Skeleton w={150} h={40} r={10} />
        </div>
      </div>
      <div className="mk-skeleton-tiles">
        {[220, 260, 200, 250, 230].map((h, i) => (
          <Skeleton key={i} h={h} r={16} style={{ marginTop: i % 2 ? 28 : 0 }} />
        ))}
      </div>
    </div>
  );
}

/* Placeholder inside a component card's preview until the live demo mounts. */
export function PreviewSkeleton() {
  return (
    <div className="mk-preview-skeleton" aria-hidden>
      <Skeleton w="42%" h={36} r={999} />
      <Skeleton w="28%" h={10} r={6} />
    </div>
  );
}
