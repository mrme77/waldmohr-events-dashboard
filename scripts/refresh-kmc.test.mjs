import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPreservedKmcPayload,
  refreshKmcEventStatuses,
} from "./refresh-kmc.mjs";

test("refreshKmcEventStatuses refreshes lastChecked and status", () => {
  const events = refreshKmcEventStatuses(
    [
      { id: "past", date: "2026-06-24", lastChecked: "2026-06-20", status: "upcoming" },
      { id: "current", date: "2026-06-25", lastChecked: "2026-06-20", status: "upcoming" },
      { id: "upcoming", date: "2026-06-26", lastChecked: "2026-06-20", status: "past" },
    ],
    "2026-06-25"
  );

  assert.deepEqual(
    events.map((event) => [event.id, event.lastChecked, event.status]),
    [
      ["past", "2026-06-25", "past"],
      ["current", "2026-06-25", "current"],
      ["upcoming", "2026-06-25", "upcoming"],
    ]
  );
});

test("buildPreservedKmcPayload keeps previous source and records attempted source", () => {
  const payload = buildPreservedKmcPayload(
    {
      source: "https://issuu.com/advantinews/docs/previous",
      events: [{ id: "event", date: "2026-06-25", lastChecked: "2026-06-20", status: "past" }],
    },
    { sourceUrl: "https://issuu.com/advantinews/docs/current" },
    "No UNTERWEGS pages were found.",
    new Date("2026-06-25T12:00:00.000Z")
  );

  assert.equal(payload.generatedAt, "2026-06-25T12:00:00.000Z");
  assert.equal(payload.source, "https://issuu.com/advantinews/docs/previous");
  assert.equal(payload.attemptedSource, "https://issuu.com/advantinews/docs/current");
  assert.match(String(payload.refreshWarning), /No UNTERWEGS pages were found/);
  assert.deepEqual(payload.events, [
    { id: "event", date: "2026-06-25", lastChecked: "2026-06-25", status: "current" },
  ]);
});
