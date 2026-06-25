import { fetchTextWithRetry } from "./fetch-text.mjs";

export const KAISERSLAUTERN_AMERICAN_URL = "https://www.kaiserslauternamerican.com/";
export const ISSUU_DOC_BASE_URL = "https://issuu.com/advantinews/docs/";
export const USER_AGENT =
  "Mozilla/5.0 (compatible; WaldmohrEventsDashboard/0.1; +https://www.kaiserslauternamerican.com/)";
export const FETCH_TIMEOUT_MS = 20_000;

/**
 * Finds the current Kaiserslautern American Issuu issue from the homepage embed.
 *
 * @returns {Promise<{slug: string, sourceUrl: string, title: string, revisionId: string, publicationId: string, pageCount: number, publishDate: string}>}
 */
export async function fetchCurrentIssue() {
  const homepage = await fetchKmcText(KAISERSLAUTERN_AMERICAN_URL);
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
  const documentHtml = await fetchKmcText(sourceUrl);
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
 * Fetches readable SVG text for every page in an Issuu issue.
 *
 * @param {{revisionId: string, publicationId: string, pageCount: number}} issue Current issue metadata.
 * @param {(pageNumber: number, pageCount: number) => void} [onProgress] Progress callback.
 * @returns {Promise<Array<{pageNumber: number, lines: string[]}>>} Readable page text.
 */
export async function fetchIssuePages(issue, onProgress = () => {}) {
  const pages = [];
  for (let pageNumber = 1; pageNumber <= issue.pageCount; pageNumber += 1) {
    const svg = await fetchKmcText(buildPageSvgUrl(issue, pageNumber));
    pages.push({
      pageNumber,
      lines: extractSvgLines(svg, pageNumber),
    });
    onProgress(pageNumber, issue.pageCount);
  }
  return pages;
}

/**
 * Builds the Issuu SVG URL for one page.
 *
 * @param {{revisionId: string, publicationId: string}} issue Current issue metadata.
 * @param {number} pageNumber One-based page number.
 * @returns {string} SVG page URL.
 */
export function buildPageSvgUrl(issue, pageNumber) {
  return `https://svg.issuu.com/${issue.revisionId}-${issue.publicationId}/page_${pageNumber}.svg`;
}

/**
 * Extracts readable text lines from Issuu SVG textPath fragments.
 *
 * @param {string} svg Page SVG.
 * @param {number} pageNumber Page number.
 * @returns {string[]} Text lines in page order.
 */
export function extractSvgLines(svg, pageNumber) {
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
 * Normalizes text from HTML/SVG sources.
 *
 * @param {string} value Raw value.
 * @returns {string} Cleaned text.
 */
export function cleanLine(value) {
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
export function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&nbsp;/g, " ");
}

/**
 * Fetches text with a browser-like user agent.
 *
 * @param {string} url URL to fetch.
 * @returns {Promise<string>} Response body text.
 */
export async function fetchKmcText(url) {
  return fetchTextWithRetry(url, {
    headers: { "user-agent": USER_AGENT },
    timeoutMs: FETCH_TIMEOUT_MS,
  });
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
