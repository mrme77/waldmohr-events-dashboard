# Project Specification: Waldmohr Events Dashboard

## Intent
Build a local English-first kiosk dashboard that helps an American family moving to the Kaiserslautern Military Community see current public events, understand why they matter, and verify every item against its original source.

## v2 MVP Acceptance Criteria
- [x] The app runs as a Vite + React + TypeScript kiosk shell under `app/`.
- [x] The home screen shows a month calendar, top news-marquee slot, dual clocks, last-updated metadata, rotating "Next Up" spotlight, and tap-to-detail popover.
- [x] The Waldmohr refresh pipeline writes live normalized events to `app/public/events.json`.
- [x] The app loads events from `/events.json` and does not depend on hardcoded seed data.
- [x] The calendar uses category color dots and tap/click selection, not filter checkboxes.
- [x] Each detail popover displays English title, plain-English summary, date, time when available, venue, source URL, original German title, post date, last checked date, and date confidence.
- [x] Past events are excluded from "Next Up" and visually distinct from upcoming/current events where shown.
- [x] A validation script checks the event payload shape before the app uses refreshed data.
- [x] The v2 app builds with `npm run build`.

All MVP criteria shipped. Later phases (weather, news, family/trash/holidays, flea markets) added
on top — see `plan.md`.

## Constraints
- **Source-linked**: no event is displayed without a source URL.
- **Freshness-visible**: the app must show last refreshed time.
- **No client secrets**: secrets stay in `.env`, used only by refresh scripts (e.g. `GCAL_ICS_URL`
  for the family calendar feed), never shipped to the client.
- **Date caution**: inferred event dates must be marked with `dateConfidence`.
- **Local-first**: v2 is built for a local Raspberry Pi kiosk and local cached JSON.
- **Public Waldmohr first**: the MVP shipped with only Waldmohr Aktuell before KMC-wide sources
  (news, weather, family, trash, holidays, flea markets) were added in later phases — done, see
  `plan.md`.

## Non-Goals
- Full clone of Waldmohr Aktuell.
- Backend CMS or admin workflow.
- Automated machine translation paid API integration.
- Scraping private or authenticated pages.
- Manual event-entry UI on the kiosk.
- Voice interaction — dropped 2026-06-10 (touch dashboard is sufficient; see `docs/decisions.md`).
- Pi 5 deployment is out of scope for this spec; tracked as Phase 8 in `plan.md`.

## v1 Status
The original static HTML/CSS/JS dashboard is complete and retained until v2 reaches parity. Its historical criteria are tracked in `TASKS.md` and `progress.md`.
