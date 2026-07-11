import { URL } from "node:url";
import { fetchTextWithRetry } from "./fetch-text.mjs";
import { writeJson, runMain } from "./lib.mjs";

const apiUrl = "https://www.waldmohr-aktuell.de/wp-json/wp/v2/posts?per_page=50&_embed=1";
const eventCategoryIds = new Set([7, 111, 113, 115]);
const today = new Date();
const todayKey = today.toISOString().slice(0, 10);
const maxFutureDays = 180;
const output = new URL("../app/public/events.json", import.meta.url);

/**
 * Pulls public Waldmohr Aktuell posts and writes normalized candidate event files.
 *
 * @returns {Promise<void>} Resolves after files are written.
 */
async function main() {
  const body = await fetchTextWithRetry(apiUrl, {
    headers: { "User-Agent": "waldmohr-events-dashboard/0.1 personal household dashboard" },
    attempts: 3,
  });
  const posts = JSON.parse(body);
  if (!Array.isArray(posts)) {
    throw new TypeError(`WordPress posts response from ${apiUrl} was not an array.`);
  }
  const candidates = posts.filter(isEventCandidate).map(normalizePost);
  const events = candidates
    .filter((event) => event !== null)
    .sort((left, right) => right.date.localeCompare(left.date));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "https://www.waldmohr-aktuell.de/",
    events
  };

  await writeJson(output, payload);

  console.log(`Refreshed ${events.length} live events from ${candidates.length} candidates.`);
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
  // No word boundaries: German compounds (Marktplatzfest, Weihnachtsmarkt)
  // never match \b-delimited keywords. A date is still required downstream,
  // so the looser net stays safe.
  const eventWords = /(veranstaltung|fest(?!leg)|markt|wanderung|exkursion|museumstag|sitzung|konzert|boerse|börse|programm|vortrag|kerb|kerwe|kirmes|dinner|theater)/i;

  return categoryIds.some((id) => eventCategoryIds.has(id)) || eventWords.test(text);
}

/**
 * Normalizes a WordPress post into the local event schema.
 *
 * @param {Record<string, unknown>} post WordPress post.
 * @returns {Record<string, unknown> | null} Normalized event, or null when not display-safe.
 */
function normalizePost(post) {
  const title = stripHtml(post.title?.rendered ?? "Untitled event");
  const text = stripHtml(`${post.excerpt?.rendered ?? ""} ${post.content?.rendered ?? ""}`);
  const postDate = String(post.date ?? "").slice(0, 10);
  const candidateDate = extractDate(`${title} ${text}`, postDate);
  if (candidateDate === null || !isDisplayableEventDate(candidateDate)) {
    return null;
  }

  const tags = inferTags(`${title} ${text}`, Array.isArray(post.categories) ? post.categories : []);
  const englishTitle = translateTitle(title);

  return {
    id: String(post.slug ?? `post-${post.id}`),
    title: englishTitle,
    originalTitle: title,
    summary: summarizeEvent(englishTitle, tags),
    date: candidateDate,
    time: extractTime(`${title} ${text}`),
    venue: extractVenue(text),
    tags,
    familyRelevance: summarizeFamilyRelevance(tags),
    sourceUrl: String(post.link ?? "https://www.waldmohr-aktuell.de/"),
    postDate,
    lastChecked: new Date().toISOString().slice(0, 10),
    status: classifyStatus(candidateDate),
    dateConfidence: "inferred"
  };
}

const GERMAN_MONTHS = {
  januar: 1, februar: 2, "märz": 3, maerz: 3, april: 4, mai: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
};

/**
 * Extracts a German-style date from text. Handles numeric form (17.06.2026)
 * and prose form (1. Mai 2026); prose without a year ("17. Mai") assumes the
 * post's year, rolling forward when that lands well before the post date.
 *
 * @param {string} text Source text.
 * @param {string} postDate Post date as YYYY-MM-DD, anchor for missing years.
 * @returns {string | null} ISO date or null.
 */
function extractDate(text, postDate) {
  const numeric = text.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
  if (numeric) {
    const [, day, month, year] = numeric;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const monthNames = Object.keys(GERMAN_MONTHS).join("|");
  const prose = text.match(new RegExp(`\\b(\\d{1,2})\\.\\s*(${monthNames})\\.?(?:\\s*(20\\d{2}))?\\b`, "i"));
  if (!prose) return null;

  const [, day, monthName, explicitYear] = prose;
  const month = GERMAN_MONTHS[monthName.toLowerCase()];
  const postYear = Number(postDate.slice(0, 4)) || today.getFullYear();
  let year = explicitYear ? Number(explicitYear) : postYear;
  let key = `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
  // A yearless date far behind its own post is almost certainly next year's.
  if (!explicitYear && key < postDate) {
    year += 1;
    key = `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return key;
}

/**
 * Returns true when the inferred event date is safe enough for the live kiosk.
 *
 * @param {string} eventDate Event date as YYYY-MM-DD.
 * @returns {boolean} True when the event should be displayed.
 */
function isDisplayableEventDate(eventDate) {
  if (eventDate < todayKey) return false;

  const eventTime = Date.parse(`${eventDate}T12:00:00Z`);
  const todayTime = Date.parse(`${todayKey}T12:00:00Z`);
  if ([eventTime, todayTime].some(Number.isNaN)) return false;

  const daysFromToday = Math.round((eventTime - todayTime) / 86_400_000);
  return daysFromToday <= maxFutureDays;
}

/**
 * Extracts a simple time value from text.
 *
 * @param {string} text Source text.
 * @returns {string | null} Time or null.
 */
function extractTime(text) {
  const match = text.match(/\b(\d{1,2})(?::(\d{2})|\s*Uhr(?:\s*(\d{2}))?)\b/i);
  if (!match) return null;

  const hour = match[1].padStart(2, "0");
  const minute = (match[2] ?? match[3] ?? "00").padStart(2, "0");
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
 * Applies conservative, rule-based English title cleanup.
 *
 * @param {string} title Original German title.
 * @returns {string} English-first display title.
 */
function translateTitle(title) {
  const replacements = [
    [/^int\.\s*museumstag$/i, "International Museum Day"],
    [/kinder\s+und\s+familien\s+fest/i, "Children and Family Festival"],
    [/marktplatzfest(?:es)?/i, "Marketplace Festival"],
    [/flyer\s+und\s+programm/i, "Flyer and Program"],
    [/sitzung\s+des\s+stadtrates/i, "Town Council Meeting"],
    [/gef[uü]hrte\s+wanderung/i, "Guided Walk"],
    [/historischen?\s+grubenweg/i, "Historic Mining Trail"],
    [/pflanzenb[oö]rse/i, "Plant Exchange"],
    [/einladung\s+zum\s+kostenlosen\s+vortrag/i, "Free Public Talk"],
    [/museumstag/i, "Museum Day"],
    [/krimidinner/i, "Mystery Dinner"],
    [/\bam\b/i, "on"],
    [/\bund\b/i, "and"],
    [/\bdes\b/i, "of the"],
    [/\bder\b/i, "of the"]
  ];

  return replacements.reduce((current, [pattern, replacement]) => {
    return current.replace(pattern, replacement);
  }, title);
}

/**
 * Builds a short English summary without pretending to machine-translate the source.
 *
 * @param {string} title English display title.
 * @param {string[]} tags Dashboard tags.
 * @returns {string} English summary.
 */
function summarizeEvent(title, tags) {
  const tagText = tags.filter((tag) => tag !== "community").join(", ");
  const focus = tagText.length > 0 ? ` It may be relevant for ${tagText} planning.` : "";
  return `${title} is a public Waldmohr Aktuell source item.${focus} The event date was inferred from explicit source text. Open the source link for the full German details.`;
}

/**
 * Builds a family relevance note from event tags.
 *
 * @param {string[]} tags Dashboard tags.
 * @returns {string} Family relevance note.
 */
function summarizeFamilyRelevance(tags) {
  if (tags.includes("family")) return "Potential family outing or kid-relevant local event; confirm details at the source.";
  if (tags.includes("civic")) return "Useful for understanding local decisions, services, and town priorities after moving.";
  if (tags.includes("outdoors")) return "Potential orientation to local nature areas, walks, or outdoor clubs.";
  if (tags.includes("culture")) return "Good candidate for learning local culture, history, or community traditions.";
  if (tags.includes("library")) return "Potentially useful for family reading, language practice, or local library services.";
  if (tags.includes("clubs")) return "Useful for discovering local clubs and community groups.";
  return "Review this public source item for newcomer relevance.";
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

runMain(main);
