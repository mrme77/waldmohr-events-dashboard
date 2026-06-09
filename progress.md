# Progress

## v2 — KMC Kiosk Dashboard (current)
### Completed
- Confirmed the three target city sites have no usable APIs (Waldmohr→IONOS, KL→TYPO3, Ramstein→JS);
  every new event source is a bespoke scrape. Documented in `plan.md`.
- Confirmed Landkreis Kusel publishes a Waldmohr trash iCal export (params TBD at build time).
- Wrote v2 plan, decision log, and GDPR/scraping posture (`docs/compliance.md`).
- Phase 1: scaffolded `app/` (Vite + React + TS), "Civic Departure Board" theme, layout shell with
  top news marquee, dual clocks (NAP/STL), Last Updated KPI, calendar + rotating spotlight +
  tap-to-detail popover. Renders Waldmohr seed events. Type-checks clean; previews via `npm run dev`.
- Phase 2: live Waldmohr refresh now writes both shared data and `app/public/events.json`;
  validation covers both payloads; event detail shows source metadata. The refresh only displays
  current/upcoming events with explicit source dates, so stale archive candidates are excluded.
- Phase 3: added a single Waldmohr current-weather widget using Open-Meteo directly from the
  frontend. The right rail now stacks weather, clocks, then Next Up; weather shows temperature,
  spelled-out condition, wind, humidity, and loading/error states. The clock widget includes the
  event-data updated date.
- Phase 4: added keyless RSS refresh for NPR USA and KSDK St. Louis headlines. The refresh writes
  cached news JSON to `data/news.json` and `app/public/news.json`; the top marquee now loads the
  cached payload with a fallback error/loading state. The marquee is constrained so long RSS
  headlines cannot stretch the app layout, and it scrolls at 80 seconds per loop.

### In Flight
- MVP browser QA/demo pass in a normal browser.

### Blocked
- In-app browser QA was unavailable in this session; command-level validation passed.

## v1 — Static Dashboard (done, retained until v2 parity)
- Built a static local calendar dashboard with seeded English event data, refresh + validation
  scripts. Browser-tested desktop, search, details, and 375px mobile. Validated event data.
