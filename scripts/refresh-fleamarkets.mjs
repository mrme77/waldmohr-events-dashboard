import { writeFile } from "node:fs/promises";
import { URL } from "node:url";

const SOURCE_URL =
  "https://www.homburg.de/rathaus/aktuelle-informationen/pressemitteilungen/flohmarkt-jahr-startet-am-3-januar-rund-ums-forum/";

// Official 2026 dates published by Homburger Kultur gGmbH. The market is
// normally the first Saturday of the month, but holidays and parallel events
// shift it (e.g. 2026-04-11 and 2026-10-10), so the rule alone is not enough —
// keep this table in sync with the city's announcement each year.
const MARKET_DATES = [
  "2026-01-03",
  "2026-02-07",
  "2026-03-07",
  "2026-04-11",
  "2026-05-02",
  "2026-06-06",
  "2026-07-04",
  "2026-08-01",
  "2026-09-05",
  "2026-10-10",
  "2026-11-07",
  "2026-12-05",
];

const LOW_DATE_WARNING_THRESHOLD = 3;

const today = new Date();
const todayKey = today.toISOString().slice(0, 10);

const outputTargets = [
  new URL("../data/fleamarkets.json", import.meta.url),
  new URL("../app/public/fleamarkets.json", import.meta.url),
];

/**
 * Builds a normalized DashboardEvent for one Homburg flea market date.
 *
 * @param {string} date ISO date (YYYY-MM-DD).
 * @returns {object}
 */
function toEvent(date) {
  return {
    id: `fleamarket-homburg-${date}`,
    title: "Homburg Flea & Antiques Market",
    originalTitle: "Floh- und Antiquitätenmarkt Homburg",
    summary:
      "Largest flea and antiques market in southwest Germany, around the Forum in Homburg. 08:00–16:00.",
    date,
    time: "08:00",
    venue: "Rund ums Forum, Homburg",
    tags: ["fun", "fleamarket"],
    familyRelevance: "Browse secondhand finds and antiques — about 15 minutes from Waldmohr.",
    sourceUrl: SOURCE_URL,
    postDate: todayKey,
    lastChecked: todayKey,
    status: date < todayKey ? "past" : date > todayKey ? "upcoming" : "current",
    dateConfidence: "confirmed",
  };
}

/**
 * Writes all Homburg flea market dates (past ones included, so the calendar
 * can show them grayed out) as normalized JSON to data/ and app/public/.
 * Warns when the hardcoded date table is nearly exhausted so the next year's
 * official announcement gets folded in before the feed runs dry.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const events = MARKET_DATES.map(toEvent);
  const upcomingCount = events.filter((e) => e.status !== "past").length;

  if (upcomingCount === 0) {
    throw new Error(
      `No upcoming flea market dates left in MARKET_DATES — add the new year's official dates from ${SOURCE_URL}`
    );
  }
  if (upcomingCount < LOW_DATE_WARNING_THRESHOLD) {
    console.warn(
      `Only ${upcomingCount} upcoming flea market date(s) remain — check homburg.de for next year's announcement.`
    );
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    events,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await Promise.all(outputTargets.map((t) => writeFile(t, json)));

  console.log(`Refreshed ${events.length} flea market dates to ${outputTargets.length} JSON files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
