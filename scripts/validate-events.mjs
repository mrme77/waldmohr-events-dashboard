import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const allowedTags = new Set(["family", "community", "culture", "outdoors", "civic", "library", "clubs"]);
const allowedStatus = new Set(["upcoming", "current", "past"]);
const allowedConfidence = new Set(["confirmed", "inferred", "unknown"]);

/**
 * Validates the local event data file.
 *
 * @returns {Promise<void>} Resolves when validation passes.
 */
async function main() {
  const payload = JSON.parse(await readFile(new URL("../data/events.json", import.meta.url), "utf8"));
  const errors = validatePayload(payload);

  if (errors.length > 0) {
    throw new Error(`Event validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  console.log(`Validated ${payload.events.length} events from ${payload.generatedAt}.`);
}

/**
 * Validates a complete events payload.
 *
 * @param {unknown} payload Candidate event payload.
 * @returns {string[]} Validation errors.
 */
function validatePayload(payload) {
  const errors = [];

  if (!isRecord(payload)) return ["payload must be an object"];
  if (typeof payload.generatedAt !== "string" || Number.isNaN(Date.parse(payload.generatedAt))) {
    errors.push("generatedAt must be a valid date string");
  }
  if (typeof payload.source !== "string" || !payload.source.startsWith("https://")) {
    errors.push("source must be an https URL");
  }
  if (!Array.isArray(payload.events)) {
    errors.push("events must be an array");
    return errors;
  }

  payload.events.forEach((event, index) => {
    errors.push(...validateEvent(event, index));
  });

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
  const errors = [];
  const prefix = `events[${index}]`;

  if (!isRecord(event)) return [`${prefix} must be an object`];

  for (const field of ["id", "title", "originalTitle", "summary", "date", "venue", "familyRelevance", "sourceUrl", "postDate", "lastChecked"]) {
    if (typeof event[field] !== "string" || event[field].trim() === "") {
      errors.push(`${prefix}.${field} must be a non-empty string`);
    }
  }

  if (typeof event.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    errors.push(`${prefix}.date must use YYYY-MM-DD`);
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

/**
 * Checks whether a value is a plain object record.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} True when object-like.
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
