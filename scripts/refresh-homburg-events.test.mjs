import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeEvent, normalizeEvents, translateEvents } from "./refresh-homburg-events.mjs";

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

test("translateEvents translates distinct listings once and applies results to recurrences", async () => {
  const event = normalizeEvent(sourceEvent, todayKey);
  const recurring = { ...event, id: "homburg-42-2026-11-08T14:30", date: "2026-11-08" };
  let calls = 0;
  let requestedBody;
  const result = await translateEvents([event, recurring], "test-key", async (_url, options) => {
    calls += 1;
    requestedBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ items: [{ index: 0, title: "Children's concert & games", summary: "Music and games for the whole family." }] }) } }] }) };
  });
  assert.equal(calls, 1);
  assert.equal(requestedBody.model, "minimax/minimax-m3.1-flash:free");
  assert.deepEqual(requestedBody.response_format, { type: "json_object" });
  assert.equal(result.events[0].title, "Children's concert & games");
  assert.equal(result.events[1].summary, "Music and games for the whole family.");
  assert.equal(result.translatedListings, 1);
  assert.equal(result.totalListings, 1);
});

test("translateEvents reports German fallback when no API key is configured", async () => {
  const event = normalizeEvent(sourceEvent, todayKey);
  const result = await translateEvents([event], "");

  assert.equal(result.events[0].title, event.originalTitle);
  assert.equal(result.translatedListings, 0);
  assert.equal(result.totalListings, 1);
});
