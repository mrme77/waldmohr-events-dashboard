import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { URL, fileURLToPath } from "node:url";
import { writeJson, runMain } from "./lib.mjs";

// Private Google Calendar iCal feed. The secret URL lives in .env as
// GCAL_ICS_URL and must never appear in committed files or in the generated
// JSON — outputs below are gitignored and sourceUrl is a generic link.
const PUBLIC_SOURCE_LABEL = "https://calendar.google.com/";

const PAST_WINDOW_DAYS = 7;
const FUTURE_WINDOW_DAYS = 180;
const MULTIDAY_CAP_DAYS = 30;

const berlinDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
});
const berlinTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hour12: false,
});

const today = new Date();
const todayKey = berlinDateKey(today);

const output = new URL("../app/public/family.json", import.meta.url);

/** Formats a Date as a Berlin-local YYYY-MM-DD key. */
function berlinDateKey(date) {
  return berlinDate.format(date);
}

/**
 * Resolves the feed location: GCAL_ICS_URL from the environment, falling back
 * to parsing the repo-root .env. A plain filesystem path is also accepted so
 * the parser can be tested against a fixture without the real secret.
 *
 * @returns {Promise<string|null>}
 */
async function resolveFeedLocation() {
  if (process.env.GCAL_ICS_URL) return process.env.GCAL_ICS_URL;
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));
  if (!existsSync(envPath)) return null;
  const text = await readFile(envPath, "utf8");
  const match = text.match(/^GCAL_ICS_URL=(.+)$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

/**
 * Fetches the raw ICS text from an https URL or reads it from a local path.
 *
 * @param {string} location
 * @returns {Promise<string>}
 */
async function fetchIcs(location) {
  if (!location.startsWith("http")) return readFile(location, "utf8");
  const response = await fetch(location);
  if (!response.ok) {
    throw new Error(`Failed to fetch family calendar: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

// Google's "secret address" ICS export for accounts with many subscribed
// calendars has been observed returning a different partial snapshot on each
// request (same byte size, different VEVENTs) rather than the full feed.
// Fetching a few times and unioning by UID makes the cache resilient to that.
const FETCH_ATTEMPTS = 3;

/**
 * Fetches the ICS feed (repeatedly, for http(s) sources) and returns the
 * union of VEVENTs seen across attempts, keyed by UID + RECURRENCE-ID so a
 * detached override and its master aren't merged into one.
 *
 * @param {string} location
 * @returns {Promise<Array<Map<string, string[]>>>}
 */
async function fetchVeventsUnion(location) {
  if (!location.startsWith("http")) return parseVevents(await fetchIcs(location));

  const attempts = await Promise.all(
    Array.from({ length: FETCH_ATTEMPTS }, () => fetchIcs(location).then(parseVevents))
  );

  const byKey = new Map();
  for (const vevents of attempts) {
    for (const vevent of vevents) {
      const uid = prop(vevent, "UID")?.value ?? "";
      const recurrence = prop(vevent, "RECURRENCE-ID")?.value ?? "";
      byKey.set(`${uid}::${recurrence}`, vevent);
    }
  }
  return [...byKey.values()];
}

/**
 * Unfolds ICS continuation lines and splits a feed into VEVENT property maps.
 * Property parameters (e.g. DTSTART;VALUE=DATE) are kept on the key.
 *
 * @param {string} ics
 * @returns {Array<Map<string, string[]>>}
 */
function parseVevents(ics) {
  const lines = ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { current = new Map(); continue; }
    if (line === "END:VEVENT") { if (current) events.push(current); current = null; continue; }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const bucket = current.get(key) ?? [];
    bucket.push(value);
    current.set(key, bucket);
  }
  return events;
}

/** Returns the first value for a property name, ignoring parameters. */
function prop(event, name) {
  for (const [key, values] of event) {
    if (key === name || key.startsWith(`${name};`)) return { key, value: values[0] };
  }
  return null;
}

/**
 * Parses an ICS date or datetime into { key, time, allDay } in Berlin time.
 * Naive datetimes with a TZID are assumed Europe/Berlin (the family calendar's
 * zone) — full VTIMEZONE resolution is intentionally out of scope.
 *
 * @param {{key: string, value: string} | null} field
 * @returns {{ key: string, time: string | null, allDay: boolean } | null}
 */
function parseIcsDate(field) {
  if (!field) return null;
  const raw = field.value;
  if (field.key.includes("VALUE=DATE") || /^\d{8}$/.test(raw)) {
    return { key: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`, time: null, allDay: true };
  }
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (z === "Z") {
    const utc = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
    return { key: berlinDateKey(utc), time: berlinTime.format(utc), allDay: false };
  }
  return { key: `${y}-${mo}-${d}`, time: `${h}:${mi}`, allDay: false };
}

/** Shifts a YYYY-MM-DD key by whole days. */
function shiftDays(key, days) {
  const [y, m, d] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

const WEEKDAY_CODES = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 };

/**
 * Expands an RRULE into concrete YYYY-MM-DD occurrence keys inside the window.
 * Supports FREQ DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL, COUNT, UNTIL and
 * BYDAY (weekly only) — covering typical Google family-calendar recurrences.
 *
 * @param {string} startKey
 * @param {string} rrule
 * @param {string} windowStart
 * @param {string} windowEnd
 * @returns {string[]}
 */
function expandRrule(startKey, rrule, windowStart, windowEnd) {
  const parts = Object.fromEntries(rrule.split(";").map((p) => p.split("=")));
  const freq = parts.FREQ;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return [startKey];
  const interval = Number(parts.INTERVAL ?? 1);
  const count = parts.COUNT ? Number(parts.COUNT) : Infinity;
  const until = parts.UNTIL ? parseIcsDate({ key: "DTSTART", value: parts.UNTIL })?.key : null;
  const byday = freq === "WEEKLY" && parts.BYDAY
    ? parts.BYDAY.split(",").map((c) => WEEKDAY_CODES[c]).filter((n) => n !== undefined)
    : null;

  const keys = [];
  let cursor = startKey;
  let emitted = 0;
  for (let guard = 0; guard < 1000 && emitted < count; guard++) {
    const stepKeys = [];
    if (byday) {
      // Walk each day of the cursor week, keeping the BYDAY weekdays.
      for (let d = 0; d < 7; d++) {
        const dayKey = shiftDays(cursor, d);
        const weekday = new Date(`${dayKey}T12:00:00Z`).getUTCDay();
        if (byday.includes(weekday) && dayKey >= startKey) stepKeys.push(dayKey);
      }
    } else {
      stepKeys.push(cursor);
    }
    for (const key of stepKeys) {
      if (emitted >= count) break;
      emitted += 1;
      if (until && key > until) return keys;
      if (key > windowEnd) return keys;
      if (key >= windowStart) keys.push(key);
    }
    if (freq === "DAILY") cursor = shiftDays(cursor, interval);
    else if (freq === "WEEKLY") cursor = shiftDays(cursor, 7 * interval);
    else {
      const [y, m, d] = cursor.split("-").map(Number);
      const next = freq === "MONTHLY"
        ? new Date(Date.UTC(y, m - 1 + interval, d))
        : new Date(Date.UTC(y + interval, m - 1, d));
      cursor = next.toISOString().slice(0, 10);
    }
    if (cursor > windowEnd && !until) return keys;
  }
  return keys;
}

/** Collects EXDATE day keys for one VEVENT. */
function exdateKeys(event) {
  const keys = new Set();
  for (const [key, values] of event) {
    if (!key.startsWith("EXDATE")) continue;
    for (const value of values) {
      for (const raw of value.split(",")) {
        const parsed = parseIcsDate({ key, value: raw });
        if (parsed) keys.add(parsed.key);
      }
    }
  }
  return keys;
}

const MAX_SUMMARY_LENGTH = 300;

const NAMED_ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&apos;": "'", "&nbsp;": " ",
};

/**
 * Converts an ICS text value to clean plain text: unescapes ICS sequences,
 * strips HTML tags (Google Calendar descriptions often carry markup from
 * invite emails), decodes entities, and collapses whitespace.
 */
function cleanText(value) {
  return value
    .replaceAll("\\n", " ").replaceAll("\\,", ",").replaceAll("\\;", ";")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&[a-z]+;/gi, (m) => NAMED_ENTITIES[m.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/** Truncates text at a word boundary to keep the detail popover readable. */
function truncate(value, max) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}

/**
 * Normalizes one VEVENT into zero or more DashboardEvent records within the
 * window: recurring events are expanded, multi-day all-day events emit one
 * record per day (capped), and detached RECURRENCE-ID instances pass through.
 *
 * @param {Map<string, string[]>} vevent
 * @param {string} windowStart
 * @param {string} windowEnd
 * @param {Map<string, Set<string>>} overridesByUid Detached RECURRENCE-ID
 *   original dates per UID; the master expansion skips those instances.
 * @returns {object[]}
 */
function normalizeVevent(vevent, windowStart, windowEnd, overridesByUid) {
  const start = parseIcsDate(prop(vevent, "DTSTART"));
  if (!start) return [];
  const status = prop(vevent, "STATUS")?.value;
  if (status === "CANCELLED") return [];

  const summary = cleanText(prop(vevent, "SUMMARY")?.value ?? "Family event");
  const location = cleanText(prop(vevent, "LOCATION")?.value ?? "");
  const description = truncate(cleanText(prop(vevent, "DESCRIPTION")?.value ?? ""), MAX_SUMMARY_LENGTH);
  // Meeting-link locations read badly as a venue; show "Online" and make the
  // link itself the source so the popover's source button opens it.
  const locationIsUrl = /^https?:\/\//.test(location);
  // Leave/vacation days get their own calendar marker (square, --cat-leave).
  const isLeave = /\b(leave|vacation|urlaub|pto)\b/i.test(summary);
  const tags = isLeave ? ["family", "leave"] : ["family"];
  const uid = prop(vevent, "UID")?.value ?? `${summary}-${start.key}`;
  const isDetached = prop(vevent, "RECURRENCE-ID") !== null;
  const rrule = prop(vevent, "RRULE")?.value;
  const excluded = exdateKeys(vevent);
  for (const key of (!isDetached && overridesByUid.get(uid)) || []) excluded.add(key);

  let dayKeys;
  if (rrule && !isDetached) {
    dayKeys = expandRrule(start.key, rrule, windowStart, windowEnd).filter((k) => !excluded.has(k));
  } else if (start.allDay) {
    const end = parseIcsDate(prop(vevent, "DTEND"));
    // DTEND on all-day events is exclusive; span the real days, capped.
    const lastKey = end ? shiftDays(end.key, -1) : start.key;
    dayKeys = [];
    for (let k = start.key, i = 0; k <= lastKey && i < MULTIDAY_CAP_DAYS; k = shiftDays(k, 1), i++) {
      dayKeys.push(k);
    }
  } else {
    dayKeys = [start.key];
  }

  return dayKeys
    .filter((key) => key >= windowStart && key <= windowEnd)
    .map((key) => ({
      id: `family-${uid}-${key}`,
      title: summary,
      originalTitle: summary,
      summary: description || "Family calendar event.",
      date: key,
      time: start.time,
      venue: locationIsUrl ? "Online" : location || "Family",
      tags,
      familyRelevance: "From the family Google Calendar.",
      sourceUrl: locationIsUrl ? location : PUBLIC_SOURCE_LABEL,
      postDate: todayKey,
      lastChecked: todayKey,
      status: key < todayKey ? "past" : key > todayKey ? "upcoming" : "current",
      dateConfidence: "confirmed",
    }));
}

/**
 * Fetches the private family iCal feed and writes normalized JSON to the
 * gitignored app/public/family.json cache. Exits quietly when GCAL_ICS_URL is
 * not configured so the shared refresh chain still works on machines without
 * the secret.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const location = await resolveFeedLocation();
  if (!location) {
    console.log("Family calendar skipped — set GCAL_ICS_URL in .env to enable.");
    return;
  }

  const windowStart = shiftDays(todayKey, -PAST_WINDOW_DAYS);
  const windowEnd = shiftDays(todayKey, FUTURE_WINDOW_DAYS);

  // Detached overrides (RECURRENCE-ID) replace their generated instance: the
  // master expansion skips the original date and the detached VEVENT itself
  // contributes the (possibly moved/edited) replacement.
  const vevents = await fetchVeventsUnion(location);
  const overridesByUid = new Map();
  for (const v of vevents) {
    const recurrence = parseIcsDate(prop(v, "RECURRENCE-ID"));
    const uid = prop(v, "UID")?.value;
    if (!recurrence || !uid) continue;
    const set = overridesByUid.get(uid) ?? new Set();
    set.add(recurrence.key);
    overridesByUid.set(uid, set);
  }

  const events = vevents
    .flatMap((v) => normalizeVevent(v, windowStart, windowEnd, overridesByUid))
    .filter((e, i, all) => all.findIndex((o) => o.id === e.id) === i)
    .sort((a, b) => a.date.localeCompare(b.date));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: PUBLIC_SOURCE_LABEL,
    events,
  };

  await writeJson(output, payload);

  console.log(`Refreshed ${events.length} family events.`);
}

runMain(main);
