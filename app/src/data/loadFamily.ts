import type { EventsPayload } from "../types";

/**
 * Loads the family calendar payload served from /public. The ingestion layer
 * (scripts/refresh-family.mjs) writes this gitignored file only on machines
 * where GCAL_ICS_URL is configured; everywhere else the fetch 404s and the
 * caller silently degrades.
 *
 * @throws If the file cannot be fetched or parsed.
 */
export async function loadFamily(): Promise<EventsPayload> {
  const response = await fetch("/family.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load family.json: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as EventsPayload;
}
