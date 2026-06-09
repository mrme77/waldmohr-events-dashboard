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
export async function loadNews(): Promise<NewsPayload> {
  const response = await fetch("/news.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load news.json: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as NewsPayload;
}
