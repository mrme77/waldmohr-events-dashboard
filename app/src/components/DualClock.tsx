import { useNow } from "../hooks/useNow";
import { formatShortDate, relativeDayLabel } from "../lib/dates";

interface ZoneClock {
  label: string;
  timeZone: string;
}

interface DualClockProps {
  /** Last event refresh timestamp, if event data has loaded. */
  updatedAt?: string | null;
}

const ZONES: readonly ZoneClock[] = [
  { label: "Napoli", timeZone: "Europe/Rome" },
  { label: "St. Louis", timeZone: "America/Chicago" }
];

function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

/** Dual time display plus compact event refresh metadata. */
export function DualClock({ updatedAt = null }: DualClockProps) {
  const now = useNow(1000);
  const updatedKey = updatedAt ? updatedAt.slice(0, 10) : null;
  const todayKey = now.toISOString().slice(0, 10);

  return (
    <div className="clocks">
      {ZONES.map((zone) => (
        <div key={zone.timeZone} className="clock">
          <span className="clock__label">{zone.label}</span>
          <span className="clock__time">{formatTime(now, zone.timeZone)}</span>
        </div>
      ))}
      <div className="clock-refresh">
        <span className="clock-refresh__label">Updated</span>
        <span className="clock-refresh__value">
          {updatedKey ? `${formatShortDate(updatedKey)} · ${relativeDayLabel(updatedKey, todayKey)}` : "Loading"}
        </span>
      </div>
    </div>
  );
}
