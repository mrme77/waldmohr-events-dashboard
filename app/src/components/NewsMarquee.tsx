interface NewsMarqueeProps {
  /** Headlines to scroll. Defaults to a placeholder until the RSS feed lands. */
  items?: readonly string[];
}

const PLACEHOLDER: readonly string[] = [
  "News feed connects in a later phase",
  "USA and St. Louis headlines will scroll here"
];

/**
 * A continuous headline marquee pinned across the top of the dashboard. The
 * track holds two identical copies so the loop is seamless.
 */
export function NewsMarquee({ items = PLACEHOLDER }: NewsMarqueeProps) {
  const text = items.join(" • ");
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
