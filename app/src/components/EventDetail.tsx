import { categorize, type DashboardEvent } from "../types";
import { formatLongDate } from "../lib/dates";

interface EventDetailProps {
  /** Day key being shown, or null when closed. */
  dayKey: string | null;
  /** Events on that day. */
  events: DashboardEvent[];
  onClose: () => void;
}

/** Modal popover listing the events for a tapped day, with source links. */
export function EventDetail({ dayKey, events, onClose }: EventDetailProps) {
  if (dayKey === null) return null;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Event details" onClick={onClose}>
      <div className="popover" onClick={(e) => e.stopPropagation()}>
        <header className="popover__head">
          <h2>{formatLongDate(dayKey)}</h2>
          <button type="button" className="popover__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        {events.length === 0 ? (
          <p className="popover__empty">No events on this day.</p>
        ) : (
          <ul className="popover__list">
            {events.map((event) => (
              <li key={event.id} className={`popover__item cat-${categorize(event)}`}>
                <p className="popover__status">
                  {event.status} · {event.dateConfidence} date
                  {event.time ? ` · ${event.time}` : ""}
                </p>
                <h3>{event.title}</h3>
                <p>{event.summary}</p>
                {categorize(event) === "trash" ? (
                  <dl>
                    <div>
                      <dt>Reminder</dt>
                      <dd>{event.familyRelevance}</dd>
                    </div>
                    <div>
                      <dt>Area</dt>
                      <dd>{event.venue}</dd>
                    </div>
                  </dl>
                ) : (
                  <>
                    <dl>
                      <div>
                        <dt>Venue</dt>
                        <dd>{event.venue || "Not confirmed"}</dd>
                      </div>
                      <div>
                        <dt>Original</dt>
                        <dd>{event.originalTitle}</dd>
                      </div>
                      <div>
                        <dt>Posted</dt>
                        <dd>{event.postDate}</dd>
                      </div>
                      <div>
                        <dt>Checked</dt>
                        <dd>{event.lastChecked}</dd>
                      </div>
                    </dl>
                    <a href={event.sourceUrl} target="_blank" rel="noreferrer">
                      Open source post →
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
