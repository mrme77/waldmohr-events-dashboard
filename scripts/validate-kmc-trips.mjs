import { URL } from "node:url";
import { isRecord, generatedAtError, requireStrings, runValidation, runMain } from "./lib.mjs";

const file = new URL("../app/public/kmc-trip-ideas.json", import.meta.url);

/**
 * Validates a complete KMC trip idea payload.
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
  if (typeof payload.model !== "string" || payload.model !== "google/gemini-2.5-flash") {
    errors.push("model must be google/gemini-2.5-flash");
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push("items must be a non-empty array");
    return errors;
  }
  payload.items.forEach((item, index) => errors.push(...validateItem(item, index)));
  return errors;
}

/**
 * Validates one KMC trip idea record.
 *
 * @param {unknown} item Candidate item.
 * @param {number} index Item index.
 * @returns {string[]} Validation errors.
 */
function validateItem(item, index) {
  const prefix = `items[${index}]`;
  if (!isRecord(item)) return [`${prefix} must be an object`];

  const errors = requireStrings(item, prefix, [
    "id", "title", "summary", "location", "category", "audience", "confidence", "sourceUrl", "lastChecked",
  ]);
  if (typeof item.pageNumber !== "number" || !Number.isInteger(item.pageNumber) || item.pageNumber < 1) {
    errors.push(`${prefix}.pageNumber must be a positive integer`);
  }
  if (item.dateHint !== null && typeof item.dateHint !== "string") {
    errors.push(`${prefix}.dateHint must be a string or null`);
  }
  if (typeof item.sourceUrl === "string" && !item.sourceUrl.startsWith("https://issuu.com/")) {
    errors.push(`${prefix}.sourceUrl must be an Issuu HTTPS URL`);
  }
  if (typeof item.lastChecked === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(item.lastChecked)) {
    errors.push(`${prefix}.lastChecked must use YYYY-MM-DD`);
  }
  return errors;
}

runMain(() =>
  runValidation({
    file,
    label: "KMC trip idea",
    noun: "KMC trip ideas",
    collectionKey: "items",
    validatePayload,
    skipMessage: "No KMC trip idea cache found; skipping optional KMC trip idea validation.",
  })
);
