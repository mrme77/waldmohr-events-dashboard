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

### In Flight
- MVP browser QA/demo pass in a normal browser.

### Blocked
- In-app browser QA was unavailable in this session; command-level validation passed.

## v1 — Static Dashboard (done, retained until v2 parity)
- Built a static local calendar dashboard with seeded English event data, refresh + validation
  scripts. Browser-tested desktop, search, details, and 375px mobile. Validated event data.
