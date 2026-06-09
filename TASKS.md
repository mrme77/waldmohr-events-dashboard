# Tasks

## v1 — static dashboard (done)
- [x] Create operating-surface docs.
- [x] Create static app shell.
- [x] Add calendar and event list interactions.
- [x] Seed event data from public sources.
- [x] Add refresh script.
- [x] Add validation script.
- [x] Run validation.
- [x] Update validation results.
- [x] Browser visual QA.

## v2 — KMC kiosk dashboard (planned)
See `plan.md` for full detail.

### MVP — Waldmohr events only
- [x] Phase 1: Vite + React + TS scaffold, "Civic Departure Board" theme, layout shell with
      news-marquee slot pinned at top (placeholder), dual clocks, Last Updated KPI, calendar +
      spotlight + tap-to-detail popover.
- [x] Phase 2: Waldmohr events — fix refresh placeholder-overwrite bug; wire pipeline to
      `app/public/events.json`; update validation; live data so upcoming events populate.
- [ ] MVP browser QA/demo pass in a normal browser.

### Later (after MVP demo)
- [ ] Phase 3: Weather strip (Open-Meteo, 3 cities, keyless).
- [ ] Phase 4: News marquee content — RSS adapters (US + St. Louis).
- [ ] Phase 5: More event sources — Kaiserslautern scrape, then Ramstein headless.
- [ ] Phase 6: Family layer — Google Calendar iCal + Kusel trash iCal; category color coding.
- [ ] Phase 7: Voice — local Node server + OpenRouter proxy + whisper.cpp STT.
- [ ] Phase 8: Pi 5 deployment — Chromium kiosk autostart, cron schedule, daily reload.
- [ ] Update `docs/reference-index.md` with new sources and APIs.
