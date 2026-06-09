import { writeFile } from "node:fs/promises";
import { URL } from "node:url";

const SOURCE_URL = "https://date.nager.at/";
const COUNTRY = "DE";
const STATE = "DE-RP";

const today = new Date();
const todayKey = today.toISOString().slice(0, 10);

const outputTargets = [
  new URL("../data/holidays.json", import.meta.url),
  new URL("../app/public/holidays.json", import.meta.url),
];

/**
 * Returns true when a holiday applies to Rheinland-Pfalz (Waldmohr).
 *
 * @param {{ global: boolean, counties: string[] | null }} holiday
 * @returns {boolean}
 */
function isRLP(holiday) {
  if (holiday.global) return true;
  return Array.isArray(holiday.counties) && holiday.counties.includes(STATE);
}

/**
 * Fetches public holidays for one year and normalizes to DashboardEvent records.
 *
 * @param {number} year
 * @returns {Promise<object[]>}
 */
async function fetchYear(year) {
  const response = await fetch(`${SOURCE_URL}api/v3/PublicHolidays/${year}/${COUNTRY}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch holidays for ${year}: ${response.status} ${response.statusText}`);
  }
  const holidays = await response.json();

  return holidays
    .filter(isRLP)
    .filter((h) => h.date >= todayKey)
    .map((h) => ({
      id: `holiday-${h.countryCode}-${STATE}-${h.date}`,
      title: h.name,
      originalTitle: h.localName,
      summary: `Public holiday in Rheinland-Pfalz. Most businesses and offices closed.`,
      date: h.date,
      time: null,
      venue: "Waldmohr",
      tags: ["holiday"],
      familyRelevance: "Public holiday — plan ahead for closures.",
      sourceUrl: `${SOURCE_URL}CountryInfo/DE`,
      postDate: todayKey,
      lastChecked: todayKey,
      status: "upcoming",
      dateConfidence: "confirmed",
    }));
}

/**
 * Fetches German (Rheinland-Pfalz) public holidays for the current and next
 * year, deduplicates, and writes normalized JSON to data/ and app/public/.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const currentYear = today.getFullYear();
  const [thisYear, nextYear] = await Promise.all([
    fetchYear(currentYear),
    fetchYear(currentYear + 1),
  ]);

  const seen = new Set();
  const events = [...thisYear, ...nextYear]
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    events,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await Promise.all(outputTargets.map((t) => writeFile(t, json)));

  console.log(`Refreshed ${events.length} RLP public holidays to ${outputTargets.length} JSON files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
