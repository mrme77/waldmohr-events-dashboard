# Project Specification: Waldmohr Events Dashboard

Reviewed after PR #50 merge and Pi activation on 2026-11-11. The header controls are deployed and the Desktop extension is enabled.

## Intent
Build a local English-first touchscreen dashboard that helps a household in Waldmohr find
current public events, understand why they matter, and verify them against original sources.
The application is a static Vite + React + TypeScript site under `app/`, served on a Pi.

## Current Acceptance Criteria

- [x] Show a month calendar, news slot, Napoli and St. Louis clocks, last-updated metadata,
  rotating Next Up spotlight, and touch-friendly day details.
- [x] Load normalized JSON from `app/public/` for Waldmohr events, official Homburg events,
  flea markets, trash, holidays, news, and an optional private family calendar.
- [x] Use category markers and day selection rather than filter checkboxes; exclude past
  events from Next Up and Homburg highlights.
- [x] Keep public events source-linked; show original German titles and date confidence in
  details. Source websites are accessed through locally generated QR codes for a phone.
- [x] Display up to three upcoming/current Homburg listings in the right rail. The former
  KMC magazine events and Trip Ideas surfaces have been removed.
- [x] Read English NPR and FOX 2 News headlines without translation. Show one wrapping
  headline at a time and rotate every 30 seconds, without continuous scrolling.
- [x] Fetch Waldmohr weather directly from Open-Meteo every 15 minutes and open a seven-day
  forecast in a screen-level modal.
- [x] Translate missing Homburg title/summary pairs at refresh time when configured; reuse
  saved successful translations across refreshes and recurrences, including without a key.
  Untranslated text retains its source text when no key is available or a batch fails.
- [x] Validate cached data and pass the TypeScript/production build.
- [x] Show internet reachability in the header; check on startup, every 30 seconds while
  visible, on visibility/reconnection events, and on tap, with an eight-second timeout.
  A provider failure shows an unverified connection rather than asserting internet loss.
- [x] Provide a Desktop button using an optional Manifest V3 Chromium extension restricted
  to HTTP localhost/127.0.0.1 pages and the sending tab's own window.
- [x] Enable the extension in the Pi kiosk startup; verify native minimization and
  programmatic fullscreen restoration. The operator confirmed Desktop works.
- [ ] Observe normal taskbar restoration with the selected month/day preserved and
  verify touch input and usable keyboard/display scaling on the physical Pi.

## Architecture and Constraints

- **Static frontend**: no application backend. Event/news JSON loads on mount; page reloads
  read generated files and never invoke translation. State-preserving in-page JSON refresh
  remains pending.
- **Optional desktop integration**: `app/ops/desktop-extension` minimizes the dashboard
  without a backend, shell access, or browser-wide permissions. Load it in the kiosk's
  Chromium profile; the button is disabled when the helper is unavailable. Return by
  clicking Chromium's taskbar entry. Pi activation, native minimization, and
  programmatic fullscreen restoration are verified; normal taskbar return remains
  an operational check.
- **Separate ingestion**: Node.js adapters normalize public sources. GitHub Actions is
  configured to refresh and publish public JSON daily at 05:17 UTC, with manual dispatch.
- **Translation persistence**: `homburg-events.json` contains a model-scoped cache keyed by
  original title and summary. New or changed pairs are translated in batches of up to 20;
  failures are retried on later refreshes. A corrupt saved cache fails visibly. Changing
  models starts a fresh cache; legacy payloads require an initial population run.
- **Source-linked and freshness-visible**: public events retain source URLs and refresh
  metadata. Inferred dates must use `dateConfidence` rather than appearing confirmed.
- **No client secrets**: `OPENROUTER_API_KEY` is a GitHub Actions repository secret for
  scheduled Homburg refreshes, or a local environment/`.env` value for manual refreshes.
  `GCAL_ICS_URL` stays local for the private family adapter. Neither reaches the client.
- **Private family data**: generated `family.json` is gitignored and preserved at the Pi
  publish destination. Refreshing it locally before deployment remains pending.
- **Deployment evidence**: hourly Pi deployment was reported operational. The optimized
  replacement script is implemented and tested locally; the installed Pi copy was
  confirmed identical by SHA-256 on 2026-11-11. Timer execution, unchanged-run skips,
  and deployment-triggered Chromium refresh still require operational checks. See `../app/README.md`.

## Non-Goals

- Full clone of Waldmohr Aktuell or full-article republication.
- Backend CMS, manual event entry on the kiosk, or a live translation backend.
- Scraping private or authenticated pages.
- Voice interaction (dropped 2026-06-10).
- KMC magazine ingestion and Trip Ideas (replaced by Homburg in October 2026).

The original MVP excluded paid machine translation and Pi deployment; those historical
boundaries were superseded by the implemented Homburg refresh integration and Pi work.
See `decisions.md` for the history and `../plan.md` for remaining work.

## v1 Status

The original static HTML/CSS/JS app was retired on 2026-06-09. The Vite app under `app/`
is the only UI; earlier implementation and acceptance records remain historical.
