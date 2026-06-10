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
- [x] Phase 3: Weather widget (Open-Meteo, Waldmohr only, keyless).
- [ ] Expand weather to 3-city strip if needed.
- [x] Phase 4: News marquee content — RSS adapters (NPR USA + KSDK St. Louis).
- [x] Phase 5 (rescoped): Homburg Flohmarkt adapter (`scripts/refresh-fleamarkets.mjs`) —
      official 2026 dates from homburg.de (first-Saturday rule has holiday exceptions, so
      dates are a maintained table, not rule-generated). Kaiserslautern/Ramstein scrapes
      dropped — not wanted.
- [ ] Phase 5b (optional): regional flea market aggregator scrape
      (flohmarkt.info / flohmarkt-termine.org) if more coverage wanted — listings were
      empty at build time, low priority.
- [x] Phase 6a: Kusel trash iCal — adapter (`scripts/refresh-trash.mjs`) + calendar wiring done.
      German holidays adapter (`scripts/refresh-holidays.mjs`, date.nager.at) added as bonus.
- [x] Phase 6b: Family layer — Google Calendar private iCal adapter
      (`scripts/refresh-family.mjs`, dependency-free ICS parser with recurrence). Secret
      URL in `.env` (`GCAL_ICS_URL`); generated `family.json` is gitignored (public repo —
      family schedule must never be committed). HTML in event descriptions stripped.
- [x] ~~Phase 7: Voice~~ — dropped 2026-06-10. Touch dashboard is enough; no STT/LLM/server.
      (TTS read-aloud idea also parked.)
- [ ] Phase 8: Pi 5 deployment — Chromium kiosk autostart, cron schedule, daily reload.
- [x] Update `docs/reference-index.md` with new sources and APIs (holidays, trash, flea markets).
