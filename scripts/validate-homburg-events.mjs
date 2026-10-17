import { URL } from "node:url";
import { generatedAtError, isRecord, requireStrings, runMain, runValidation } from "./lib.mjs";

const allowedTags = new Set(["family", "community", "culture", "outdoors", "civic", "library", "clubs"]);
const file = new URL("../app/public/homburg-events.json", import.meta.url);

/** Validates the complete official-Homburg event payload. */
function validatePayload(payload) {
  if (!isRecord(payload)) return ["payload must be an object"];
  const errors = generatedAtError(payload);
  if (payload.source !== "https://www.homburg.de/veranstaltungen/") errors.push("source must be the official Homburg calendar URL");
  if (!Array.isArray(payload.events)) return [...errors, "events must be an array"];
  payload.events.forEach((event, index) => errors.push(...validateEvent(event, index)));
  return errors;
}

/** Validates one normalized Homburg occurrence. */
function validateEvent(event, index) {
  const prefix = `events[${index}]`;
  if (!isRecord(event)) return [`${prefix} must be an object`];
  const errors = requireStrings(event, prefix, [
    "id", "title", "originalTitle", "summary", "date", "venue", "familyRelevance", "sourceUrl", "postDate", "lastChecked",
  ]);
  if (typeof event.id === "string" && !/^homburg-\d+-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(event.id)) errors.push(`${prefix}.id must identify an occurrence`);
  if (typeof event.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) errors.push(`${prefix}.date must use YYYY-MM-DD`);
  if (event.time !== null && (typeof event.time !== "string" || !/^\d{2}:\d{2}$/.test(event.time))) errors.push(`${prefix}.time must be HH:mm or null`);
  if (!Array.isArray(event.tags) || event.tags.length === 0 || !event.tags.includes("civic")) errors.push(`${prefix}.tags must include civic`);
  else event.tags.forEach((tag) => { if (!allowedTags.has(tag)) errors.push(`${prefix}.tags contains unknown tag ${tag}`); });
  if (!['upcoming', 'current', 'past'].includes(event.status)) errors.push(`${prefix}.status is invalid`);
  if (event.dateConfidence !== "confirmed") errors.push(`${prefix}.dateConfidence must be confirmed`);
  if (typeof event.sourceUrl === "string" && !event.sourceUrl.startsWith("https://www.homburg.de/")) errors.push(`${prefix}.sourceUrl must be an official Homburg URL`);
  return errors;
}

runMain(() => runValidation({ file, label: "Homburg event", noun: "Homburg events", collectionKey: "events", validatePayload }));
