export type EventStatus = "upcoming" | "current" | "past";
export type DateConfidence = "confirmed" | "inferred" | "unknown";

/** Display category that drives the calendar dot color. */
export type EventCategory = "fun" | "family" | "leave" | "trash" | "civic";

/** A normalized event record as written by the ingestion layer. */
export interface DashboardEvent {
  id: string;
  title: string;
  originalTitle: string;
  summary: string;
  /** ISO calendar date, YYYY-MM-DD. */
  date: string;
  time: string | null;
  venue: string;
  tags: string[];
  familyRelevance: string;
  sourceUrl: string;
  postDate: string;
  lastChecked: string;
  status: EventStatus;
  dateConfidence: DateConfidence;
}

/** The full payload shape written to data/events.json. */
export interface EventsPayload {
  generatedAt: string;
  source: string;
  events: DashboardEvent[];
}

/**
 * Maps an event to its display category. MVP only distinguishes civic from
 * general public ("fun") events; family/leave/trash arrive in a later phase.
 */
export function categorize(event: DashboardEvent): EventCategory {
  if (event.tags.includes("civic")) return "civic";
  return "fun";
}
