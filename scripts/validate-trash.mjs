import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const payloadFiles = [
  new URL("../data/trash.json", import.meta.url),
  new URL("../app/public/trash.json", import.meta.url),
];

/**
 * Validates cached trash collection payloads consumed by the calendar.
 *
 * @returns {Promise<void>} Resolves when validation passes.
 */
async function main() {
  const results = await Promise.all(payloadFiles.map(validateFile));
  const errors = results.flatMap((r) => r.errors);

  if (errors.length > 0) {
    throw new Error(`Trash validation failed:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  }

  results.forEach((r) => {
    console.log(`Validated ${r.eventCount} trash events from ${r.generatedAt} in ${r.path}.`);
  });
}

/**
 * Reads and validates one trash payload file.
 *
 * @param {URL} fileUrl Payload file URL.
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
 * Validates the complete trash payload shape.
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
  if (typeof payload.source !== "string" || !payload.source.startsWith("https://")) {
    errors.push("source must be an https URL");
  }
  if (!Array.isArray(payload.events) || payload.events.length === 0) {
    errors.push("events must be a non-empty array");
    return errors;
  }

  payload.events.forEach((event, index) => {
    errors.push(...validateEvent(event, index));
  });
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
  const errors = [];
  const p = `events[${index}]`;
  if (!isRecord(event)) return [`${p} must be an object`];

  for (const field of ["id", "title", "summary", "date", "venue", "sourceUrl"]) {
    if (typeof event[field] !== "string" || event[field].trim() === "") {
      errors.push(`${p}.${field} must be a non-empty string`);
    }
  }
  if (typeof event.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    errors.push(`${p}.date must be YYYY-MM-DD`);
  }
  if (!Array.isArray(event.tags) || !event.tags.includes("trash")) {
    errors.push(`${p}.tags must include "trash"`);
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
