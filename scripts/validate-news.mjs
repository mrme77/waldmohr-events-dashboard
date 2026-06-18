import { URL } from "node:url";
import { isRecord, generatedAtError, requireStrings, runValidation, runMain } from "./lib.mjs";

const file = new URL("../app/public/news.json", import.meta.url);

/**
 * Validates the complete news payload shape.
 *
 * @param {unknown} payload Candidate payload.
 * @returns {string[]} Validation errors.
 */
function validatePayload(payload) {
  if (!isRecord(payload)) return ["payload must be an object"];
  const errors = generatedAtError(payload);
  if (!Array.isArray(payload.sources) || payload.sources.length === 0) {
    errors.push("sources must be a non-empty array");
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push("items must be a non-empty array");
    return errors;
  }
  payload.items.forEach((item, index) => errors.push(...validateItem(item, index)));
  return errors;
}

/**
 * Validates one news headline record.
 *
 * @param {unknown} item Candidate news item.
 * @param {number} index Item index.
 * @returns {string[]} Validation errors.
 */
function validateItem(item, index) {
  const prefix = `items[${index}]`;
  if (!isRecord(item)) return [`${prefix} must be an object`];

  const errors = requireStrings(item, prefix, [
    "id", "sourceId", "sourceLabel", "sourceName", "title", "url", "publishedAt", "lastChecked",
  ]);
  if (typeof item.url === "string" && !item.url.startsWith("https://")) {
    errors.push(`${prefix}.url must be an https URL`);
  }
  if (typeof item.publishedAt === "string" && Number.isNaN(Date.parse(item.publishedAt))) {
    errors.push(`${prefix}.publishedAt must be a valid date`);
  }
  if (typeof item.lastChecked === "string" && Number.isNaN(Date.parse(item.lastChecked))) {
    errors.push(`${prefix}.lastChecked must be a valid date`);
  }
  return errors;
}

runMain(() => runValidation({ file, label: "News", noun: "headlines", collectionKey: "items", validatePayload }));
