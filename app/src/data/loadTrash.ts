import type { EventsPayload } from "../types";

/**
 * Loads the Waldmohr trash collection payload served from /public. The
 * ingestion layer (scripts/refresh-trash.mjs) writes this file; the frontend
 * only ever reads it.
 *
 * @throws If the file cannot be fetched or parsed.
 */
export async function loadTrash(): Promise<EventsPayload> {
  const response = await fetch("/trash.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load trash.json: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as EventsPayload;
}
