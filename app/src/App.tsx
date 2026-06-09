import { useEffect, useMemo, useState } from "react";
import { NewsMarquee } from "./components/NewsMarquee";
import { DualClock } from "./components/DualClock";
import { Calendar } from "./components/Calendar";
import { Spotlight } from "./components/Spotlight";
import { EventDetail } from "./components/EventDetail";
import { WeatherWidget } from "./components/WeatherWidget";
import { loadEvents } from "./data/loadEvents";
import { loadTrash } from "./data/loadTrash";
import { loadHolidays } from "./data/loadHolidays";
import { loadNews, type NewsPayload } from "./data/loadNews";
import { computeStatus, dateKey } from "./lib/dates";
import { useNow } from "./hooks/useNow";
import type { DashboardEvent, EventsPayload } from "./types";

/** Picks which month the calendar opens on: the next upcoming event, else the most recent. */
function chooseAnchorKey(events: DashboardEvent[], todayKey: string): string {
  const upcoming = events
    .filter((event) => event.status !== "past")
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length > 0) return upcoming[0].date;

  const recent = [...events].sort((a, b) => b.date.localeCompare(a.date));
  return recent[0]?.date ?? todayKey;
}

export function App() {
  const now = useNow(60_000);
  const [payload, setPayload] = useState<EventsPayload | null>(null);
  const [trashPayload, setTrashPayload] = useState<EventsPayload | null>(null);
  const [holidayPayload, setHolidayPayload] = useState<EventsPayload | null>(null);
  const [newsPayload, setNewsPayload] = useState<NewsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    loadEvents()
      .then(setPayload)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    loadTrash()
      .then(setTrashPayload)
      .catch(() => { /* trash is optional — silently degrade */ });
  }, []);

  useEffect(() => {
    loadHolidays()
      .then(setHolidayPayload)
      .catch(() => { /* holidays are optional — silently degrade */ });
  }, []);

  useEffect(() => {
    loadNews()
      .then(setNewsPayload)
      .catch((err: unknown) => setNewsError(err instanceof Error ? err.message : String(err)));
  }, []);

  const todayKey = dateKey(now);
  const updatedAt = payload?.generatedAt ?? null;

  // Recompute status client-side against the real "today" so the v1 hardcoded
  // date can never go stale.
  const events = useMemo<DashboardEvent[]>(() => {
    const all = [
      ...(payload?.events ?? []),
      ...(trashPayload?.events ?? []),
      ...(holidayPayload?.events ?? []),
    ];
    return all.map((event) => ({
      ...event,
      status: computeStatus(event.date, todayKey),
    }));
  }, [payload, trashPayload, holidayPayload, todayKey]);

  const anchorKey = useMemo(() => chooseAnchorKey(events, todayKey), [events, todayKey]);

  const upcoming = useMemo(
    () => events.filter((e) => e.status !== "past").sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  const selectedDayEvents = useMemo(
    () => events.filter((e) => e.date === selectedKey),
    [events, selectedKey]
  );

  return (
    <div className="app">
      <NewsMarquee items={newsPayload?.items} error={newsError} />

      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__pulse" aria-hidden="true" />
          <h1>Waldmohr Events</h1>
        </div>
      </header>

      <main className="layout">
        {error ? (
          <p className="error-state">Could not load events: {error}</p>
        ) : (
          <>
            <Calendar
              events={events}
              anchorKey={anchorKey}
              todayKey={todayKey}
              selectedKey={selectedKey}
              onSelectDay={setSelectedKey}
            />
            <aside className="side-rail">
              <WeatherWidget />
              <DualClock updatedAt={updatedAt} />
              <Spotlight upcoming={upcoming} onSelect={(event) => setSelectedKey(event.date)} />
            </aside>
          </>
        )}
      </main>

      <EventDetail dayKey={selectedKey} events={selectedDayEvents} onClose={() => setSelectedKey(null)} />
    </div>
  );
}
