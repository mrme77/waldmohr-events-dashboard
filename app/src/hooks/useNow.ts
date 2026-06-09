import { useEffect, useState } from "react";

/**
 * Returns the current time, re-rendering on a fixed interval. Use a 1s interval
 * for clocks and a coarse interval (e.g. 60s) for date-bucket logic.
 *
 * @param intervalMs How often to tick, in milliseconds.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
