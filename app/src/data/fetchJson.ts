/**
 * Fetches and parses a JSON document served from /public, bypassing the HTTP
 * cache. The ingestion layer (scripts/) writes these files; the frontend only
 * ever reads them.
 *
 * @param path Absolute public path, e.g. "/events.json".
 * @returns The parsed payload, typed by the caller.
 * @throws If the file cannot be fetched or parsed.
 */
export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}
