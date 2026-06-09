# Waldmohr Events Dashboard

A local, English-first events board for an American family living in the Kaiserslautern Military
Community (KMC) area of Rhineland-Palatinate, Germany. It turns public German event posts into a
glanceable, source-linked calendar.

> **Status: work in progress.** v1 (static dashboard) is complete. v2 — a touch + voice kiosk for a
> Raspberry Pi 5 — is under active development. This README is a stub and will grow.

## What it does (v2 vision)

A single-page, high-contrast "Civic Departure Board" designed for an always-on wall display:

- **Calendar** of local events, colored by category, tap a day for details + source link.
- **News marquee** across the top (USA + St. Louis RSS cache, 80-second scroll).
- **Dual clocks** — Napoli and St. Louis / Central.
- **Weather** for Waldmohr via Open-Meteo.
- **Voice** query (tap-to-talk) over the events, later.

See [`plan.md`](./plan.md) for the full roadmap and [`AGENTS.md`](./AGENTS.md) for project truth.

## Repository layout

| Path | What |
|---|---|
| `app/` | v2 Vite + React + TypeScript application (current focus). |
| `index.html`, `src/` | v1 static dashboard (retained until v2 reaches parity). |
| `scripts/` | Data ingestion + validation (Node ESM). |
| `data/` | Normalized event JSON. |
| `docs/` | Durable project docs — spec, decisions, compliance, validation. |

## Running the v2 app

```bash
cd app
npm install
npm run dev      # preview at http://localhost:5173
```

## Refreshing data

```bash
node scripts/refresh-events.mjs
node scripts/validate-events.mjs
node scripts/refresh-news.mjs
node scripts/validate-news.mjs
```

## Data sources

- Events: [waldmohr-aktuell.de](https://www.waldmohr-aktuell.de/) WordPress REST API (live).
- News: NPR News RSS and KSDK St. Louis local RSS, cached by `scripts/refresh-news.mjs`.
- Weather: Open-Meteo current conditions for Waldmohr.
- Planned: Kaiserslautern + Ramstein event calendars, Google Calendar (family), Landkreis Kusel
  trash iCal.

## Privacy & legal

This is a personal household project. The family/personal layer stays local-network only and is
never publicly broadcast. Scraped public data is stored minimally and always source-linked. See
[`docs/compliance.md`](./docs/compliance.md) for the GDPR posture.

## Tech

v2: Vite, React, TypeScript. Fonts: Fraunces, Archivo, JetBrains Mono. No backend yet (a small
local Node server arrives with the voice phase).
