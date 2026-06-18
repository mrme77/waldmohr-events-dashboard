import { URL } from "node:url";
import { isRecord, generatedAtError, requireStrings, runValidation, runMain } from "./lib.mjs";

const file = new URL("../app/public/fleamarkets.json", import.meta.url);

/**
 * Validates a complete flea market payload.
 *
 * @param {unknown} payload Candidate payload.
 * @returns {string[]} Validation errors.
 */
function validatePayload(payload) {
  if (!isRecord(payload)) return ["payload must be an object"];
  const errors = generatedAtError(payload);
  if (!Array.isArray(payload.events) || payload.events.length === 0) {
    errors.push("events must be a non-empty array");
    return errors;
  }
  payload.events.forEach((event, index) => errors.push(...validateEvent(event, index)));
  return errors;
}

/**
 * Validates one flea market event record.
 *
 * @param {unknown} event Candidate event.
 * @param {number} index Event index.
 * @returns {string[]} Validation errors.
 */
function validateEvent(event, index) {
  const p = `events[${index}]`;
  if (!isRecord(event)) return [`${p} must be an object`];
  const errors = requireStrings(event, p, ["id", "title", "originalTitle", "date", "venue"]);
  if (typeof event.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    errors.push(`${p}.date must be YYYY-MM-DD`);
  }
  if (!Array.isArray(event.tags) || !event.tags.includes("fleamarket")) {
    errors.push(`${p}.tags must include "fleamarket"`);
  }
  return errors;
}

runMain(() => runValidation({ file, label: "Flea market", noun: "flea market dates", collectionKey: "events", validatePayload }));
