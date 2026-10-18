import type { DashboardEvent } from "../types";

const MAX_EVENTS = 3;

interface HomburgHighlightsProps {
  events: DashboardEvent[];
  onSelect: (event: DashboardEvent) => void;
}

/** Formats a normalized date for the English-first nearby-events rail. */
function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

/** Shows the next official city events from nearby Homburg. */
export function HomburgHighlights({ events, onSelect }: HomburgHighlightsProps): JSX.Element | null {
  const highlights = events
    .filter((event) => event.id.startsWith("homburg-"))
    .filter((event) => event.status !== "past")
    .sort((left, right) => left.date.localeCompare(right.date) || (left.time ?? "").localeCompare(right.time ?? ""))
    .slice(0, MAX_EVENTS);

  if (highlights.length === 0) return null;

  return (
    <section className="homburg-highlights" aria-labelledby="homburg-highlights-title">
      <header className="homburg-highlights__head">
        <div>
          <h2 id="homburg-highlights-title">Nearby in Homburg</h2>
          <p>Official city calendar</p>
        </div>
      </header>
      <ul>
        {highlights.map((event) => (
          <li key={event.id}>
            <button type="button" onClick={() => onSelect(event)}>
              <time dateTime={event.date}>{formatDate(event.date)}</time>
              <strong>{event.title}</strong>
              <span>{event.summary}</span>
              <em>{event.time ? `${event.time}, ${event.venue}` : event.venue}</em>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
