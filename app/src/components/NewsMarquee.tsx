import { useEffect, useState } from "react";
import type { NewsItem } from "../data/loadNews";

interface NewsMarqueeProps {
  /** Headlines to rotate without continuous animation. */
  items?: readonly NewsItem[];
  error?: string | null;
}

const PLACEHOLDER = "Loading USA and St. Louis headlines";
const ROTATION_MS = 30_000;
const EMPTY_ITEMS: readonly NewsItem[] = [];

/** Displays one wrapping headline at a time to avoid continuous kiosk rendering. */
export function NewsMarquee({ items = EMPTY_ITEMS, error = null }: NewsMarqueeProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (items.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, [items]);

  const item = items.length > 0 ? items[index % items.length] : undefined;
  const headline = item
    ? `${item.sourceLabel}: ${item.title}`
    : error ? "News feed unavailable" : PLACEHOLDER;

  return (
    <section className="marquee" aria-label="News headlines">
      <span className="marquee__tag">News</span>
      <div className="marquee__viewport">
        <p className="marquee__headline">{headline}</p>
      </div>
    </section>
  );
}
