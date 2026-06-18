import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Runs a script's async entry point and maps a thrown error to a non-zero exit.
 *
 * @param {() => Promise<void>} fn Script entry point.
 * @returns {void}
 */
export function runMain(fn) {
  fn().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

/**
 * Writes a payload as pretty JSON (trailing newline) to one file URL.
 *
 * @param {URL} target Output file URL.
 * @param {unknown} payload Serializable payload.
 * @returns {Promise<void>}
 */
export async function writeJson(target, payload) {
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`);
}

/**
 * Checks whether a value is a plain object record.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} True when object-like.
 */
export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns an error when `generatedAt` is missing or not a parseable date.
 *
 * @param {Record<string, unknown>} payload Candidate payload.
 * @returns {string[]} Zero or one validation error.
 */
export function generatedAtError(payload) {
  if (typeof payload.generatedAt !== "string" || Number.isNaN(Date.parse(payload.generatedAt))) {
    return ["generatedAt must be a valid date string"];
  }
  return [];
}

/**
 * Pushes an error for each field that is not a non-empty string.
 *
 * @param {Record<string, unknown>} record Candidate record.
 * @param {string} prefix Error-message prefix, e.g. "events[0]".
 * @param {string[]} fields Required string field names.
 * @returns {string[]} Validation errors.
 */
export function requireStrings(record, prefix, fields) {
  const errors = [];
  for (const field of fields) {
    if (typeof record[field] !== "string" || record[field].trim() === "") {
      errors.push(`${prefix}.${field} must be a non-empty string`);
    }
  }
  return errors;
}

/**
 * Reads, parses, and validates one payload file, prefixing errors with its path.
 *
 * @param {URL} fileUrl Payload file URL.
 * @param {string} collectionKey Array field counted for the success log ("events"|"items").
 * @param {(payload: unknown) => string[]} validatePayload Payload validator.
 * @returns {Promise<{path: string, count: number, generatedAt: string, errors: string[]}>}
 */
async function validateFile(fileUrl, collectionKey, validatePayload) {
  const payload = JSON.parse(await readFile(fileUrl, "utf8"));
  const errors = validatePayload(payload).map((error) => `${fileUrl.pathname}: ${error}`);
  const collection = payload?.[collectionKey];
  return {
    path: fileUrl.pathname,
    count: Array.isArray(collection) ? collection.length : 0,
    generatedAt: typeof payload?.generatedAt === "string" ? payload.generatedAt : "unknown",
    errors,
  };
}

/**
 * Validates one payload file and logs a summary, throwing when any record is
 * invalid. Optional feeds (file absent) are skipped rather than failed.
 *
 * @param {object} config
 * @param {URL} config.file Payload file URL.
 * @param {string} config.label Human noun for messages, e.g. "Holiday".
 * @param {string} config.noun Plural noun for the success log, e.g. "holidays".
 * @param {string} config.collectionKey Array field to count ("events"|"items").
 * @param {(payload: unknown) => string[]} config.validatePayload Payload validator.
 * @param {string} [config.skipMessage] When set, a missing file logs this and passes.
 * @returns {Promise<void>}
 */
export async function runValidation({ file, label, noun, collectionKey, validatePayload, skipMessage }) {
  if (skipMessage && !existsSync(fileURLToPath(file))) {
    console.log(skipMessage);
    return;
  }

  const result = await validateFile(file, collectionKey, validatePayload);
  if (result.errors.length > 0) {
    throw new Error(`${label} validation failed:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }

  console.log(`Validated ${result.count} ${noun} from ${result.generatedAt} in ${result.path}.`);
}
