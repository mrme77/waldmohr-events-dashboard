# Progress

## Current development — reviewed 2026-10-29

- Current sources are Waldmohr events, official Homburg events, Homburg flea markets, NPR USA
  and FOX 2 St. Louis news, Open-Meteo weather, trash, holidays, and an optional private family
  calendar. KMC magazine-event and trip-summary adapters, caches, and UI have been removed.
- The current clocks show Napoli and St. Louis. Headlines wrap and change every 30 seconds
  without continuous animation; clock updates align to minute boundaries and the brand
  indicator is static.
- PR #47 merged these lower-load UI changes and the optimized script at `app/ops/deploy.sh`.
  The script skips unchanged published commits, reuses dependencies when their inputs match,
  validates/builds changed commits, preserves private family JSON, and attempts a Chromium
  refresh after publication. **Installation of that replacement script on the Pi is unverified.**
- PR #48 merged persistent Homburg translations. Successful English results are stored in
  `homburg-events.json` by original German title and summary. Refreshes reuse unchanged text
  and request only new or edited text; cached translations also work without an API key.
  Failed translations remain eligible for retry, and logs distinguish reused translations,
  new translations, and German fallbacks. The first refresh populates the cache; a model
  change starts a fresh cache.
- Public data refreshes in GitHub Actions daily at 05:17 UTC. Partial adapter failures produce
  warnings while successful datasets continue through validation and publication.
- During the translation-cache implementation, all 32 tests, cached-data validation, and the
  production build passed. This is the prior implementation result, not a fresh test run for
  this documentation update. No live paid translation request was made in that validation.

## Deployment evidence and remaining work

- The operator previously confirmed an hourly Pi deployment timer. The full-width weather
  forecast modal was confirmed working on the Pi on 2026-10-19 after PR #41.
- No new Pi inspection was performed for this documentation update. Repository code does not
  establish which operations-script version the service currently runs, whether Chromium
  accepted its refresh keystroke, or whether temperatures improved.
- Verify installation of the optimized script and unchanged-run skip behavior on the Pi;
  consult the internal [handoff](app/README.md) for installation and journal checks.
- Refresh the private family cache locally before deployment; never commit `family.json`.
- Add event/news JSON refresh that preserves the current month and selected day. The browser
  currently loads those datasets on mount; a successful full reload reads fresh data but
  resets the view. Weather already refreshes every 15 minutes.
- Confirm the first post-#48 refresh populates the translation cache and a later unchanged
  refresh reports reuse; live workflow behavior was not checked in this docs review.

## Historical milestones

These records describe earlier implementation stages; the current state above supersedes
their original feed names, UI behavior, paths, and deployment assumptions.

### 2026-10-19 — Pi operation and weather forecast

- Operator confirmed the hourly deployment timer and an existing private family cache. That
  deployment did not refresh the family adapter; no state-preserving in-page data refresh
  existed.
- PR #40 added the seven-day weather panel. PR #41 moved it into a screen-level modal to
  avoid sidebar clipping, and the user confirmed it worked on the Pi touchscreen.
- Earlier kiosk changes shipped source QR codes (#37), family entries before public QR
  cards (#38), and responsive clocks for the small display (#39).

### Earlier v2 development

- Scaffolded the Vite, React, and TypeScript kiosk, calendar, clocks, spotlight, and details.
- Replaced seeded Waldmohr records with the public WordPress REST API and confirmed dates.
  An early dual-write data layout was later retired; `app/public/` is the current cache tree.
- Added Open-Meteo weather and RSS news. The original St. Louis feed was KSDK and headlines
  originally scrolled; both were subsequently replaced by the current source and presentation.
- Completed browser QA at desktop and mobile sizes and fixed the event-date filter so
  upcoming events posted far in advance were not excluded.
- Dropped proposed Kaiserslautern/Ramstein scrapes and added maintained official Homburg
  flea-market dates, accounting for holiday exceptions.
- Added Kusel trash iCal, German public holidays, and private Google Calendar recurrence
  support. Secrets stayed in `.env`; generated family data was excluded from Git.
- Shipped KMC magazine events and trip summaries, then replaced them with official Homburg
  events and highlights in October 2026.
- Dropped voice on 2026-06-10; the dashboard remains touch-only with no backend server.

### v1 — retired

- Built and browser-tested a static local calendar with seed data and refresh/validation
  scripts. Retired the v1 UI in June 2026 after the Vite replacement reached parity.
