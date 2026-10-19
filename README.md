# Waldmohr Events Dashboard

A local, English-first events board for an American family living in the Kaiserslautern Military
Community (KMC) area of Rhineland-Palatinate, Germany. It turns public German event posts into a
glanceable, source-linked calendar.

> **Status: running on the Raspberry Pi.** GitHub Actions refreshes public data daily; an hourly
> systemd timer on the Pi builds and deploys it to Nginx. Remaining automation work: refresh the
> private family calendar on the Pi and have the open dashboard reload updated JSON automatically.

## What it does (v2 vision)

A single-page, high-contrast "Civic Departure Board" designed for an always-on wall display:

- **Calendar** of local events, colored by category, tap a day for details + source link.
- **News marquee** across the top (USA + St. Louis RSS cache, 80-second scroll).
- **Dual clocks** — Napoli and St. Louis / Central.
- **Weather** for Waldmohr via Open-Meteo.
- **Seven-day forecast** for Waldmohr, opened by tapping the current-weather card.
- **Nearby in Homburg** panel with the next official city-calendar listings.

See [`plan.md`](./plan.md) for the current roadmap and [`progress.md`](./progress.md) for the
deployment handoff. The Pi deployment and remaining automation work are documented there.

## Video presentation

[Watch the dashboard video presentation](./videopresentation.mov)

## Repository layout

| Path | What |
|---|---|
| `app/` | Vite + React + TypeScript application (the only UI). |
| `app/public/*.json` | Normalized event JSON — the single cache served to and read by the app. |
| `scripts/` | Data ingestion + validation (Node ESM). |
| `docs/` | Durable project docs — spec, decisions, compliance, validation. |

## Running the v2 app

```bash
cd app
npm install
npm run dev      # preview at http://localhost:5173
```

## Refreshing data

```bash
cd app
npm run refresh        # refresh public caches and optional private family cache
npm run validate       # validate cached payloads; private family cache is optional
npm run refresh:build  # refresh + validate + production build in one command
```

Individual adapters still run directly, e.g. `node scripts/refresh-events.mjs`.

## Data sources

- Events: [waldmohr-aktuell.de](https://www.waldmohr-aktuell.de/) WordPress REST API (live).
- Homburg official events: `scripts/refresh-homburg-events.mjs` loads the city's public
  calendar and translates distinct listings at refresh time when `OPENROUTER_API_KEY` is set;
  failed or missing translations fall back to German.
- News: NPR News RSS and KSDK St. Louis local RSS, cached by `scripts/refresh-news.mjs`.
- Weather: Open-Meteo current conditions and seven-day forecast for Waldmohr.
- Trash: Landkreis Kusel waste collection iCal for Waldmohr (live).
- Holidays: Rheinland-Pfalz public holidays via [date.nager.at](https://date.nager.at/) (live).
- Flea markets: Homburg Floh- und Antiquitätenmarkt, official yearly dates from
  [homburg.de](https://www.homburg.de/) as a maintained table (live).
- Family: Google Calendar private iCal feed (live). Secret URL in `.env` (`GCAL_ICS_URL`);
  the generated `family.json` caches are gitignored so the family schedule never reaches
  this public repo. Events titled leave/vacation/Urlaub/PTO get their own calendar marker.

## Privacy & legal

This is a personal household project. The family/personal layer stays local-network only and is
never publicly broadcast. Scraped public data is stored minimally and always source-linked. See
[`docs/compliance.md`](./docs/compliance.md) for the GDPR posture.

## Tech

v2: Vite, React, TypeScript. Fonts: Fraunces, Archivo, JetBrains Mono. No backend — fully static
build served as-is; the voice/Node-server plan was dropped 2026-06-10.
