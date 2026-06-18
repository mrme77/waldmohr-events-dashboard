import { fetchJson } from "./fetchJson";

export interface NewsItem {
  id: string;
  sourceId: string;
  sourceLabel: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: string;
  lastChecked: string;
}

export interface NewsPayload {
  generatedAt: string;
  sources: Array<{
    id: string;
    label: string;
    name: string;
    url: string;
  }>;
  items: NewsItem[];
}

/**
 * Loads cached RSS headlines served from /public.
 *
 * @throws If the file cannot be fetched or parsed.
 */
export function loadNews(): Promise<NewsPayload> {
  return fetchJson<NewsPayload>("/news.json");
}
