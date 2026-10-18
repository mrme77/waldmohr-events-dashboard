import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
});
after(() => server.close());
const { SourceQr } = await server.ssrLoadModule("/src/components/SourceQr.tsx");
const { EventDetail } = await server.ssrLoadModule("/src/components/EventDetail.tsx");
const { HomburgHighlights } = await server.ssrLoadModule("/src/components/HomburgHighlights.tsx");

const event = {
  id: "homburg-123", title: "Concert", originalTitle: "Konzert", summary: "Music",
  date: "2026-10-20", time: "18:00", venue: "Homburg", tags: ["culture"],
  familyRelevance: "Nearby", sourceUrl: "https://www.homburg.de/events/123",
  postDate: "2026-10-18", lastChecked: "2026-10-18", status: "upcoming",
  dateConfidence: "confirmed",
};

test("source QR renders a local SVG and phone instructions without a navigation link", () => {
  const html = renderToStaticMarkup(createElement(SourceQr, { url: event.sourceUrl, title: event.title }));
  assert.match(html, /<svg/);
  assert.match(html, /Scan to read on your phone/);
  assert.match(html, /www.homburg.de/);
  assert.doesNotMatch(html, /<a\b|<img\b/);
});

test("source QR reports malformed, unsafe, and oversized URLs without crashing", () => {
  for (const url of ["", "not a URL", "javascript:alert(1)", `https://example.com/${"a".repeat(2048)}`]) {
    const html = renderToStaticMarkup(createElement(SourceQr, { url, title: "Source" }));
    assert.match(html, /QR code is unavailable/);
    assert.doesNotMatch(html, /<svg/);
  }
});

test("event details show a QR code and a close control instead of opening another tab", () => {
  const html = renderToStaticMarkup(createElement(EventDetail, {
    dayKey: event.date, events: [event], onClose() {},
  }));
  assert.match(html, /<svg/);
  assert.match(html, /aria-label="Close"/);
  assert.doesNotMatch(html, /<a\b|target="_blank"/);
  assert.equal(renderToStaticMarkup(createElement(EventDetail, {
    dayKey: null, events: [], onClose() {},
  })), "");
});

test("Homburg highlights render touch buttons and exclude past or unrelated events", () => {
  const html = renderToStaticMarkup(createElement(HomburgHighlights, {
    events: [event, { ...event, id: "homburg-past", title: "Old listing", status: "past" },
      { ...event, id: "waldmohr-1", title: "Other town" }], onSelect() {},
  }));
  assert.match(html, /<button type="button"/);
  assert.match(html, /Concert/);
  assert.doesNotMatch(html, /Old listing|Other town|<a\b/);
  assert.equal(renderToStaticMarkup(createElement(HomburgHighlights, {
    events: [], onSelect() {},
  })), "");
});

test("birthdays appear before public QR cards on a shared day without changing input order", () => {
  const birthday = { ...event, id: "family-birthday", title: "Birthday", tags: ["family"] };
  const events = [event, birthday];
  const html = renderToStaticMarkup(createElement(EventDetail, {
    dayKey: event.date, events, onClose() {},
  }));
  assert.ok(html.indexOf("<h3>Birthday</h3>") < html.indexOf("<h3>Concert</h3>"));
  assert.match(html, /Family calendar/);
  assert.equal((html.match(/<svg/g) ?? []).length, 1);
  assert.equal(events[0], event);
});

test("a day with only a personal leave entry shows details without a source QR", () => {
  const html = renderToStaticMarkup(createElement(EventDetail, {
    dayKey: event.date,
    events: [{ ...event, id: "family-leave", title: "Vacation", tags: ["family", "leave"] }],
    onClose() {},
  }));
  assert.match(html, /Vacation/);
  assert.match(html, /Family calendar/);
  assert.doesNotMatch(html, /<svg|Scan to read/);
});
