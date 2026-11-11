# Progress

## Current development — reviewed 2026-11-11

- Current sources are Waldmohr events, official Homburg events, Homburg flea markets, NPR USA
  and FOX 2 St. Louis news, Open-Meteo weather, trash, holidays, and an optional private family
  calendar. KMC magazine-event and trip-summary adapters, caches, and UI have been removed.
- The current clocks show Napoli and St. Louis. Headlines wrap and change every 30 seconds
  without continuous animation; clock updates align to minute boundaries and the brand
  indicator was replaced in merged PR #50 by verified internet status.
- PR #50 adds startup/30-second visible-page connectivity checks and
  tap-to-retry, plus a Desktop button backed by an optional loopback-only Chromium
  extension. No backend or npm dependency was added. The Pi startup now loads the
  extension automatically; its previous autostart file is backed up.
- All 44 local tests, cached-data validation, and the production build pass for the
  changes merged in PR #50. Simulated browser checks pass from 375px through 1280px; native
  minimization and programmatic fullscreen restoration were subsequently verified
  on the Pi. The operator confirmed Desktop works.
- PR #47 merged the earlier lower-load UI changes and the optimized script at `app/ops/deploy.sh`.
  The script skips unchanged published commits, reuses dependencies when their inputs match,
  validates/builds changed commits, preserves private family JSON, and attempts a Chromium
  refresh after publication. **The installed script was confirmed identical by SHA-256 on 2026-11-11.**
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
- After SSH key authorization, direct inspection confirmed labwc and
  `http://127.0.0.1:8080` in the dedicated Chromium kiosk profile.
  The installed deployment script is now hash-verified. Its live refresh keystroke,
  unchanged-run skipping, and temperature impact still need operational checks.
- The optimized script's installed copy is verified; check unchanged-run skip behavior;
  consult the internal [handoff](app/README.md) for installation and journal checks.
- Refresh the private family cache locally before deployment; never commit `family.json`.
- Add event/news JSON refresh that preserves the current month and selected day. The browser
  currently loads those datasets on mount; a successful full reload reads fresh data but
  resets the view. Weather already refreshes every 15 minutes.
- Operator-supplied refresh output confirms 31 reused translations, 0 newly translated,
  0 German fallbacks, and 450 occurrences for that run. First cache population and
  current scheduled-run health were not directly inspected.
- Header controls are deployed and the kiosk autostart now enables the extension.
  Temporary browser diagnostics were removed after native minimization/fullscreen
  checks; the normal kiosk remains running. The operational handoff is saved on Pi.
- Observe taskbar return with calendar state preserved, network disconnect/reconnect,
  touch input, and usable keyboard/display scaling; those input settings were not changed.

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
