# Waldmohr Events Dashboard

A local, English-first events board for an American family living in the Kaiserslautern Military
Community (KMC) area of Rhineland-Palatinate, Germany. It turns public German event posts into a
glanceable, source-linked calendar.

> **Status: feature-complete, pre-deploy.** v2 — a touch kiosk for a Raspberry Pi 5 — has all data
> surfaces shipped (events, KMC magazine listings, news, weather, trash, holidays, flea markets,
> family) and is now the only app (the v1 static dashboard has been retired). Remaining work: Pi 5 deployment (see
> `plan.md` Phase 8).

## What it does (v2 vision)

A single-page, high-contrast "Civic Departure Board" designed for an always-on wall display:

- **Calendar** of local events, colored by category, tap a day for details + source link.
- **News marquee** across the top (USA + St. Louis RSS cache, 80-second scroll).
- **Dual clocks** — Napoli and St. Louis / Central.
- **Weather** for Waldmohr via Open-Meteo.

See [`plan.md`](./plan.md) for the full roadmap and [`AGENTS.md`](./AGENTS.md) for project truth.

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
npm run refresh        # run all seven adapters (events, news, trash, holidays, flea markets, KMC, family)
npm run validate       # validate all seven cached payloads
npm run refresh:build  # refresh + validate + production build in one command
```

Individual adapters still run directly, e.g. `node scripts/refresh-events.mjs`.

## Data sources

- Events: [waldmohr-aktuell.de](https://www.waldmohr-aktuell.de/) WordPress REST API (live).
- KMC events: `scripts/refresh-kmc.mjs`
  extracts the current issue's `UNTERWEGS` section from the SVG text layer and writes
  `kmc-events.json`. Issues usually update on Fridays; yearless event dates are inferred from the
  issue year and marked as inferred.
- News: NPR News RSS and KSDK St. Louis local RSS, cached by `scripts/refresh-news.mjs`.
- Weather: Open-Meteo current conditions for Waldmohr.
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
