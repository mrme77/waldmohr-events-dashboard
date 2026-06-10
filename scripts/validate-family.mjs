import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { URL, fileURLToPath } from "node:url";

const payloadFiles = [
  new URL("../data/family.json", import.meta.url),
  new URL("../app/public/family.json", import.meta.url),
];

/**
 * Validates cached family calendar payloads. The feed is optional — when the
 * gitignored caches are absent (no GCAL_ICS_URL configured) validation is
 * skipped rather than failed so the shared validate chain still passes.
 *
 * @returns {Promise<void>} Resolves when validation passes or is skipped.
 */
async function main() {
  const present = payloadFiles.filter((f) => existsSync(fileURLToPath(f)));
  if (present.length === 0) {
    console.log("Family validation skipped — no family.json caches (GCAL_ICS_URL not configured).");
    return;
  }
  if (present.length !== payloadFiles.length) {
    throw new Error("Family caches out of sync: one of data/ and app/public/ is missing family.json.");
  }

  const results = await Promise.all(present.map(validateFile));
  const errors = results.flatMap((r) => r.errors);

  if (errors.length > 0) {
    throw new Error(`Family validation failed:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  }

  results.forEach((r) => {
    console.log(`Validated ${r.eventCount} family events from ${r.generatedAt} in ${r.path}.`);
  });
}

/**
 * Reads and validates one family payload file.
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
  if (!Array.isArray(payload.events)) {
    errors.push("events must be an array");
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
  for (const field of ["id", "title", "date"]) {
    if (typeof event[field] !== "string" || event[field].trim() === "") {
      errors.push(`${p}.${field} must be a non-empty string`);
    }
  }
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
