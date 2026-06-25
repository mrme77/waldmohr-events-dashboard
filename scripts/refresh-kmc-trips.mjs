import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { URL, fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { writeJson, runMain, isRecord } from "./lib.mjs";
import { fetchCurrentIssue, fetchIssuePages } from "./kmc-issue.mjs";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemini-2.5-flash";
const PAGE_PROGRESS_INTERVAL = 5;
const MAX_PAGES_PER_CHUNK = 4;
const MAX_ITEMS_PER_CHUNK = 5;
const output = new URL("../app/public/kmc-trip-ideas.json", import.meta.url);

loadDotenv({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

/**
 * Refreshes LLM-summarized KMC magazine trip ideas from the current issue.
 *
 * @returns {Promise<void>} Resolves after the cache is written or skipped.
 */
async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    await preserveExistingCache("OPENROUTER_API_KEY is not set.");
    return;
  }

  const issue = await fetchCurrentIssue();
  console.log(`Scanning ${issue.pageCount} KMC issue pages for trip ideas...`);
  const pages = await fetchIssuePages(issue, (pageNumber, pageCount) => {
    if (pageNumber % PAGE_PROGRESS_INTERVAL === 0 || pageNumber === pageCount) {
      console.log(`Scanned ${pageNumber}/${pageCount} KMC issue pages.`);
    }
  });

  const chunks = chunkPages(pages, MAX_PAGES_PER_CHUNK);
  const chunkResults = [];
  for (const [index, chunk] of chunks.entries()) {
    console.log(`Asking OpenRouter for KMC trip ideas in chunk ${index + 1}/${chunks.length}...`);
    try {
      chunkResults.push(...await summarizeTripIdeas({ chunk, issue, apiKey }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`Skipping KMC trip idea chunk ${index + 1}/${chunks.length}: ${reason}`);
    }
  }

  const items = normalizeTripIdeas(chunkResults, issue)
    .sort((left, right) => left.pageNumber - right.pageNumber || left.title.localeCompare(right.title));
  if (items.length === 0) {
    await preserveExistingCache(`No trip ideas were identified in ${issue.sourceUrl}.`);
    return;
  }

  await writeJson(output, {
    generatedAt: new Date().toISOString(),
    source: issue.sourceUrl,
    issueTitle: issue.title,
    model: OPENROUTER_MODEL,
    items,
  });

  console.log(`Refreshed ${items.length} KMC trip ideas from ${issue.sourceUrl}.`);
}

/**
 * Splits page text into fixed-size chunks for bounded LLM requests.
 *
 * @param {Array<{pageNumber: number, lines: string[]}>} pages Issue pages.
 * @param {number} pagesPerChunk Maximum pages per chunk.
 * @returns {Array<Array<{pageNumber: number, lines: string[]}>>} Chunked pages.
 */
export function chunkPages(pages, pagesPerChunk) {
  const chunks = [];
  for (let index = 0; index < pages.length; index += pagesPerChunk) {
    chunks.push(pages.slice(index, index + pagesPerChunk));
  }
  return chunks;
}

/**
 * Calls OpenRouter to identify trip, vacation, day-trip, and visit ideas.
 *
 * @param {object} params Request params.
 * @param {Array<{pageNumber: number, lines: string[]}>} params.chunk Page chunk.
 * @param {{sourceUrl: string, publishDate: string}} params.issue Issue metadata.
 * @param {string} params.apiKey OpenRouter API key.
 * @param {typeof fetch} [params.fetchImpl=fetch] Fetch implementation.
 * @returns {Promise<Array<Record<string, unknown>>>} Candidate idea records.
 */
export async function summarizeTripIdeas({ chunk, issue, apiKey, fetchImpl = fetch }) {
  let parseError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetchImpl(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: attempt === 1 ? 0.2 : 0,
        max_tokens: attempt === 1 ? 2200 : 1400,
        response_format: { type: "json_object" },
        messages: buildTripIdeaMessages(chunk, issue, parseError),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenRouter trip summary failed: ${response.status} ${response.statusText} ${body.slice(0, 500)}`);
    }

    const payload = await response.json();
    const content = extractMessageContent(payload);
    try {
      const parsed = parseJsonObject(content);
      if (!Array.isArray(parsed.items)) {
        throw new Error("OpenRouter trip summary response must include an items array.");
      }
      return parsed.items;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      parseError = `${reason}. Response preview: ${content.slice(0, 240) || "[empty]"}`;
    }
  }

  throw new Error(parseError ?? "OpenRouter trip summary response could not be parsed.");
}

/**
 * Builds OpenRouter messages for one page chunk.
 *
 * @param {Array<{pageNumber: number, lines: string[]}>} chunk Page chunk.
 * @param {{sourceUrl: string, publishDate: string}} issue Issue metadata.
 * @param {string | null} parseError Previous parse error, if retrying.
 * @returns {Array<{role: string, content: string}>} Chat messages.
 */
function buildTripIdeaMessages(chunk, issue, parseError = null) {
  const messages = [
    {
      role: "system",
      content: [
        "You identify family-relevant local travel ideas from Kaiserslautern American magazine page text.",
        "Find only concrete trips, vacations, day trips, outings, attractions, places to visit, tours, festivals, markets, hikes, museums, and things to do.",
        "Ignore ads, generic services, military admin notices, sports scores, and items with no visit/trip value.",
        "Return one valid JSON object only, with no markdown fences and no prose.",
      ].join(" "),
    },
    {
      role: "user",
      content: buildTripIdeaPrompt(chunk, issue),
    },
  ];

  if (parseError !== null) {
    messages.push({
      role: "user",
      content: [
        `Your previous response was not parseable JSON: ${parseError}.`,
        `Return only {"items":[]} or a valid object with an items array.`,
        `Return at most ${Math.max(3, MAX_ITEMS_PER_CHUNK - 2)} items, and keep each summary under 140 characters.`,
      ].join(" "),
    });
  }

  return messages;
}

/**
 * Extracts message content from an OpenRouter response.
 *
 * @param {unknown} payload OpenRouter JSON response.
 * @returns {string} Message text.
 */
function extractMessageContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => isRecord(part) && typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();
  }
  return "";
}

/**
 * Builds the prompt for one page chunk.
 *
 * @param {Array<{pageNumber: number, lines: string[]}>} chunk Page chunk.
 * @param {{sourceUrl: string, publishDate: string}} issue Issue metadata.
 * @returns {string} Prompt text.
 */
function buildTripIdeaPrompt(chunk, issue) {
  return [
    `Issue source: ${issue.sourceUrl}`,
    `Issue publish date: ${issue.publishDate}`,
    "Return JSON with this exact shape:",
    JSON.stringify({
      items: [
        {
          title: "short title",
          summary: "1-2 sentence plain-English summary of why this is worth considering",
          location: "place, city, or KMC area",
          pageNumber: 1,
          category: "day-trip",
          audience: "family",
          dateHint: "date or timing text if present, otherwise null",
          confidence: "high",
        },
      ],
    }),
    "Allowed category values: trip, vacation, day-trip, attraction, event, outdoor, culture, food-market.",
    "Allowed audience values: family, adults, kids, general.",
    "Allowed confidence values: high, medium, low.",
    `Return at most ${MAX_ITEMS_PER_CHUNK} strongest ideas from these pages.`,
    "Keep each summary under 180 characters and do not include line breaks inside string values.",
    "Use only the provided text. If there are no matching ideas, return {\"items\":[]}.",
    "Pages:",
    formatPages(chunk),
  ].join("\n\n");
}

/**
 * Formats pages as compact prompt text.
 *
 * @param {Array<{pageNumber: number, lines: string[]}>} pages Page text.
 * @returns {string} Prompt-ready text.
 */
function formatPages(pages) {
  return pages
    .map((page) => {
      const text = page.lines.join(" ").replace(/\s+/g, " ").trim();
      return `--- PAGE ${page.pageNumber} ---\n${text}`;
    })
    .join("\n\n");
}

/**
 * Normalizes and deduplicates LLM trip idea candidates.
 *
 * @param {Array<Record<string, unknown>>} candidates Raw LLM candidates.
 * @param {{sourceUrl: string}} issue Issue metadata.
 * @returns {Array<Record<string, unknown>>} Normalized trip ideas.
 */
export function normalizeTripIdeas(candidates, issue) {
  const seen = new Set();
  const items = [];
  for (const candidate of candidates) {
    const item = normalizeTripIdea(candidate, issue);
    if (item === null) continue;

    const key = `${item.pageNumber}:${slugify(item.title)}:${slugify(item.location)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

/**
 * Normalizes one LLM trip idea candidate.
 *
 * @param {Record<string, unknown>} candidate Raw LLM candidate.
 * @param {{sourceUrl: string}} issue Issue metadata.
 * @returns {Record<string, unknown> | null} Normalized idea or null.
 */
function normalizeTripIdea(candidate, issue) {
  if (!isRecord(candidate)) return null;
  const title = stringValue(candidate.title, 90);
  const summary = stringValue(candidate.summary, 360);
  const location = stringValue(candidate.location, 120) || "KMC area";
  const pageNumber = Number(candidate.pageNumber);
  if (title === "" || summary === "" || !Number.isInteger(pageNumber) || pageNumber < 1) return null;

  const category = enumValue(candidate.category, [
    "trip", "vacation", "day-trip", "attraction", "event", "outdoor", "culture", "food-market",
  ], "day-trip");
  const audience = enumValue(candidate.audience, ["family", "adults", "kids", "general"], "general");
  const confidence = enumValue(candidate.confidence, ["high", "medium", "low"], "medium");
  const dateHint = candidate.dateHint === null ? null : stringValue(candidate.dateHint, 120) || null;

  return {
    id: `kmc-trip-${pageNumber}-${slugify(title)}`,
    title,
    summary,
    location,
    pageNumber,
    category,
    audience,
    dateHint,
    confidence,
    sourceUrl: `${issue.sourceUrl}#page/${pageNumber}`,
    lastChecked: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Preserves an existing cache when refresh cannot run or finds no items.
 *
 * @param {string} reason Preservation reason.
 * @returns {Promise<void>} Resolves after preservation or skip log.
 */
async function preserveExistingCache(reason) {
  if (!existsSync(fileURLToPath(output))) {
    console.warn(`${reason} Skipping KMC trip idea refresh because no previous cache exists.`);
    return;
  }

  const previousPayload = JSON.parse(await readFile(output, "utf8"));
  if (!isRecord(previousPayload) || !Array.isArray(previousPayload.items) || previousPayload.items.length === 0) {
    console.warn(`${reason} Existing KMC trip idea cache is empty, so no payload was preserved.`);
    return;
  }

  await writeJson(output, {
    ...previousPayload,
    generatedAt: new Date().toISOString(),
    refreshWarning: `${reason} Preserved the previous KMC trip idea cache.`,
  });
  console.warn(`${reason} Preserved ${previousPayload.items.length} KMC trip ideas from previous cache.`);
}

/**
 * Parses a JSON object from a model response that may contain markdown fences.
 *
 * @param {string} value Model response text.
 * @returns {Record<string, unknown>} Parsed JSON object.
 */
export function parseJsonObject(value) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : extractFirstJsonObject(trimmed);
  if (jsonText === "") {
    throw new Error("Model response did not contain a JSON object.");
  }
  const parsed = JSON.parse(jsonText);
  if (!isRecord(parsed)) throw new Error("Parsed model response was not a JSON object.");
  return parsed;
}

/**
 * Extracts the first balanced JSON object from response text.
 *
 * @param {string} value Candidate model response.
 * @returns {string} JSON object text or empty string.
 */
function extractFirstJsonObject(value) {
  const start = value.indexOf("{");
  if (start === -1) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return value.slice(start, index + 1);
    }
  }

  return "";
}

/**
 * Returns a bounded string field from a candidate value.
 *
 * @param {unknown} value Candidate value.
 * @param {number} maxLength Maximum string length.
 * @returns {string} Cleaned string.
 */
function stringValue(value, maxLength) {
  if (typeof value !== "string") return "";
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3).trim()}...` : cleaned;
}

/**
 * Returns an allowed enum string or a fallback.
 *
 * @param {unknown} value Candidate value.
 * @param {string[]} allowed Allowed values.
 * @param {string} fallback Fallback value.
 * @returns {string} Enum value.
 */
function enumValue(value, allowed, fallback) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

/**
 * Builds a stable URL-safe id segment.
 *
 * @param {string} value Source string.
 * @returns {string} Slug.
 */
function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "idea";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMain(main);
}
