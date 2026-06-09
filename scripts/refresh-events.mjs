import { writeFile } from "node:fs/promises";
import { URL } from "node:url";

const apiUrl = "https://www.waldmohr-aktuell.de/wp-json/wp/v2/posts?per_page=50&_embed=1";
const eventCategoryIds = new Set([7, 111, 113, 115]);
const today = new Date();

/**
 * Pulls public Waldmohr Aktuell posts and writes normalized candidate event files.
 *
 * @returns {Promise<void>} Resolves after files are written.
 */
async function main() {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
  }

  const posts = await response.json();
  const events = posts
    .filter(isEventCandidate)
    .map(normalizePost)
    .sort((left, right) => right.date.localeCompare(left.date));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "https://www.waldmohr-aktuell.de/",
    events
  };

  await writeFile(new URL("../data/events.json", import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(
    new URL("../data/events.js", import.meta.url),
    `window.WALDMOHR_EVENTS = ${JSON.stringify(payload, null, 2)};\n`
  );

  console.log(`Refreshed ${events.length} candidate events.`);
}

/**
 * Returns true when a WordPress post is likely relevant to the event dashboard.
 *
 * @param {Record<string, unknown>} post WordPress post.
 * @returns {boolean} True when the post is an event candidate.
 */
function isEventCandidate(post) {
  const categoryIds = Array.isArray(post.categories) ? post.categories : [];
  const text = stripHtml(`${post.title?.rendered ?? ""} ${post.excerpt?.rendered ?? ""} ${post.content?.rendered ?? ""}`);
  const eventWords = /\b(veranstaltung|fest|wanderung|exkursion|museumstag|sitzung|konzert|boerse|börse|programm|vortrag)\b/i;

  return categoryIds.some((id) => eventCategoryIds.has(id)) || eventWords.test(text);
}

/**
 * Normalizes a WordPress post into the local event schema.
 *
 * @param {Record<string, unknown>} post WordPress post.
 * @returns {Record<string, unknown>} Normalized event.
 */
function normalizePost(post) {
  const title = stripHtml(post.title?.rendered ?? "Untitled event");
  const text = stripHtml(`${post.excerpt?.rendered ?? ""} ${post.content?.rendered ?? ""}`);
  const candidateDate = extractDate(`${title} ${text}`);
  const eventDate = candidateDate ?? String(post.date ?? "").slice(0, 10);

  return {
    id: String(post.slug ?? `post-${post.id}`),
    title: title,
    originalTitle: title,
    summary: text.slice(0, 240) || "Summary not available yet.",
    date: eventDate,
    time: extractTime(`${title} ${text}`),
    venue: extractVenue(text),
    tags: inferTags(`${title} ${text}`, Array.isArray(post.categories) ? post.categories : []),
    familyRelevance: "Review this source item and decide whether it matters for a relocating American family.",
    sourceUrl: String(post.link ?? "https://www.waldmohr-aktuell.de/"),
    postDate: String(post.date ?? "").slice(0, 10),
    lastChecked: new Date().toISOString().slice(0, 10),
    status: classifyStatus(eventDate),
    dateConfidence: candidateDate ? "inferred" : "unknown"
  };
}

/**
 * Extracts a German-style date from text.
 *
 * @param {string} text Source text.
 * @returns {string | null} ISO date or null.
 */
function extractDate(text) {
  const match = text.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
  if (!match) return null;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Extracts a simple time value from text.
 *
 * @param {string} text Source text.
 * @returns {string | null} Time or null.
 */
function extractTime(text) {
  const match = text.match(/\b(\d{1,2})(?::|\s?Uhr\s?|\.)(\d{2})?\s*(?:Uhr)?\b/i);
  if (!match) return null;

  const hour = match[1].padStart(2, "0");
  const minute = match[2] ? match[2].padStart(2, "0") : "00";
  return `${hour}:${minute}`;
}

/**
 * Extracts a conservative venue placeholder.
 *
 * @param {string} text Source text.
 * @returns {string} Venue text.
 */
function extractVenue(text) {
  if (/rathaus/i.test(text)) return "Rathaus Waldmohr";
  if (/marktplatz/i.test(text)) return "Marktplatz Waldmohr";
  if (/museum/i.test(text)) return "Waldmohr museum area";
  return "Waldmohr";
}

/**
 * Infers dashboard tags from post text and categories.
 *
 * @param {string} text Source text.
 * @param {unknown[]} categories WordPress category ids.
 * @returns {string[]} Tags.
 */
function inferTags(text, categories) {
  const tags = new Set(["community"]);
  if (/kind|famil|jugend|kita|schule/i.test(text)) tags.add("family");
  if (/wander|nabu|natur|pflanz|kranich/i.test(text)) tags.add("outdoors");
  if (/museum|konzert|theater|poetry|kultur/i.test(text)) tags.add("culture");
  if (/stadtrat|sitzung|rathaus|buerger|bürger/i.test(text)) tags.add("civic");
  if (/verein|nabu|turnverein|chor/i.test(text) || categories.includes(113)) tags.add("clubs");
  if (/buecherei|bücherei|bibliothek/i.test(text) || categories.includes(115)) tags.add("library");
  return Array.from(tags);
}

/**
 * Classifies an event date relative to today.
 *
 * @param {string} date ISO date.
 * @returns {"upcoming" | "current" | "past"} Event status.
 */
function classifyStatus(date) {
  const parsed = new Date(`${date}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) return "current";
  return parsed < today ? "past" : "upcoming";
}

/**
 * Removes HTML tags and normalizes whitespace.
 *
 * @param {string} value HTML or text.
 * @returns {string} Plain text.
 */
function stripHtml(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
