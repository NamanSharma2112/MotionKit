/* MotionKit mark: three stacked layers drawn as separate paths so they can
   move independently. The motion is pure CSS (see .mk-brand in ui.css):
   the layers settle in once on load and fan apart while the brand is hovered. */
export default function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="mk-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <defs>
        <linearGradient id="mk-mark-accent" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b8cff" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path className="mk-mark-layer mk-mark-bottom" d="M2 17l10 5 10-5" stroke="currentColor" />
      <path className="mk-mark-layer mk-mark-middle" d="M2 12l10 5 10-5" stroke="currentColor" />
      <path
        className="mk-mark-layer mk-mark-top"
        d="M12 2L2 7l10 5 10-5-10-5z"
        stroke="url(#mk-mark-accent)"
        fill="url(#mk-mark-accent)"
        fillOpacity="0.16"
      />
    </svg>
  );
}
