import { URL } from "node:url";
import { isRecord, generatedAtError, requireStrings, runValidation, runMain } from "./lib.mjs";

const file = new URL("../app/public/trash.json", import.meta.url);

/**
 * Validates the complete trash payload shape.
 *
 * @param {unknown} payload Candidate payload.
 * @returns {string[]} Validation errors.
 */
function validatePayload(payload) {
  if (!isRecord(payload)) return ["payload must be an object"];
  const errors = generatedAtError(payload);
  if (typeof payload.source !== "string" || !payload.source.startsWith("https://")) {
    errors.push("source must be an https URL");
  }
  if (!Array.isArray(payload.events) || payload.events.length === 0) {
    errors.push("events must be a non-empty array");
    return errors;
  }
  payload.events.forEach((event, index) => errors.push(...validateEvent(event, index)));
  return errors;
}

/**
 * Validates one trash event record.
 *
 * @param {unknown} event Candidate event.
 * @param {number} index Event index.
 * @returns {string[]} Validation errors.
 */
function validateEvent(event, index) {
  const p = `events[${index}]`;
  if (!isRecord(event)) return [`${p} must be an object`];
  const errors = requireStrings(event, p, ["id", "title", "summary", "date", "venue", "sourceUrl"]);
  if (typeof event.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    errors.push(`${p}.date must be YYYY-MM-DD`);
  }
  if (!Array.isArray(event.tags) || !event.tags.includes("trash")) {
    errors.push(`${p}.tags must include "trash"`);
  }
  return errors;
}

runMain(() => runValidation({ file, label: "Trash", noun: "trash events", collectionKey: "events", validatePayload }));
