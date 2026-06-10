import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const payloadFiles = [
  new URL("../data/fleamarkets.json", import.meta.url),
  new URL("../app/public/fleamarkets.json", import.meta.url),
];

/**
 * Validates cached flea market payloads consumed by the calendar.
 *
 * @returns {Promise<void>} Resolves when validation passes.
 */
async function main() {
  const results = await Promise.all(payloadFiles.map(validateFile));
  const errors = results.flatMap((r) => r.errors);

  if (errors.length > 0) {
    throw new Error(`Flea market validation failed:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  }

  results.forEach((r) => {
    console.log(`Validated ${r.eventCount} flea market dates from ${r.generatedAt} in ${r.path}.`);
  });
}

/**
 * Reads and validates one flea market payload file.
 *
 * @param {URL} fileUrl
 * @returns {Promise<{path: string, eventCount: number, generatedAt: string, errors: string[]}>}
 */
async function validateFile(fileUrl) {
  const payload = JSON.parse(await readFile(fileUrl, "utf8"));
  const errors = validatePayload(payload).map((e) => `${fileUrl.pathname}: ${e}`);
  return {
    path: fileUrl.pathname,
    eventCount: Array.isArray(payload?.events) ? payload.events.length : 0,
    generatedAt: typeof payload?.generatedAt === "string" ? payload.generatedAt : "unknown",
    errors,
  };
}

/**
 * @param {unknown} payload
 * @returns {string[]}
 */
function validatePayload(payload) {
  const errors = [];
  if (!isRecord(payload)) return ["payload must be an object"];
  if (typeof payload.generatedAt !== "string" || Number.isNaN(Date.parse(payload.generatedAt))) {
    errors.push("generatedAt must be a valid date string");
  }
  if (!Array.isArray(payload.events) || payload.events.length === 0) {
    errors.push("events must be a non-empty array");
    return errors;
  }
  payload.events.forEach((e, i) => errors.push(...validateEvent(e, i)));
  return errors;
}

/**
 * @param {unknown} event
 * @param {number} index
 * @returns {string[]}
 */
function validateEvent(event, index) {
  const errors = [];
  const p = `events[${index}]`;
  if (!isRecord(event)) return [`${p} must be an object`];
  for (const field of ["id", "title", "originalTitle", "date", "venue"]) {
    if (typeof event[field] !== "string" || event[field].trim() === "") {
      errors.push(`${p}.${field} must be a non-empty string`);
    }
  }
  if (typeof event.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    errors.push(`${p}.date must be YYYY-MM-DD`);
  }
  if (!Array.isArray(event.tags) || !event.tags.includes("fleamarket")) {
    errors.push(`${p}.tags must include "fleamarket"`);
  }
  return errors;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
