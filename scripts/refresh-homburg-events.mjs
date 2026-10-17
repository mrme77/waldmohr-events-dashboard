import { URL } from "node:url";
import { config as loadDotenv } from "dotenv";
import { fetchTextWithRetry } from "./fetch-text.mjs";
import { runMain, writeJson } from "./lib.mjs";

export const SOURCE_URL = "https://www.homburg.de/veranstaltungen/";
export const API_URL = "https://www.homburg.de/umbraco/api/veranstaltungen/getall?katId=&search=&ort=&showall=";
const output = new URL("../app/public/homburg-events.json", import.meta.url);
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemini-2.5-flash";
const TRANSLATION_BATCH_SIZE = 20;

loadDotenv({ path: new URL("../.env", import.meta.url).pathname, quiet: true });

/** Converts a string of source HTML to readable text. */
export function stripHtml(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns a YYYY-MM-DD key and optional HH:mm time from the city API datetime. */
export function parseStart(value) {
  const match = typeof value === "string" && value.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?$/);
  if (!match) return null;
  return { date: match[1], time: match[2] ?? null };
}

/** Pulls the venue from the calendar's presentation HTML. */
export function extractVenue(html) {
  const match = html.match(/fa-map-marker[^>]*><\/i>\s*([^<]+)<\/a>/i);
  return match ? stripHtml(match[1]) : "Homburg";
}

/** Pulls the event teaser from the calendar's presentation HTML. */
export function extractSummary(html, title) {
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);
  return paragraphs.at(-1) || `${title} is listed in Homburg's official event calendar.`;
}

/** Infers dashboard display tags without claiming a category unavailable from the feed. */
export function inferTags(title, summary) {
  const text = `${title} ${summary}`;
  const tags = new Set(["community", "civic"]);
  if (/kind|famil|jugend|kita|schule/i.test(text)) tags.add("family");
  if (/konzert|theater|lesezeit|ausstellung|museum|kultur|musik/i.test(text)) tags.add("culture");
  if (/wander|natur|wald|rad|lauf/i.test(text)) tags.add("outdoors");
  if (/verein|chor|sportclub/i.test(text)) tags.add("clubs");
  return [...tags];
}

/** Explains the relevance of a city listing using only the inferred display tags. */
export function familyRelevance(tags) {
  if (tags.includes("family")) return "Potential family outing or child-friendly activity in nearby Homburg.";
  if (tags.includes("culture")) return "A nearby cultural activity listed by the City of Homburg.";
  if (tags.includes("outdoors")) return "A nearby outdoor activity listed by the City of Homburg.";
  return "A nearby public event listed by the City of Homburg.";
}

/** Normalizes one official calendar occurrence into the dashboard schema. */
export function normalizeEvent(event, todayKey) {
  if (!event || typeof event !== "object") return null;
  const { id, title, start, url, customHtmlList } = event;
  if (!Number.isInteger(id) || typeof title !== "string" || typeof url !== "string" || typeof customHtmlList !== "string") {
    return null;
  }
  const parsedStart = parseStart(start);
  if (!parsedStart) return null;

  const cleanTitle = stripHtml(title);
  if (!cleanTitle) return null;
  const summary = extractSummary(customHtmlList, cleanTitle);
  const tags = inferTags(cleanTitle, summary);
  const sourceUrl = new URL(url, SOURCE_URL).toString();

  return {
    id: `homburg-${id}-${start.replace(/\s+/g, "T")}`,
    title: cleanTitle,
    originalTitle: cleanTitle,
    summary,
    date: parsedStart.date,
    time: parsedStart.time,
    venue: extractVenue(customHtmlList),
    tags,
    familyRelevance: familyRelevance(tags),
    sourceUrl,
    postDate: todayKey,
    lastChecked: todayKey,
    status: parsedStart.date < todayKey ? "past" : parsedStart.date > todayKey ? "upcoming" : "current",
    dateConfidence: "confirmed",
  };
}

/** Normalizes and de-duplicates an API response by unique occurrence ID. */
export function normalizeEvents(payload, todayKey) {
  if (!Array.isArray(payload)) throw new TypeError(`Event response from ${API_URL} was not an array.`);
  const events = payload.map((event) => normalizeEvent(event, todayKey)).filter(Boolean);
  const uniqueEvents = [...new Map(events.map((event) => [event.id, event])).values()];
  return uniqueEvents.sort((left, right) => left.date.localeCompare(right.date) || (left.time ?? "").localeCompare(right.time ?? ""));
}

/** Returns a stable key for one translatable official listing. */
function translationKey(event) {
  return `${event.originalTitle}\n${event.summary}`;
}

/** Translates distinct official listings in bounded batches, retaining German on failure. */
export async function translateEvents(events, apiKey, fetchImpl = fetch) {
  if (!apiKey) return events;
  const distinct = [...new Map(events.map((event) => [translationKey(event), event])).values()];
  const translations = new Map();
  for (let offset = 0; offset < distinct.length; offset += TRANSLATION_BATCH_SIZE) {
    const batch = distinct.slice(offset, offset + TRANSLATION_BATCH_SIZE);
    try {
      const response = await fetchImpl(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://github.com/mrme77/waldmohr-events-dashboard", "X-Title": "waldmohr-events-dashboard" },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Translate German municipal event listings into concise US English. Preserve names, dates, times, and factual meaning. Return JSON only." },
            { role: "user", content: JSON.stringify({ items: batch.map((event, index) => ({ index, title: event.originalTitle, summary: event.summary })), response: { items: [{ index: 0, title: "English title", summary: "English summary" }] } }) },
          ],
        }),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const content = (await response.json())?.choices?.[0]?.message?.content;
      const results = typeof content === "string" ? JSON.parse(content).items : null;
      if (!Array.isArray(results)) throw new Error("response did not contain translation items");
      for (const result of results) {
        if (!Number.isInteger(result?.index) || typeof result.title !== "string" || typeof result.summary !== "string") continue;
        const source = batch[result.index];
        if (source && result.title.trim() && result.summary.trim()) translations.set(translationKey(source), { title: result.title.trim(), summary: result.summary.trim() });
      }
    } catch (error) {
      console.warn(`Homburg translation batch ${offset / TRANSLATION_BATCH_SIZE + 1} skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return events.map((event) => {
    const translated = translations.get(translationKey(event));
    return translated ? { ...event, title: translated.title, summary: translated.summary } : event;
  });
}

/** Fetches all public Homburg calendar categories and writes their normalized cache. */
async function main() {
  const body = await fetchTextWithRetry(API_URL, {
    headers: { "User-Agent": "waldmohr-events-dashboard/0.1 personal household dashboard" },
    attempts: 3,
  });
  const todayKey = new Date().toISOString().slice(0, 10);
  const normalizedEvents = normalizeEvents(JSON.parse(body), todayKey);
  const events = await translateEvents(normalizedEvents, process.env.OPENROUTER_API_KEY);
  if (events.length === 0) throw new Error(`No usable events returned by ${API_URL}`);

  await writeJson(output, { generatedAt: new Date().toISOString(), source: SOURCE_URL, model: process.env.OPENROUTER_API_KEY ? OPENROUTER_MODEL : "original German fallback", events });
  console.log(`Refreshed ${events.length} Homburg event occurrences.`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) runMain(main);
