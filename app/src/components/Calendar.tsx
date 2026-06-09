import { categorize, type DashboardEvent } from "../types";
import { formatMonthTitle, splitKey } from "../lib/dates";

interface CalendarProps {
  /** Events already filtered to the visible set. */
  events: DashboardEvent[];
  /** Month to render, as a YYYY-MM-DD anchor key. */
  anchorKey: string;
  /** Today's Waldmohr-local key, for highlighting. */
  todayKey: string;
  /** Currently selected day key, if any. */
  selectedKey: string | null;
  onSelectDay: (key: string) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function groupByDay(events: DashboardEvent[]): Map<string, DashboardEvent[]> {
  const map = new Map<string, DashboardEvent[]>();
  for (const event of events) {
    const bucket = map.get(event.date) ?? [];
    bucket.push(event);
    map.set(event.date, bucket);
  }
  return map;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Month calendar with category-colored dots per day. Tap a day to select it. */
export function Calendar({ events, anchorKey, todayKey, selectedKey, onSelectDay }: CalendarProps) {
  const { year, month } = splitKey(anchorKey);
  const byDay = groupByDay(events);

  const firstWeekday = new Date(year, month, 1).getDay();
  const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <section className="calendar" aria-label={`Calendar for ${formatMonthTitle(year, month)}`}>
      <h2 className="calendar__title">{formatMonthTitle(year, month)}</h2>
      <div className="calendar__grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="calendar__weekday">{day}</div>
        ))}

        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`blank-${i}`} className="calendar__cell calendar__cell--blank" aria-hidden="true" />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const dayEvents = byDay.get(key) ?? [];
          const classes = [
            "calendar__cell",
            key === todayKey ? "is-today" : "",
            key === selectedKey ? "is-selected" : "",
            dayEvents.length > 0 ? "has-events" : ""
          ].join(" ");

          return (
            <button
              key={key}
              type="button"
              className={classes}
              aria-label={`${day}, ${dayEvents.length} events`}
              onClick={() => onSelectDay(key)}
            >
              <span className="calendar__day">{day}</span>
              <span className="calendar__dots">
                {dayEvents.map((event) => (
                  <i key={event.id} className={`dot cat-${categorize(event)}`} title={event.title} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
