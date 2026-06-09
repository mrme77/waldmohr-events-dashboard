export type EventStatus = "upcoming" | "current" | "past";
export type DateConfidence = "confirmed" | "inferred" | "unknown";

/** Display category that drives the calendar dot color. */
export type EventCategory =
  | "fun"
  | "family"
  | "leave"
  | "holiday"
  | "trash"
  | "trash-bio"
  | "trash-rest"
  | "trash-lvp"
  | "trash-papier"
  | "trash-glas"
  | "trash-umweltmobil"
  | "civic";

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

/** Maps an event to its display category for calendar dot color and popover styling. */
export function categorize(event: DashboardEvent): EventCategory {
  if (event.tags.includes("holiday"))     return "holiday";
  if (event.tags.includes("bioabfall"))   return "trash-bio";
  if (event.tags.includes("restmuell"))   return "trash-rest";
  if (event.tags.includes("lvp"))         return "trash-lvp";
  if (event.tags.includes("papier"))      return "trash-papier";
  if (event.tags.includes("glas"))        return "trash-glas";
  if (event.tags.includes("umweltmobil")) return "trash-umweltmobil";
  if (event.tags.includes("trash"))       return "trash";
  if (event.tags.includes("civic"))       return "civic";
  return "fun";
}
