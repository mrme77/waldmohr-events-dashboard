import { URL } from "node:url";
import { isRecord, generatedAtError, requireStrings, runValidation, runMain } from "./lib.mjs";

const file = new URL("../app/public/kmc-events.json", import.meta.url);

/**
 * Validates a complete KMC payload.
 *
 * @param {unknown} payload Candidate payload.
 * @returns {string[]} Validation errors.
 */
function validatePayload(payload) {
  if (!isRecord(payload)) return ["payload must be an object"];
  const errors = generatedAtError(payload);
  if (typeof payload.source !== "string" || !payload.source.startsWith("https://issuu.com/")) {
    errors.push("source must be an Issuu HTTPS URL");
  }
  if (!Array.isArray(payload.events)) {
    errors.push("events must be an array");
    return errors;
  }
  payload.events.forEach((event, index) => errors.push(...validateEvent(event, index)));
  return errors;
}

/**
 * Validates one KMC event record.
 *
 * @param {unknown} event Candidate event.
 * @param {number} index Event index.
 * @returns {string[]} Validation errors.
 */
function validateEvent(event, index) {
  const prefix = `events[${index}]`;
  if (!isRecord(event)) return [`${prefix} must be an object`];

  const errors = requireStrings(event, prefix, [
    "id", "title", "originalTitle", "summary", "date", "venue", "sourceUrl", "postDate", "lastChecked",
  ]);
  if (typeof event.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    errors.push(`${prefix}.date must use YYYY-MM-DD`);
  }
  if (event.time !== null && typeof event.time !== "string") {
    errors.push(`${prefix}.time must be a string or null`);
  }
  if (!Array.isArray(event.tags) || !event.tags.includes("community")) {
    errors.push(`${prefix}.tags must include community`);
  }
  if (typeof event.sourceUrl === "string" && !event.sourceUrl.startsWith("https://issuu.com/")) {
    errors.push(`${prefix}.sourceUrl must be an Issuu HTTPS URL`);
  }
  return errors;
}

runMain(() => runValidation({ file, label: "KMC event", noun: "KMC events", collectionKey: "events", validatePayload }));
