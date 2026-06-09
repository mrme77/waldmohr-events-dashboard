import { useNow } from "../hooks/useNow";

interface ZoneClock {
  label: string;
  timeZone: string;
}

const ZONES: readonly ZoneClock[] = [
  { label: "NAP", timeZone: "Europe/Rome" },
  { label: "STL", timeZone: "America/Chicago" }
];

function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

/** Dual time display: Waldmohr-local (Berlin) and St. Louis / Central. */
export function DualClock() {
  const now = useNow(1000);
  return (
    <div className="clocks">
      {ZONES.map((zone) => (
        <div key={zone.timeZone} className="clock">
          <span className="clock__label">{zone.label}</span>
          <span className="clock__time">{formatTime(now, zone.timeZone)}</span>
        </div>
      ))}
    </div>
  );
}
