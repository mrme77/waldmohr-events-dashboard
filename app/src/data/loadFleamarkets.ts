import type { EventsPayload } from "../types";

/**
 * Loads the Homburg flea market payload served from /public. The ingestion
 * layer (scripts/refresh-fleamarkets.mjs) writes this file; the frontend only
 * ever reads it.
 *
 * @throws If the file cannot be fetched or parsed.
 */
export async function loadFleamarkets(): Promise<EventsPayload> {
  const response = await fetch("/fleamarkets.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load fleamarkets.json: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as EventsPayload;
}
