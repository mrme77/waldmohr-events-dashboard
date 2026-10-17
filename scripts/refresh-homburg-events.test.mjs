import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeEvent, normalizeEvents } from "./refresh-homburg-events.mjs";

const todayKey = "2026-10-17";
const sourceEvent = {
  id: 42,
  title: "Kinderkonzert &amp; Spiele",
  start: "2026-11-01 14:30",
  url: "/veranstaltungen/veranstaltungen/kinderkonzert/",
  customHtmlList: "<div><i class='fa fa-map-marker'></i> Kulturzentrum Saalbau</a><p>Musik und Spiele für die ganze Familie.</p></div>",
};

test("normalizeEvent creates a source-linked confirmed event", () => {
  const event = normalizeEvent(sourceEvent, todayKey);
  assert.deepEqual(event, {
    id: "homburg-42-2026-11-01T14:30",
    title: "Kinderkonzert & Spiele",
    originalTitle: "Kinderkonzert & Spiele",
    summary: "Musik und Spiele für die ganze Familie.",
    date: "2026-11-01",
    time: "14:30",
    venue: "Kulturzentrum Saalbau",
    tags: ["community", "civic", "family", "culture"],
    familyRelevance: "Potential family outing or child-friendly activity in nearby Homburg.",
    sourceUrl: "https://www.homburg.de/veranstaltungen/veranstaltungen/kinderkonzert/",
    postDate: todayKey,
    lastChecked: todayKey,
    status: "upcoming",
    dateConfidence: "confirmed",
  });
});

test("normalizeEvents removes duplicate occurrences and ignores malformed records", () => {
  const events = normalizeEvents([sourceEvent, sourceEvent, { id: 7, title: "Missing date" }], todayKey);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, "homburg-42-2026-11-01T14:30");
});
