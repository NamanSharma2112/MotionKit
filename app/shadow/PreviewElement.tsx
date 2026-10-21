import type { CSSProperties } from "react";
import { inkOn, type Paint, type PreviewKind } from "./shadow-lib";

/* The thing the shadow is drawn on. `style` carries box-shadow, border and radius. */
export default function PreviewElement({
  kind,
  surface,
  style,
}: {
  kind: PreviewKind;
  surface: Paint;
  style: CSSProperties;
}) {
  const bg = surface === "auto" ? "var(--sh-el, var(--mk-surface))" : surface;
  const ink = inkOn(surface);
  const line = surface === "auto" ? "color-mix(in srgb, var(--mk-text) 9%, transparent)" : `color-mix(in srgb, ${ink} 14%, transparent)`;
  const base: CSSProperties = { ...style, background: bg, color: ink };

  switch (kind) {
    case "button":
      return (
        <div className="inline-flex h-12 select-none items-center px-7 text-[15px] font-medium" style={base}>
          Get started
        </div>
      );
    case "input":
      return (
        <div className="flex h-12 w-[260px] items-center gap-2 px-4 text-[14px]" style={base}>
          <span style={{ opacity: 0.45 }}>you@example.com</span>
          <span className="ml-auto h-5 w-px" style={{ background: ink, opacity: 0.6 }} />
        </div>
      );
    case "badge":
      return (
        <div className="inline-flex h-8 select-none items-center gap-1.5 px-3.5 text-[13px] font-semibold" style={base}>
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
          Live
        </div>
      );
    case "profile":
      return (
        <div className="w-[230px] overflow-hidden" style={base}>
          <div
            className="h-[92px]"
            style={{ background: "linear-gradient(135deg, #8ec5fc 0%, #b9a7f5 55%, #f7b2c4 100%)" }}
          />
          <div className="relative px-4 pb-4">
            <div
              className="-mt-7 mb-3 h-14 w-14 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 70%)",
                boxShadow: `0 0 0 3px ${bg}`,
              }}
            />
            <div className="text-[14px] font-semibold">Ada Moreno</div>
            <div className="text-[12.5px]" style={{ opacity: 0.6 }}>
              Product designer
            </div>
            <div className="mt-3 flex gap-1.5">
              <span className="h-2 w-12 rounded-full" style={{ background: line }} />
              <span className="h-2 w-8 rounded-full" style={{ background: line }} />
            </div>
          </div>
        </div>
      );
    case "card":
    default:
      return (
        <div className="w-[260px] p-5" style={base}>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-[10px]" style={{ background: line }} />
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="h-2 w-3/4 rounded-full" style={{ background: line }} />
              <span className="h-2 w-1/2 rounded-full" style={{ background: line, opacity: 0.7 }} />
            </div>
          </div>
          <span className="mb-2 block h-2 w-full rounded-full" style={{ background: line, opacity: 0.7 }} />
          <span className="mb-2 block h-2 w-5/6 rounded-full" style={{ background: line, opacity: 0.7 }} />
          <span className="block h-2 w-2/3 rounded-full" style={{ background: line, opacity: 0.7 }} />
        </div>
      );
  }
}
