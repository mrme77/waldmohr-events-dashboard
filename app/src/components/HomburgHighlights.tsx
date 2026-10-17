import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../data/fetchJson";
import type { EventsPayload } from "../types";

const MAX_EVENTS = 3;

/** Formats a normalized date for the English-first nearby-events rail. */
function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

/** Shows the next official city events from nearby Homburg. */
export function HomburgHighlights(): JSX.Element | null {
  const [payload, setPayload] = useState<EventsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<EventsPayload>("/homburg-events.json")
      .then((nextPayload) => { if (!cancelled) setPayload(nextPayload); })
      .catch(() => { if (!cancelled) setPayload(null); });
    return () => { cancelled = true; };
  }, []);

  const events = useMemo(() => (payload?.events ?? [])
    .filter((event) => event.status !== "past")
    .sort((left, right) => left.date.localeCompare(right.date) || (left.time ?? "").localeCompare(right.time ?? ""))
    .slice(0, MAX_EVENTS), [payload]);

  if (events.length === 0) return null;

  return (
    <section className="homburg-highlights" aria-labelledby="homburg-highlights-title">
      <header className="homburg-highlights__head">
        <div>
          <h2 id="homburg-highlights-title">Nearby in Homburg</h2>
          <p>Official city calendar</p>
        </div>
      </header>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <a href={event.sourceUrl} target="_blank" rel="noreferrer">
              <time dateTime={event.date}>{formatDate(event.date)}</time>
              <strong>{event.title}</strong>
              <span>{event.summary}</span>
              <em>{event.time ? `${event.time}, ${event.venue}` : event.venue}</em>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
