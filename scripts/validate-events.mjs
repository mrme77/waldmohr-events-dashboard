import { URL } from "node:url";
import { isRecord, generatedAtError, requireStrings, runValidation, runMain } from "./lib.mjs";

const allowedTags = new Set(["family", "community", "culture", "outdoors", "civic", "library", "clubs"]);
const allowedStatus = new Set(["upcoming", "current", "past"]);
const allowedConfidence = new Set(["confirmed", "inferred", "unknown"]);

const file = new URL("../app/public/events.json", import.meta.url);

/**
 * Validates a complete events payload.
 *
 * @param {unknown} payload Candidate event payload.
 * @returns {string[]} Validation errors.
 */
function validatePayload(payload) {
  if (!isRecord(payload)) return ["payload must be an object"];
  const errors = generatedAtError(payload);
  if (typeof payload.source !== "string" || !payload.source.startsWith("https://")) {
    errors.push("source must be an https URL");
  }
  if (!Array.isArray(payload.events)) {
    errors.push("events must be an array");
    return errors;
  }
  payload.events.forEach((event, index) => errors.push(...validateEvent(event, index)));
  return errors;
}

/**
 * Validates one event record.
 *
 * @param {unknown} event Candidate event record.
 * @param {number} index Event index.
 * @returns {string[]} Validation errors.
 */
function validateEvent(event, index) {
  const prefix = `events[${index}]`;
  if (!isRecord(event)) return [`${prefix} must be an object`];

  const errors = requireStrings(event, prefix, [
    "id", "title", "originalTitle", "summary", "date", "venue", "familyRelevance", "sourceUrl", "postDate", "lastChecked",
  ]);
  if (typeof event.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    errors.push(`${prefix}.date must use YYYY-MM-DD`);
  }
  if (event.time !== null && typeof event.time !== "string") {
    errors.push(`${prefix}.time must be a string or null`);
  }
  if (!Array.isArray(event.tags) || event.tags.length === 0) {
    errors.push(`${prefix}.tags must be a non-empty array`);
  } else {
    event.tags.forEach((tag) => {
      if (!allowedTags.has(tag)) errors.push(`${prefix}.tags contains unknown tag ${tag}`);
    });
  }
  if (!allowedStatus.has(event.status)) errors.push(`${prefix}.status is invalid`);
  if (!allowedConfidence.has(event.dateConfidence)) errors.push(`${prefix}.dateConfidence is invalid`);
  if (typeof event.sourceUrl === "string" && !event.sourceUrl.startsWith("https://")) {
    errors.push(`${prefix}.sourceUrl must be an https URL`);
  }
  return errors;
}

runMain(() => runValidation({ file, label: "Event", noun: "events", collectionKey: "events", validatePayload }));
