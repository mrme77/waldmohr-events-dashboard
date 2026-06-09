import type { EventsPayload } from "../types";

/**
 * Loads the Waldmohr event payload served from /public. The ingestion layer
 * (scripts/) writes this file; the frontend only ever reads it.
 *
 * @throws If the file cannot be fetched or parsed.
 */
export async function loadEvents(): Promise<EventsPayload> {
  const response = await fetch("/events.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load events.json: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as EventsPayload;
}
