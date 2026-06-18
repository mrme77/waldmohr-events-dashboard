import type { EventsPayload } from "../types";
import { fetchJson } from "./fetchJson";

/** One calendar data layer served from /public as an EventsPayload. */
export interface EventLayer {
  /** Stable key for React state and the merge order. */
  key: string;
  /** Public JSON path written by the ingestion layer. */
  path: string;
  /**
   * When true, a load failure surfaces as a dashboard error. Optional layers
   * silently degrade — their cache may be absent or not refreshed yet (family
   * only exists where GCAL_ICS_URL is set).
   */
  required: boolean;
}

/** Calendar layers in merge order; the first is the required Waldmohr feed. */
export const EVENT_LAYERS: EventLayer[] = [
  { key: "events", path: "/events.json", required: true },
  { key: "trash", path: "/trash.json", required: false },
  { key: "holidays", path: "/holidays.json", required: false },
  { key: "fleamarkets", path: "/fleamarkets.json", required: false },
  { key: "family", path: "/family.json", required: false },
  { key: "kmc", path: "/kmc-events.json", required: false },
];

/**
 * Loads one calendar layer's payload from /public.
 *
 * @param path Public JSON path, e.g. "/events.json".
 * @throws If the file cannot be fetched or parsed.
 */
export function loadLayer(path: string): Promise<EventsPayload> {
  return fetchJson<EventsPayload>(path);
}
