# Project Specification: Waldmohr Events Dashboard

## Intent
Build a local English-first kiosk dashboard that helps an American family moving to the Kaiserslautern Military Community see current public events, understand why they matter, and verify every item against its original source.

## v2 MVP Acceptance Criteria
- [x] The app runs as a Vite + React + TypeScript kiosk shell under `app/`.
- [x] The home screen shows a month calendar, top news-marquee slot, dual clocks, last-updated metadata, rotating "Next Up" spotlight, and tap-to-detail popover.
- [ ] The Waldmohr refresh pipeline writes live normalized events to `app/public/events.json`.
- [ ] The app loads events from `/events.json` and does not depend on hardcoded seed data.
- [ ] The calendar uses category color dots and tap/click selection, not filter checkboxes.
- [ ] Each detail popover displays English title, plain-English summary, date, time when available, venue, source URL, original German title, post date, last checked date, and date confidence.
- [ ] Past events are excluded from "Next Up" and visually distinct from upcoming/current events where shown.
- [ ] A validation script checks the event payload shape before the app uses refreshed data.
- [ ] The v2 app builds with `npm run build`.

## Constraints
- **Source-linked**: no event is displayed without a source URL.
- **Freshness-visible**: the app must show last refreshed time.
- **No client secrets**: secrets stay in `.env` and server-side only when later phases add private feeds or LLM access.
- **Date caution**: inferred event dates must be marked with `dateConfidence`.
- **Local-first**: v2 is built for a local Raspberry Pi kiosk and local cached JSON.
- **Public Waldmohr first**: the MVP uses only Waldmohr Aktuell before adding KMC-wide sources.

## Non-Goals
- Full clone of Waldmohr Aktuell.
- Backend CMS or admin workflow.
- Automated machine translation paid API integration.
- Scraping private or authenticated pages.
- Manual event-entry UI on the kiosk.
- Weather, RSS news, family calendar, trash calendar, voice, and Pi deployment before the Waldmohr-only MVP is proven.

## v1 Status
The original static HTML/CSS/JS dashboard is complete and retained until v2 reaches parity. Its historical criteria are tracked in `TASKS.md` and `progress.md`.
