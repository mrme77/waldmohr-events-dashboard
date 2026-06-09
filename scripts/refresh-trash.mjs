import { writeFile } from "node:fs/promises";
import { URL } from "node:url";

const WALDMOHR_ID = "57616c646d6f6872";
const WASTE_TYPES = "8,3,7,6,1,5";
const SOURCE_URL = "https://abfallwirtschaft.landkreis-kusel.de/";

const today = new Date();
const todayKey = today.toISOString().slice(0, 10);
const endDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
  .toISOString()
  .slice(0, 10);

const icsUrl = `${SOURCE_URL}ical?location=${WALDMOHR_ID}&wasteTypes=${WASTE_TYPES}&startDate=${todayKey}&endDate=${endDate}`;

const outputTargets = [
  new URL("../data/trash.json", import.meta.url),
  new URL("../app/public/trash.json", import.meta.url),
];

/** Human-friendly names and summaries for each waste type keyword. */
const WASTE_MAP = {
  "Bioabfall": {
    title: "Organic Waste (Bioabfall)",
    tag: "bioabfall",
    summary: "Bioabfall collection day. Put your organic waste bin out the night before.",
  },
  "Restmüll": {
    title: "General Waste (Restmüll)",
    tag: "restmuell",
    summary: "Restmüll (general waste) collection day. Put the grey bin out the night before.",
  },
  "LVP-Abfälle": {
    title: "Plastic & Packaging (Gelbe Säcke)",
    tag: "lvp",
    summary: "Yellow bag (Gelbe Säcke) collection day. Put yellow bags out the night before.",
  },
  "Papier": {
    title: "Paper Collection (Blaue Tonne)",
    tag: "papier",
    summary: "Paper and cardboard collection day (Blaue Tonne).",
  },
  "Glas": {
    title: "Glass Collection (Weisse Säcke)",
    tag: "glas",
    summary: "Glass collection day (Weisse Säcke).",
  },
  "Umweltmobil": {
    title: "Mobile Recycling (Umweltmobil)",
    tag: "umweltmobil",
    summary: "Mobile recycling unit (Umweltmobil) visiting Waldmohr.",
  },
};

/**
 * Parses a VCALENDAR ICS string into normalized DashboardEvent records.
 *
 * @param {string} icsText Raw ICS file content.
 * @returns {import("../app/src/types.js").DashboardEvent[]} Sorted event array.
 */
function parseIcs(icsText) {
  const events = [];
  const blocks = icsText.split("BEGIN:VEVENT").slice(1);

  for (const block of blocks) {
    const uid = (block.match(/^UID:(.+)$/m) ?? [])[1]?.trim() ?? crypto.randomUUID();
    const summary = (block.match(/^SUMMARY:(.+)$/m) ?? [])[1]?.trim() ?? "";
    const dtstart = (block.match(/^DTSTART[^:]*:(\d{8})/m) ?? [])[1] ?? "";

    if (!dtstart) continue;
    const date = `${dtstart.slice(0, 4)}-${dtstart.slice(4, 6)}-${dtstart.slice(6, 8)}`;

    const wasteKey = Object.keys(WASTE_MAP).find((k) => summary.includes(k));
    const wasteInfo = wasteKey ? WASTE_MAP[wasteKey] : null;

    events.push({
      id: `trash-${uid}`,
      title: wasteInfo?.title ?? summary.replace(/\s*\(\)\s*$/, ""),
      originalTitle: summary,
      summary: wasteInfo?.summary ?? `Waste collection day: ${summary}`,
      date,
      time: null,
      venue: "Waldmohr",
      tags: ["trash", ...(wasteInfo ? [wasteInfo.tag] : [])],
      familyRelevance: "Put bins out the night before.",
      sourceUrl: SOURCE_URL,
      postDate: todayKey,
      lastChecked: todayKey,
      status: "upcoming",
      dateConfidence: "confirmed",
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Fetches Waldmohr trash collection schedule from Landkreis Kusel and writes
 * normalized JSON to data/ and app/public/.
 *
 * @returns {Promise<void>} Resolves after files are written.
 */
async function main() {
  const response = await fetch(icsUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch trash ICS: ${response.status} ${response.statusText}`);
  }

  const icsText = await response.text();
  const events = parseIcs(icsText);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    events,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await Promise.all(outputTargets.map((t) => writeFile(t, json)));

  console.log(
    `Refreshed ${events.length} trash collection events to ${outputTargets.length} JSON files.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
