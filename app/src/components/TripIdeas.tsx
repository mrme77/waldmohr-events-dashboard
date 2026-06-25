import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../data/fetchJson";

interface TripIdea {
  id: string;
  title: string;
  summary: string;
  location: string;
  pageNumber: number;
  category: string;
  audience: string;
  dateHint: string | null;
  confidence: string;
  sourceUrl: string;
  lastChecked: string;
}

interface TripIdeasPayload {
  generatedAt: string;
  source: string;
  issueTitle: string;
  model: string;
  refreshWarning?: string;
  items: TripIdea[];
}

const PAGE_SIZE = 3;
const ROTATE_MS = 10000;

/** Optional KMC magazine trip ideas summarized by the ingestion layer. */
export function TripIdeas() {
  const [payload, setPayload] = useState<TripIdeasPayload | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchJson<TripIdeasPayload>("/kmc-trip-ideas.json")
      .then((nextPayload) => {
        if (!cancelled) setPayload(nextPayload);
      })
      .catch(() => {
        if (!cancelled) setPayload(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const allItems = useMemo(() => payload?.items ?? [], [payload]);
  const pageCount = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const items = allItems.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPageIndex(0);
  }, [allItems]);

  useEffect(() => {
    if (pageCount < 2) return;
    const id = window.setInterval(() => {
      setPageIndex((current) => (current + 1) % pageCount);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [pageCount]);

  if (items.length === 0) return null;

  const goPrev = () => setPageIndex((current) => (current - 1 + pageCount) % pageCount);
  const goNext = () => setPageIndex((current) => (current + 1) % pageCount);

  return (
    <section className="trip-ideas" aria-label="KMC trip ideas">
      <div className="trip-ideas__head">
        <p className="eyebrow">Trip Ideas</p>
        <div className="trip-ideas__controls" aria-label="Trip idea pages">
          <button type="button" onClick={goPrev} aria-label="Previous trip ideas">‹</button>
          <span>{pageIndex + 1}/{pageCount}</span>
          <button type="button" onClick={goNext} aria-label="Next trip ideas">›</button>
        </div>
      </div>

      <ul className="trip-ideas__list">
        {items.map((item) => (
          <li key={item.id}>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              <span className="trip-ideas__meta">
                {item.category}
              </span>
              <strong>{item.title}</strong>
              <span>{item.summary}</span>
              <em>{item.dateHint ?? item.location}</em>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
