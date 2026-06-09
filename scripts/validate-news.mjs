import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const payloadFiles = [
  new URL("../data/news.json", import.meta.url),
  new URL("../app/public/news.json", import.meta.url)
];

/**
 * Validates cached news payloads consumed by the v2 marquee.
 *
 * @returns {Promise<void>} Resolves when validation passes.
 */
async function main() {
  const results = await Promise.all(payloadFiles.map(validateFile));
  const errors = results.flatMap((result) => result.errors);

  if (errors.length > 0) {
    throw new Error(`News validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  results.forEach((result) => {
    console.log(`Validated ${result.itemCount} headlines from ${result.generatedAt} in ${result.path}.`);
  });
}

/**
 * Reads and validates one news payload file.
 *
 * @param {URL} fileUrl News payload URL.
 * @returns {Promise<{path: string, itemCount: number, generatedAt: string, errors: string[]}>} Validation result.
 */
async function validateFile(fileUrl) {
  const payload = JSON.parse(await readFile(fileUrl, "utf8"));
  const errors = validatePayload(payload).map((error) => `${fileUrl.pathname}: ${error}`);
  return {
    path: fileUrl.pathname,
    itemCount: Array.isArray(payload?.items) ? payload.items.length : 0,
    generatedAt: typeof payload?.generatedAt === "string" ? payload.generatedAt : "unknown",
    errors
  };
}

/**
 * Validates the complete news payload shape.
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
  if (!Array.isArray(payload.sources) || payload.sources.length === 0) {
    errors.push("sources must be a non-empty array");
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push("items must be a non-empty array");
    return errors;
  }

  payload.items.forEach((item, index) => {
    errors.push(...validateItem(item, index));
  });
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
  const errors = [];
  const prefix = `items[${index}]`;
  if (!isRecord(item)) return [`${prefix} must be an object`];

  for (const field of ["id", "sourceId", "sourceLabel", "sourceName", "title", "url", "publishedAt", "lastChecked"]) {
    if (typeof item[field] !== "string" || item[field].trim() === "") {
      errors.push(`${prefix}.${field} must be a non-empty string`);
    }
  }
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
