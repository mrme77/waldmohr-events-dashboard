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

### In Flight
- Phase 2: make Waldmohr events live (fix refresh placeholder-overwrite bug; wire to `app/public`).

### Blocked
- None.

## v1 — Static Dashboard (done, retained until v2 parity)
- Built a static local calendar dashboard with seeded English event data, refresh + validation
  scripts. Browser-tested desktop, search, details, and 375px mobile. Validated event data.
