import { writeFile } from "node:fs/promises";
import { URL } from "node:url";

const userAgent = "waldmohr-events-dashboard/0.1 personal household dashboard";
const maxItemsPerSource = 6;
const outputTargets = [
  new URL("../data/news.json", import.meta.url),
  new URL("../app/public/news.json", import.meta.url)
];

const sources = [
  {
    id: "usa",
    label: "USA",
    name: "NPR News",
    url: "https://feeds.npr.org/1001/rss.xml"
  },
  {
    id: "stl",
    label: "St. Louis",
    name: "KSDK Local",
    url: "https://www.ksdk.com/feeds/syndication/rss/news/local"
  }
];

/**
 * Fetches keyless RSS sources and writes cached headline payloads.
 *
 * @returns {Promise<void>} Resolves after payload files are written.
 */
async function main() {
  const results = await Promise.allSettled(sources.map(loadSource));
  const failures = results
    .map((result, index) => ({ result, source: sources[index] }))
    .filter(({ result }) => result.status === "rejected");

  failures.forEach(({ result, source }) => {
    const reason = result.status === "rejected" ? result.reason : "unknown error";
    console.error(`Failed to refresh ${source.name}: ${reason instanceof Error ? reason.message : String(reason)}`);
  });

  const items = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));

  if (items.length === 0) {
    throw new Error("No news items were refreshed from RSS sources.");
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: sources.map(({ id, label, name, url }) => ({ id, label, name, url })),
    items
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await Promise.all(outputTargets.map((target) => writeFile(target, json)));
  console.log(`Refreshed ${items.length} news headlines to ${outputTargets.length} JSON files.`);
}

/**
 * Loads and normalizes one RSS source.
 *
 * @param {{id: string, label: string, name: string, url: string}} source RSS source.
 * @returns {Promise<Array<Record<string, string>>>} Normalized news items.
 */
async function loadSource(source) {
  const response = await fetch(source.url, {
    headers: { "User-Agent": userAgent }
  });
  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseRssItems(xml).slice(0, maxItemsPerSource).map((item, index) => ({
    id: `${source.id}-${slugify(item.title)}-${index}`,
    sourceId: source.id,
    sourceLabel: source.label,
    sourceName: source.name,
    title: item.title,
    url: item.link,
    publishedAt: item.pubDate,
    lastChecked: new Date().toISOString()
  }));
}

/**
 * Extracts basic RSS item fields without adding a parser dependency.
 *
 * @param {string} xml RSS XML string.
 * @returns {Array<{title: string, link: string, pubDate: string}>} Parsed items.
 */
function parseRssItems(xml) {
  const matches = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  return matches
    .map((itemXml) => ({
      title: decodeXml(readTag(itemXml, "title")),
      link: decodeXml(readTag(itemXml, "link")),
      pubDate: normalizeDate(decodeXml(readTag(itemXml, "pubDate")))
    }))
    .filter((item) => item.title.length > 0 && item.link.startsWith("https://") && item.pubDate.length > 0);
}

/**
 * Reads a tag's text content from an RSS item.
 *
 * @param {string} xml RSS item XML.
 * @param {string} tag Tag name.
 * @returns {string} Raw tag content.
 */
function readTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripCdata(match[1]).trim() : "";
}

/**
 * Removes XML CDATA wrappers.
 *
 * @param {string} value XML text.
 * @returns {string} Plain text.
 */
function stripCdata(value) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

/**
 * Decodes the XML entities that commonly appear in RSS headlines.
 *
 * @param {string} value Encoded XML text.
 * @returns {string} Decoded text.
 */
function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts an RSS pubDate into an ISO timestamp.
 *
 * @param {string} value RSS pubDate value.
 * @returns {string} ISO timestamp or an empty string when invalid.
 */
function normalizeDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

/**
 * Creates a short stable id fragment from a headline.
 *
 * @param {string} value Source headline.
 * @returns {string} Slug fragment.
 */
function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "headline";
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
