import { URL } from "node:url";
import { isRecord, generatedAtError, requireStrings, runValidation, runMain } from "./lib.mjs";

const file = new URL("../app/public/family.json", import.meta.url);

/**
 * Validates a complete family payload.
 *
 * @param {unknown} payload Candidate payload.
 * @returns {string[]} Validation errors.
 */
function validatePayload(payload) {
  if (!isRecord(payload)) return ["payload must be an object"];
  const errors = generatedAtError(payload);
  if (!Array.isArray(payload.events)) {
    errors.push("events must be an array");
    return errors;
  }
  payload.events.forEach((event, index) => errors.push(...validateEvent(event, index)));
  return errors;
}

/**
 * Validates one family event record.
 *
 * @param {unknown} event Candidate event.
 * @param {number} index Event index.
 * @returns {string[]} Validation errors.
 */
function validateEvent(event, index) {
  const p = `events[${index}]`;
  if (!isRecord(event)) return [`${p} must be an object`];
  const errors = requireStrings(event, p, ["id", "title", "date"]);
  if (typeof event.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    errors.push(`${p}.date must be YYYY-MM-DD`);
  }
  if (!Array.isArray(event.tags) || !event.tags.includes("family")) {
    errors.push(`${p}.tags must include "family"`);
  }
  if (typeof event.sourceUrl === "string" && /private-|\.ics/.test(event.sourceUrl)) {
    errors.push(`${p}.sourceUrl must not leak the private iCal URL`);
  }
  return errors;
}

runMain(() =>
  runValidation({
    file,
    label: "Family",
    noun: "family events",
    collectionKey: "events",
    validatePayload,
    skipMessage: "Family validation skipped — no family.json caches (GCAL_ICS_URL not configured).",
  })
);
