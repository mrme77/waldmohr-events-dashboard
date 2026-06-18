import { URL } from "node:url";
import { writeJson, runMain } from "./lib.mjs";

const KAISERSLAUTERN_AMERICAN_URL = "https://www.kaiserslauternamerican.com/";
const ISSUU_DOC_BASE_URL = "https://issuu.com/advantinews/docs/";
const USER_AGENT =
  "Mozilla/5.0 (compatible; WaldmohrEventsDashboard/0.1; +https://www.kaiserslauternamerican.com/)";
const output = new URL("../app/public/kmc-events.json", import.meta.url);

const ENGLISH_MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/**
 * Refreshes KMC-area event listings from the Kaiserslautern American digital edition.
 *
 * @returns {Promise<void>} Resolves after local cache files are written.
 */
async function main() {
  const issue = await fetchCurrentIssue();
  const pageTexts = await fetchUnterwegsPages(issue);
  const events = pageTexts
    .flatMap((page) => parseUnterwegsEvents(page, issue))
    .filter((event) => event !== null)
    .sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: issue.sourceUrl,
    events,
  };

  await writeJson(output, payload);

  console.log(
    `Refreshed ${events.length} KMC UNTERWEGS events from ${pageTexts.length} page(s).`
  );
}

/**
 * Finds the current Kaiserslautern American Issuu issue from the homepage embed.
 *
 * @returns {Promise<{slug: string, sourceUrl: string, title: string, revisionId: string, publicationId: string, pageCount: number, publishDate: string}>}
 */
async function fetchCurrentIssue() {
  const homepage = await fetchText(KAISERSLAUTERN_AMERICAN_URL);
  const embedMatch = homepage.match(/<iframe[^>]+src="([^"]*e\.issuu\.com\/embed\.html[^"]+)"/i);
  if (!embedMatch) {
    throw new Error("Could not find the Kaiserslautern American Issuu embed on the homepage.");
  }

  const embedUrl = decodeHtml(embedMatch[1]);
  const slug = new URL(embedUrl).searchParams.get("d");
  if (slug === null || slug.trim() === "") {
    throw new Error("Could not find the Issuu document slug in the homepage embed.");
  }

  const sourceUrl = `${ISSUU_DOC_BASE_URL}${encodeURIComponent(slug)}`;
  const documentHtml = await fetchText(sourceUrl);
  const revisionId = extractJsonString(documentHtml, "revisionId");
  const publicationId = extractJsonString(documentHtml, "publicationId");
  const title = extractJsonString(documentHtml, "title");
  const publishDate = extractJsonString(documentHtml, "originalPublishDateInISOString").slice(0, 10);
  const pageCount = Number(extractJsonNumber(documentHtml, "pageCount"));

  if ([revisionId, publicationId, title, publishDate].some((value) => value === "")) {
    throw new Error("Could not extract Issuu issue metadata from the document page.");
  }
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new Error("Could not extract a valid Issuu page count from the document page.");
  }

  return { slug, sourceUrl, title, revisionId, publicationId, pageCount, publishDate };
}

/**
 * Fetches SVG text for pages that contain the UNTERWEGS section.
 *
 * @param {{revisionId: string, publicationId: string, pageCount: number}} issue Current issue metadata.
 * @returns {Promise<Array<{pageNumber: number, lines: string[]}>>} Readable page text.
 */
async function fetchUnterwegsPages(issue) {
  const pages = [];
  for (let pageNumber = 1; pageNumber <= issue.pageCount; pageNumber += 1) {
    const svgUrl = `https://svg.issuu.com/${issue.revisionId}-${issue.publicationId}/page_${pageNumber}.svg`;
    const svg = await fetchText(svgUrl);
    if (!svg.includes("UNTERWEGS")) continue;

    pages.push({
      pageNumber,
      lines: extractSvgLines(svg, pageNumber),
    });
  }
  return pages;
}

/**
 * Turns one UNTERWEGS page into normalized dashboard events.
 *
 * @param {{pageNumber: number, lines: string[]}} page Extracted page text.
 * @param {{sourceUrl: string, publishDate: string}} issue Current issue metadata.
 * @returns {Array<Record<string, unknown> | null>} Candidate events.
 */
function parseUnterwegsEvents(page, issue) {
  const startIndex = page.lines.findIndex((line) => line === "UNTERWEGS");
  if (startIndex === -1) return [];

  const lines = page.lines.slice(startIndex + 1).filter(isContentLine);
  const events = [];
  let index = 0;

  while (index < lines.length) {
    const dateLineIndex = lines.findIndex((line, offset) => offset >= index && isDateLine(line));
    if (dateLineIndex === -1) break;

    const titleLines = lines.slice(index, dateLineIndex).filter((line) => !isPhotoCredit(line));
    const nextDateLineIndex = lines.findIndex((line, offset) => offset > dateLineIndex && isDateLine(line));
    const endIndex = nextDateLineIndex === -1 ? lines.length : nextDateLineIndex - collectTitleLineCount(lines, nextDateLineIndex);
    const dateContinuationCount = collectDateContinuationLineCount(lines, dateLineIndex, endIndex);
    const dateLine = [lines[dateLineIndex], ...lines.slice(dateLineIndex + 1, dateLineIndex + 1 + dateContinuationCount)].join(", ");
    const bodyLines = lines.slice(dateLineIndex + 1 + dateContinuationCount, Math.max(dateLineIndex + 1, endIndex));
    const event = buildEvent(titleLines, dateLine, bodyLines, page.pageNumber, issue);
    events.push(event);
    index = nextDateLineIndex === -1 ? lines.length : endIndex;
  }

  return events;
}

/**
 * Builds one normalized dashboard event from parsed magazine text.
 *
 * @param {string[]} titleLines Event title and optional translation lines.
 * @param {string} dateLine Date/location line.
 * @param {string[]} bodyLines Description lines.
 * @param {number} pageNumber Source page number.
 * @param {{sourceUrl: string, publishDate: string}} issue Current issue metadata.
 * @returns {Record<string, unknown> | null} Normalized event, or null when not parseable.
 */
function buildEvent(titleLines, dateLine, bodyLines, pageNumber, issue) {
  const parsedDate = parseDateLine(dateLine, issue.publishDate);
  if (parsedDate === null) return null;

  const cleanedTitleLines = titleLines.map(cleanLine).filter((line) => line !== "");
  const subtitle = cleanedTitleLines.find((line) => /^\(.+\)$/.test(line));
  const mainTitle = cleanedTitleLines.filter((line) => !/^\(.+\)$/.test(line)).join(" ");
  if (mainTitle === "") return null;

  const title = subtitle ? `${mainTitle} ${subtitle}` : mainTitle;
  const summary = summarize(bodyLines, title);
  const todayKey = new Date().toISOString().slice(0, 10);

  return {
    id: `kmc-${slugify(mainTitle)}-${parsedDate.date}`,
    title,
    originalTitle: mainTitle,
    summary,
    date: parsedDate.date,
    time: parsedDate.time,
    venue: parsedDate.venue,
    tags: inferTags(`${title} ${summary}`),
    familyRelevance: summarizeFamilyRelevance(`${title} ${summary}`),
    sourceUrl: `${issue.sourceUrl}#page/${pageNumber}`,
    postDate: issue.publishDate,
    lastChecked: todayKey,
    status: parsedDate.date < todayKey ? "past" : parsedDate.date > todayKey ? "upcoming" : "current",
    dateConfidence: parsedDate.hasExplicitYear ? "confirmed" : "inferred",
  };
}

/**
 * Extracts readable text lines from Issuu SVG textPath fragments.
 *
 * @param {string} svg Page SVG.
 * @param {number} pageNumber Page number.
 * @returns {string[]} Text lines in page order.
 */
function extractSvgLines(svg, pageNumber) {
  const lineMap = new Map();
  const pattern = new RegExp(
    `<textPath\\b[^>]*href="#p${pageNumber}___(\\d+)___0"[^>]*>([\\s\\S]*?)<\\/textPath>`,
    "g"
  );

  for (const match of svg.matchAll(pattern)) {
    const lineNumber = Number(match[1]);
    const text = cleanLine(match[2].replace(/<[^>]+>/g, " "));
    if (text === "") continue;

    const parts = lineMap.get(lineNumber) ?? [];
    parts.push(text);
    lineMap.set(lineNumber, parts);
  }

  return Array.from(lineMap.entries())
    .sort(([left], [right]) => left - right)
    .map(([, parts]) => cleanLine(parts.join(" ")));
}

/**
 * Parses an English date/location line from UNTERWEGS.
 *
 * @param {string} value Raw date line.
 * @param {string} issueDate Issue publish date.
 * @returns {{date: string, time: string | null, venue: string, hasExplicitYear: boolean} | null} Parsed date data.
 */
function parseDateLine(value, issueDate) {
  const monthNames = Object.keys(ENGLISH_MONTHS).join("|");
  const match = value.match(new RegExp(`^(${monthNames})\\s+(\\d{1,2})(?:\\s*[–-]\\s*\\d{1,2})?(?:,\\s*(\\d{4}))?(?:,\\s*(.*))?$`, "i"));
  if (!match) return null;

  const [, monthName, day, explicitYear, rest = ""] = match;
  const year = explicitYear ?? issueDate.slice(0, 4);
  const month = ENGLISH_MONTHS[monthName.toLowerCase()];
  const parts = rest.split(",").map((part) => part.trim()).filter(Boolean);
  const time = parts.length > 0 ? parseTime(parts[0]) : null;
  const venue = (time === null ? parts : parts.slice(1)).join(", ") || "KMC area";

  return {
    date: `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`,
    time,
    venue,
    hasExplicitYear: explicitYear !== undefined,
  };
}

/**
 * Parses a simple English time fragment.
 *
 * @param {string} value Candidate time text.
 * @returns {string | null} HH:MM time or null.
 */
function parseTime(value) {
  const match = value.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(A\s*\.?\s*M\.?|P\s*\.?\s*M\.?|AM|PM)\b/i);
  if (!match) return null;

  const [, hourValue, minuteValue = "00", meridiem] = match;
  let hour = Number(hourValue);
  if (/p/i.test(meridiem) && hour !== 12) hour += 12;
  if (/a/i.test(meridiem) && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minuteValue}`;
}

/**
 * Builds a concise source-linked summary from event body text.
 *
 * @param {string[]} bodyLines Event description lines.
 * @param {string} title Event title.
 * @returns {string} Summary text.
 */
function summarize(bodyLines, title) {
  const text = cleanLine(bodyLines.join(" "))
    .replace(/\bpartici-\s*pants\b/gi, "participants")
    .replace(/\bHörin-\s*gen\b/g, "Höringen")
    .replace(/\bExperi-\s*ence\b/g, "Experience")
    .replace(/\bmu-\s*sic\b/g, "music")
    .replace(/\bJo-\s*hannes\b/g, "Johannes")
    .replace(/\ben-\s*counters\b/g, "encounters")
    .replace(/\s+([,.;:!?])/g, "$1");
  if (text.length === 0) {
    return `${title} is listed in the Kaiserslautern American UNTERWEGS section. Open the source page to confirm details.`;
  }
  return text.length > 320 ? `${text.slice(0, 317).trim()}...` : text;
}

/**
 * Infers calendar tags from KMC event text.
 *
 * @param {string} text Event text.
 * @returns {string[]} Dashboard tags.
 */
function inferTags(text) {
  const tags = new Set(["community", "kmc"]);
  if (/kindergarten|children|family|school|kids/i.test(text)) tags.add("family");
  if (/hike|walk|forest|outdoor|race|tractor|helicopter/i.test(text)) tags.add("outdoors");
  if (/concert|music|musical|culture|parade|festival|theater|art/i.test(text)) tags.add("culture");
  return Array.from(tags);
}

/**
 * Builds the family relevance note for KMC events.
 *
 * @param {string} text Event text.
 * @returns {string} Family relevance note.
 */
function summarizeFamilyRelevance(text) {
  if (/kindergarten|children|family|school|kids/i.test(text)) {
    return "Potential family outing or kid-relevant KMC-area event; confirm details at the source.";
  }
  if (/festival|parade|music|market|race|outdoor/i.test(text)) {
    return "Potential weekend outing in the Kaiserslautern Military Community area.";
  }
  return "KMC-area public event listing; review the source page for fit and details.";
}

/**
 * Fetches text with a browser-like user agent.
 *
 * @param {string} url URL to fetch.
 * @returns {Promise<string>} Response body text.
 */
async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/**
 * Extracts a JSON string value from escaped Next.js page data.
 *
 * @param {string} html Page HTML.
 * @param {string} key JSON key.
 * @returns {string} Extracted value or empty string.
 */
function extractJsonString(html, key) {
  const match = html.match(new RegExp(`\\\\"${key}\\\\":\\\\"([^\\\\"]+)\\\\"`));
  return match ? match[1].replace(/\\u0026/g, "&") : "";
}

/**
 * Extracts a JSON number value from escaped Next.js page data.
 *
 * @param {string} html Page HTML.
 * @param {string} key JSON key.
 * @returns {string} Extracted value or empty string.
 */
function extractJsonNumber(html, key) {
  const match = html.match(new RegExp(`\\\\"${key}\\\\":(\\d+)`));
  return match ? match[1] : "";
}

/**
 * Returns how many title lines precede a date line.
 *
 * @param {string[]} lines Parsed lines.
 * @param {number} dateLineIndex Index of a date line.
 * @returns {number} Count of title lines.
 */
function collectTitleLineCount(lines, dateLineIndex) {
  let count = 0;
  for (let index = dateLineIndex - 1; index >= 0; index -= 1) {
    if (!isLikelyTitleLine(lines[index])) break;
    count += 1;
  }
  return count;
}

/**
 * Returns how many wrapped date/location lines follow a date line.
 *
 * @param {string[]} lines Parsed lines.
 * @param {number} dateLineIndex Index of a date line.
 * @param {number} endIndex End of the current event block.
 * @returns {number} Count of continuation lines.
 */
function collectDateContinuationLineCount(lines, dateLineIndex, endIndex) {
  let count = 0;
  for (let index = dateLineIndex + 1; index < Math.min(endIndex, dateLineIndex + 3); index += 1) {
    const line = lines[index];
    if (!isLikelyTitleLine(line) || isDateLine(line)) break;
    count += 1;
  }
  return count;
}

/**
 * Checks whether a line looks like title text.
 *
 * @param {string} line Candidate line.
 * @returns {boolean} True when title-like.
 */
function isLikelyTitleLine(line) {
  return /[A-ZÄÖÜ0-9]/.test(line) && /^[A-ZÄÖÜ0-9&:’'(),/. -]+$/.test(line);
}

/**
 * Checks whether a line is an English month date line.
 *
 * @param {string} line Candidate line.
 * @returns {boolean} True when date-like.
 */
function isDateLine(line) {
  return new RegExp(`^(${Object.keys(ENGLISH_MONTHS).join("|")})\\s+\\d{1,2}\\b`, "i").test(line);
}

/**
 * Filters non-event boilerplate from extracted page lines.
 *
 * @param {string} line Candidate line.
 * @returns {boolean} True when content-like.
 */
function isContentLine(line) {
  return line !== "" && !/^Kaiserslautern$|^American$|^Page\d+$|^June\d+,20\d{2}$/i.test(line);
}

/**
 * Checks whether a line is a photo credit.
 *
 * @param {string} line Candidate line.
 * @returns {boolean} True when it is a photo credit.
 */
function isPhotoCredit(line) {
  return /^Photo by /i.test(line);
}

/**
 * Normalizes text from HTML/SVG sources.
 *
 * @param {string} value Raw value.
 * @returns {string} Cleaned text.
 */
function cleanLine(value) {
  const cleaned = decodeHtml(value)
    .replace(/[]/g, "(")
    .replace(/[]/g, ")")
    .replace(/[]/g, "-")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/\b([AP])\s+\.\s*M\./g, "$1.M.")
    .replace(/\bCIT Y\b/g, "CITY")
    .replace(/\s+/g, " ")
    .trim();
  if (/^(?:[A-ZÄÖÜ]{1,2}\s+){2,}[A-ZÄÖÜ]{1,2}$/.test(cleaned)) {
    return cleaned.replace(/\s+/g, "");
  }
  return cleaned;
}

/**
 * Decodes the small set of HTML entities encountered in source pages.
 *
 * @param {string} value Encoded text.
 * @returns {string} Decoded text.
 */
function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&nbsp;/g, " ");
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
    .slice(0, 80);
}

runMain(main);
