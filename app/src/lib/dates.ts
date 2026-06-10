import type { EventStatus } from "../types";

const BERLIN = "Europe/Berlin";

const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BERLIN,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

/** Returns the Waldmohr-local calendar day for a Date as YYYY-MM-DD. */
export function dateKey(date: Date): string {
  return keyFormatter.format(date);
}

/**
 * Classifies an event date against today. Both inputs are YYYY-MM-DD keys, so a
 * plain string comparison is correct and timezone-safe.
 */
export function computeStatus(eventKey: string, todayKey: string): EventStatus {
  if (eventKey < todayKey) return "past";
  if (eventKey > todayKey) return "upcoming";
  return "current";
}

/** Parses a YYYY-MM-DD key into numeric year/month(0-based)/day parts. */
export function splitKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month: month - 1, day };
}

/** Shifts a YYYY-MM-DD key by whole months, returning the first of the resulting month. */
export function shiftMonthKey(key: string, delta: number): string {
  const { year, month } = splitKey(key);
  const shifted = new Date(year, month + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-01`;
}

const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric"
});

/** Formats a YYYY-MM-DD key as a long human date, e.g. "Monday, June 8, 2026". */
export function formatLongDate(key: string): string {
  const { year, month, day } = splitKey(key);
  return longDate.format(new Date(year, month, day, 12));
}

const monthTitle = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

/** Formats a year/0-based-month pair as "June 2026". */
export function formatMonthTitle(year: number, month: number): string {
  return monthTitle.format(new Date(year, month, 1));
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Formats a YYYY-MM-DD key as a short date, e.g. "Jun 8, 2026". */
export function formatShortDate(key: string): string {
  const { year, month, day } = splitKey(key);
  return shortDate.format(new Date(year, month, day, 12));
}

/** Human "Today / Yesterday / N days ago" label between two YYYY-MM-DD keys. */
export function relativeDayLabel(fromKey: string, toKey: string): string {
  const { year: fy, month: fm, day: fd } = splitKey(fromKey);
  const { year: ty, month: tm, day: td } = splitKey(toKey);
  const days = Math.round((Date.UTC(ty, tm, td) - Date.UTC(fy, fm, fd)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}
