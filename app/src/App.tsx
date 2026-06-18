import { useEffect, useMemo, useState } from "react";
import { NewsMarquee } from "./components/NewsMarquee";
import { DualClock } from "./components/DualClock";
import { Calendar } from "./components/Calendar";
import { Spotlight } from "./components/Spotlight";
import { EventDetail } from "./components/EventDetail";
import { WeatherWidget } from "./components/WeatherWidget";
import { EVENT_LAYERS, loadLayer } from "./data/layers";
import { loadNews, type NewsPayload } from "./data/loadNews";
import { computeStatus, dateKey, shiftMonthKey } from "./lib/dates";
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
  const [layers, setLayers] = useState<Record<string, EventsPayload>>({});
  const [newsPayload, setNewsPayload] = useState<NewsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Month the user navigated to via prev/next; null means follow the auto anchor.
  const [viewKey, setViewKey] = useState<string | null>(null);

  useEffect(() => {
    for (const layer of EVENT_LAYERS) {
      loadLayer(layer.path)
        .then((payload) => setLayers((prev) => ({ ...prev, [layer.key]: payload })))
        .catch((err: unknown) => {
          // Only the required base feed surfaces an error; optional layers
          // silently degrade (cache may be absent or not refreshed yet).
          if (layer.required) setError(err instanceof Error ? err.message : String(err));
        });
    }
  }, []);

  useEffect(() => {
    loadNews()
      .then(setNewsPayload)
      .catch((err: unknown) => setNewsError(err instanceof Error ? err.message : String(err)));
  }, []);

  const todayKey = dateKey(now);
  const updatedAt = layers.events?.generatedAt ?? null;

  // Recompute status client-side against the real "today" so the v1 hardcoded
  // date can never go stale.
  const events = useMemo<DashboardEvent[]>(() => {
    const all = EVENT_LAYERS.flatMap((layer) => layers[layer.key]?.events ?? []);
    return all.map((event) => ({
      ...event,
      status: computeStatus(event.date, todayKey),
    }));
  }, [layers, todayKey]);

  const anchorKey = useMemo(() => chooseAnchorKey(events, todayKey), [events, todayKey]);
  const visibleKey = viewKey ?? anchorKey;

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
              anchorKey={visibleKey}
              todayKey={todayKey}
              selectedKey={selectedKey}
              onSelectDay={setSelectedKey}
              onPrevMonth={() => setViewKey(shiftMonthKey(visibleKey, -1))}
              onNextMonth={() => setViewKey(shiftMonthKey(visibleKey, 1))}
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
