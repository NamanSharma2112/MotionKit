import { playgrounds } from "../site";
import PlaygroundCard from "../home/PlaygroundCard";

/* "Keep exploring" rail at the bottom of each tool page: the next three tools
   in order, wrapping around, so every page leads somewhere new. */
export default function MorePlaygrounds({ current }: { current: string }) {
  const i = playgrounds.findIndex((p) => p.href === current);
  const next = [1, 2, 3].map((n) => playgrounds[(i + n + playgrounds.length) % playgrounds.length]);
  return (
    <section className="mk-more">
      <div className="mk-more-head">
        <h2 className="mk-more-title">Keep exploring</h2>
        <p className="mk-card-desc">More playgrounds to try next.</p>
      </div>
      <div className="mk-more-grid">
        {next.map((p) => (
          <PlaygroundCard key={p.href} playground={p} />
        ))}
      </div>
    </section>
  );
}
