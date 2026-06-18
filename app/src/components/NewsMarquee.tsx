import type { NewsItem } from "../data/loadNews";

interface NewsMarqueeProps {
  /** Headlines to scroll. Defaults to a loading placeholder. */
  items?: readonly NewsItem[];
  error?: string | null;
}

const PLACEHOLDER = "Loading USA and St. Louis headlines";

/**
 * A continuous headline marquee pinned across the top of the dashboard. The
 * track holds two identical copies so the loop is seamless.
 */
export function NewsMarquee({ items = [], error = null }: NewsMarqueeProps) {
  const headlines = items.length > 0
    ? items.map((item) => `${item.sourceLabel}: ${item.title}`)
    : [error ? "News feed unavailable" : PLACEHOLDER];
  const text = headlines.join(" • ");
  return (
    <div className="marquee" aria-label="News headlines">
      <span className="marquee__tag">News</span>
      <div className="marquee__viewport">
        <div className="marquee__track">
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      </div>
    </div>
  );
}
