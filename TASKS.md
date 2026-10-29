# Tasks

Reviewed against repository source on 2026-10-29. See [plan.md](plan.md) for the current
architecture and [app/README.md](app/README.md) for the internal Pi handoff.

## Current implementation — completed

- [x] Static Vite, React, and TypeScript kiosk dashboard with month calendar, upcoming events,
      touch-openable event details, and visible refresh metadata.
- [x] Waldmohr events from the WordPress REST API.
- [x] Official Homburg events and a panel showing the next three Homburg listings.
- [x] Homburg flea-market dates, Kusel trash collections, and Rheinland-Pfalz public holidays.
- [x] Optional private family-calendar adapter with recurrence support; private JSON is
      gitignored and preserved during deployment.
- [x] NPR USA and FOX 2 St. Louis RSS headlines, displayed one at a time every 30 seconds
      without continuous scrolling or transition animations.
- [x] Napoli and St. Louis clocks with updates at minute boundaries; static brand indicator.
- [x] Open-Meteo current weather and a seven-day forecast in a screen-level modal.
- [x] Source QR codes for public events; family entries first in day details, without QR codes.
- [x] Daily public-data refresh workflow scheduled at 05:17 UTC, including adapter failure
      warnings and validation before publication of successful datasets.
- [x] Homburg translation via the paid MiniMax base route; retain German on missing/failed
      translation and keep official source links and original titles.
- [x] PR #48: persist successful translations by original title and summary; reuse unchanged
      translations across refreshes, retry failures, and report reused/new/fallback counts.
- [x] PR #47: implement an optimized deployment script that skips unchanged publishes,
      conditionally reuses dependencies, preserves private family JSON, and attempts a
      Chromium refresh after successful publication.
- [x] Previous implementation validation: 32 tests, cached-data validation, and production
      build passed. This records the implementation run, not a new run for this docs update.

## Deployment verification and automation — remaining

- [ ] Verify installation of `app/ops/deploy.sh` as the Pi service's operations script. The
      hourly timer was previously operator-confirmed; installation of the optimized replacement
      and its live behavior have not been verified.
- [ ] On the Pi, confirm unchanged runs report `No build needed`; confirm a changed commit
      publishes and Chromium accepts the refresh keystroke.
- [ ] Refresh the Pi's private family cache from local `.env` before deployment; never commit
      `family.json` or the secret calendar URL.
- [ ] Refresh event/news JSON in the open page without losing its month or selected day.
      A full browser reload loads new data but does not satisfy this requirement.
- [ ] Confirm the first post-#48 public refresh populates the translation cache and a later
      unchanged refresh reuses it. Mocked local tests cover this behavior; live verification
      remains outstanding in this documentation review.

## Optional backlog — not scheduled

- [ ] Consider a three-city weather strip only if needed.
- [ ] Consider a regional flea-market aggregator only if more coverage is requested.

## Historical completed or retired work

- [x] v1 static dashboard, seed events, refresh/validation scripts, and browser QA; retired
      in June 2026 in favor of the Vite application.
- [x] v2 MVP shell, live Waldmohr event pipeline, and browser demo.
- [x] Family, trash, holiday, and flea-market layers added after MVP.
- [x] KMC magazine-event and trip-summary adapters and Trip Ideas UI shipped, then removed
      in October 2026 when official Homburg listings replaced them.
- [x] Voice dropped on 2026-06-10; no voice implementation remains planned.
- [x] Source QR codes (#37), family ordering (#38), and responsive clocks (#39) shipped.
- [x] Seven-day forecast (#40) moved to a full-width modal (#41); the user confirmed that
      modal worked on the Pi touchscreen after deployment on 2026-10-19.
