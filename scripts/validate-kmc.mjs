import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const payloadFiles = [
  new URL("../data/kmc-events.json", import.meta.url),
  new URL("../app/public/kmc-events.json", import.meta.url),
];

/**
 * Validates cached KMC magazine event payloads consumed by the calendar.
 *
 * @returns {Promise<void>} Resolves when validation passes.
 */
async function main() {
  const results = await Promise.all(payloadFiles.map(validateFile));
  const errors = results.flatMap((result) => result.errors);

  if (errors.length > 0) {
    throw new Error(`KMC event validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  results.forEach((result) => {
    console.log(`Validated ${result.eventCount} KMC events from ${result.generatedAt} in ${result.path}.`);
  });
}

/**
 * Reads and validates one KMC payload file.
 *
 * @param {URL} fileUrl KMC payload file.
 * @returns {Promise<{path: string, eventCount: number, generatedAt: string, errors: string[]}>} Validation result.
 */
async function validateFile(fileUrl) {
  const payload = JSON.parse(await readFile(fileUrl, "utf8"));
  const errors = validatePayload(payload).map((error) => `${fileUrl.pathname}: ${error}`);
  return {
    path: fileUrl.pathname,
    eventCount: Array.isArray(payload?.events) ? payload.events.length : 0,
    generatedAt: typeof payload?.generatedAt === "string" ? payload.generatedAt : "unknown",
    errors,
  };
}

/**
 * Validates a complete KMC payload.
 *
 * @param {unknown} payload Candidate payload.
 * @returns {string[]} Validation errors.
 */
function validatePayload(payload) {
  const errors = [];
  if (!isRecord(payload)) return ["payload must be an object"];
  if (typeof payload.generatedAt !== "string" || Number.isNaN(Date.parse(payload.generatedAt))) {
    errors.push("generatedAt must be a valid date string");
  }
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
  const errors = [];
  const prefix = `events[${index}]`;
  if (!isRecord(event)) return [`${prefix} must be an object`];

  for (const field of ["id", "title", "originalTitle", "summary", "date", "venue", "sourceUrl", "postDate", "lastChecked"]) {
    if (typeof event[field] !== "string" || event[field].trim() === "") {
      errors.push(`${prefix}.${field} must be a non-empty string`);
    }
  }
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
