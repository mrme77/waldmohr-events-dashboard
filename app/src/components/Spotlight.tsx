import { useEffect, useState } from "react";
import { categorize, type DashboardEvent } from "../types";
import { formatLongDate } from "../lib/dates";

interface SpotlightProps {
  /** Upcoming/current events, sorted ascending by date. */
  upcoming: DashboardEvent[];
  onSelect: (event: DashboardEvent) => void;
}

const ROTATE_MS = 8000;

/** Auto-rotating "Next Up" card plus a short list of what follows. */
export function Spotlight({ upcoming, onSelect }: SpotlightProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [upcoming]);

  useEffect(() => {
    if (upcoming.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % upcoming.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [upcoming]);

  if (upcoming.length === 0) {
    return (
      <aside className="spotlight" aria-label="Next up">
        <p className="eyebrow">Next Up</p>
        <p className="spotlight__empty">No upcoming events. Refresh the source for new ones.</p>
      </aside>
    );
  }

  const featured = upcoming[index];
  const rest = upcoming.slice(0, 4).filter((event) => event.id !== featured.id);

  return (
    <aside className="spotlight" aria-label="Next up">
      <p className="eyebrow">Next Up</p>
      <button type="button" className={`spotlight__card cat-${categorize(featured)}`} onClick={() => onSelect(featured)}>
        <span className="spotlight__date">{formatLongDate(featured.date)}</span>
        <strong className="spotlight__title">{featured.title}</strong>
        <span className="spotlight__summary">{featured.summary}</span>
      </button>

      {rest.length > 0 && (
        <ul className="spotlight__list">
          {rest.map((event) => (
            <li key={event.id}>
              <button type="button" onClick={() => onSelect(event)}>
                <i className={`dot cat-${categorize(event)}`} />
                <span>{event.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
