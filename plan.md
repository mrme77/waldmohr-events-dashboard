# Plan

## v1 — DONE
First local English calendar dashboard for Waldmohr events (static HTML/CSS/JS + JSON). Shipped,
then retired in favor of v2 (see `docs/decisions.md`, 2026-06-09).

## v2 — KMC Kiosk Dashboard

**Objective**: a single-page, high-contrast, touch dashboard for a wall-mounted Raspberry Pi 5,
covering the Kaiserslautern Military Community (KMC) area for a relocating American family.

**Status**: all data surfaces shipped. Remaining work is Phase 8 (Pi deployment).

### Target hardware
- Raspberry Pi 5, 8 GB RAM, 1 TB NVMe SSD.
- Touchscreen (size TBD — drives layout density).
- Chromium in kiosk mode, daily auto-reload.

### Surfaces (one page) — all DONE
- **News marquee** across the top (NPR USA + KSDK St. Louis RSS, keyless).
- Dual clock: Berlin (Europe/Berlin) + St. Louis/Central (America/Chicago).
- Calendar, one view, color = category (Fun/Public · Family Sports · Leave · Trash · Civic).
  Tap a day/dot → detail popover (time, venue, city, brief description, source link).
- Rotating "Next Up" spotlight (auto-advances; tap to pin).
- Weather strip: Waldmohr (Open-Meteo, keyless), live client-side fetch every 15 min.

Layout (news marquee pinned top):
```
┌──────────────────────────────────────────────────────────────────┐
│ ◄ 📰 USA …headline…  ·  St. Louis …headline…  ·  … (scrolling) ►   │ marquee, top
├──────────────────────────────────────────────────────┬───────────┤
│ KMC DASHBOARD   Berlin 14:32 · St.Louis 07:32   ↻ 2m  │  NEXT UP  │
├──────────────────────────────────────────────────────┤ spotlight │
│  JUNE 2026  calendar, dots colored by category        │ tap=pin   │
│  tap day/dot → detail popover                         │  • upcoming
├──────────────────────────────────────────────────────┴───────────┤
│ ☀ Waldmohr 22°  current conditions                                │ weather
└──────────────────────────────────────────────────────────────────┘
```

### Architecture
```
INGESTION (Node, cron — Phase 8)
  scripts/refresh-events.mjs      waldmohr-aktuell.de WP REST API
  scripts/refresh-news.mjs        NPR (USA) + KSDK (St. Louis) RSS
  scripts/refresh-trash.mjs       Landkreis Kusel waste portal (iCal)
  scripts/refresh-holidays.mjs    date.nager.at DE public holidays
  scripts/refresh-fleamarkets.mjs Homburg flea market press releases
  scripts/refresh-kmc.mjs         Kaiserslautern American Issuu UNTERWEGS
  scripts/refresh-family.mjs      Google Calendar private iCal URL
  → normalize to shared event schema → data/*.json + app/public/*.json
    (+ app/dist/*.json once Phase 8 lands, so cron updates reach the
    served build without a rebuild)

FRONTEND (Vite + React + TypeScript → Chromium kiosk)
  No backend / Node server — fully static.
  widgets: NewsMarquee · DualClock · Calendar · Spotlight · EventDetail · WeatherWidget
  WeatherWidget polls Open-Meteo directly (client-side, every 15 min); everything
  else reads cached *.json from same origin via fetch({ cache: "no-store" }).
```

### Secrets (`.env`, gitignored)
- `GCAL_ICS_URL` — Google family calendar private iCal address. Used only by
  `scripts/refresh-family.mjs` at refresh time; never shipped to the client.

### Event sources — status
- Waldmohr events: `waldmohr-aktuell.de` WP REST API. **DONE.**
- News: NPR (USA) + KSDK (St. Louis) RSS. **DONE.**
- Trash: Landkreis Kusel waste portal iCal. **DONE.**
- Holidays: `date.nager.at` DE public holidays. **DONE.**
- Flea markets: Homburg press releases (Kaiserslautern/Ramstein scrapes dropped in favor of
  this, 2026-06-10). **DONE.**
- KMC events: Kaiserslautern American Issuu `UNTERWEGS` magazine listings. **DONE.**
- Family: Google Calendar private iCal URL. **DONE.**

### Phases
1. **Scaffold** — Vite + React + TS, high-contrast theme, layout shell, news marquee slot,
   dual clocks. **DONE.**
2. **Waldmohr events** — normalized schema, calendar (color = category), rotating spotlight,
   tap-to-detail popover. **DONE.**
3. **Weather widget** — Open-Meteo, Waldmohr, keyless. **DONE.**
4. **News marquee content** — NPR + KSDK RSS adapters. **DONE.**
5. **More event sources** — flea markets (Homburg). **DONE.**
6. **Family layer** — Google Calendar iCal + Kusel trash iCal + DE holidays; category color
   coding. **DONE.**
7. **KMC magazine events** — Kaiserslautern American Issuu `UNTERWEGS` adapter, neon-green
   diamond marker category. **DONE.** (Voice was dropped 2026-06-10; touch dashboard sufficient.)
8. **Pi deployment — NEXT / REMAINING**
   - `npm run build` → serve `app/dist` via a static server (e.g. `vite preview`) on the Pi;
     Chromium kiosk autostart points at it.
   - Cron job(s) on the Pi run `npm run refresh` on a low-frequency schedule (every few hours
     per `docs/compliance.md`) to keep `data/*.json` current.
   - Add `app/dist/*.json` as a third write target in each `refresh-*.mjs` (alongside
     `data/*.json` and `app/public/*.json`) so cron-refreshed data reaches the served build
     without a full rebuild. This also fixes the manual-refresh staleness issue.
   - Weather needs no cron: `WeatherWidget` fetches Open-Meteo live every 15 min as long as the
     Pi has internet.

### Open questions
- Touchscreen size / resolution (drives layout density).
- Cron cadence per source — likely all on one "every few hours" schedule to start; can be
  split per-source later if any source needs to be fresher/staler.

See `docs/compliance.md` for the GDPR / scraping legal posture. See `docs/decisions.md` for
the v2 architecture decisions.
