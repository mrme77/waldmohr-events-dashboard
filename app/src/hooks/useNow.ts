import { useEffect, useState } from "react";

/**
 * Returns the current time, re-rendering at aligned interval boundaries.
 * Minute-only clocks and date-bucket logic should use a 60s interval.
 *
 * @param intervalMs How often to tick, in milliseconds.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    let id: number;
    // Align to the wall clock so minute displays do not lag behind their boundary.
    function scheduleTick(): void {
      id = window.setTimeout(() => {
        setNow(new Date());
        scheduleTick();
      }, intervalMs - (Date.now() % intervalMs));
    }
    scheduleTick();
    return () => window.clearTimeout(id);
  }, [intervalMs]);

  return now;
}
