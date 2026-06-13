import type { EventsPayload } from "../types";

/**
 * Loads KMC-area event listings extracted from the Kaiserslautern American
 * digital edition. The ingestion layer writes this file; the frontend only
 * reads it as an optional calendar layer.
 *
 * @throws If the file cannot be fetched or parsed.
 */
export async function loadKmc(): Promise<EventsPayload> {
  const response = await fetch("/kmc-events.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load kmc-events.json: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as EventsPayload;
}
