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
  events within 180 days of today with explicit source dates.
- Phase 3: added a single Waldmohr current-weather widget using Open-Meteo directly from the
  frontend. The right rail now stacks weather, clocks, then Next Up; weather shows temperature,
  spelled-out condition, wind, humidity, and loading/error states. The clock widget includes the
  event-data updated date.
- Phase 4: added keyless RSS refresh for NPR USA and KSDK St. Louis headlines. The refresh writes
  cached news JSON to `app/public/news.json`; the top marquee now loads the cached payload with
  a fallback error/loading state. The marquee is constrained so long RSS
  headlines cannot stretch the app layout, and it scrolls at 80 seconds per loop.
- MVP browser QA/demo pass in a normal browser: layout, theme, marquee, clocks, calendar, weather,
  and family layer all render correctly. QA found that the event-date filter was incorrectly
  excluding upcoming events posted far in advance. Fixed by removing the `maxPostLeadDays` check
  from `isDisplayableEventDate` in `scripts/refresh-events.mjs`; now only `daysFromToday <= 180`
  is applied.
- Phase 5 (rescoped): Kaiserslautern/Ramstein scrapes dropped (2026-06-10, see
  `docs/decisions.md`). Added a Homburg Flohmarkt adapter (`scripts/refresh-fleamarkets.mjs`)
  using a maintained table of official yearly dates from homburg.de, since the first-Saturday
  rule has holiday exceptions.
- Phase 6a: added the Kusel trash iCal adapter (`scripts/refresh-trash.mjs`) and a German public
  holidays adapter (`scripts/refresh-holidays.mjs`, date.nager.at, RLP), both wired into the
  calendar with their own category colors.
- Phase 6b: added the family layer — a Google Calendar private iCal adapter
  (`scripts/refresh-family.mjs`) with a dependency-free ICS parser supporting recurrence. The
  secret URL lives in `.env` as `GCAL_ICS_URL`; generated `family.json` is gitignored so the
  family schedule never reaches this public repo. Leave/vacation/Urlaub/PTO events get their own
  calendar marker.
- Phase 7: added KMC magazine events — `scripts/refresh-kmc.mjs` discovers the current
  Kaiserslautern American Issuu issue, extracts the `UNTERWEGS` SVG text layer, parses event
  blocks, and writes KMC-area listings to `app/public/kmc-events.json`.
  The frontend renders KMC events as neon-green diamond markers. Dates without an explicit year
  are inferred from the issue year and marked with `dateConfidence: "inferred"`. **DONE.**
- Phase 7b: added KMC trip summaries — `scripts/refresh-kmc-trips.mjs` reuses KMC Issuu SVG text,
  scans the whole issue, and uses OpenRouter `google/gemini-2.5-flash` to write
  `app/public/kmc-trip-ideas.json`. The right rail renders an optional Trip Ideas panel showing
  three ideas at a time, rotating every 10 seconds with manual previous/next controls. **DONE.**

### Remaining
- Phase 8: Pi 5 deployment — build/serve `app/dist`, cron-driven `npm run refresh`, add
  `app/dist/*.json` as an additional write target so cron updates reach the served build without
  a rebuild, Chromium kiosk autostart. See `plan.md` Phase 8.

## v1 — Static Dashboard (done, retained until v2 parity)
- Built a static local calendar dashboard with seeded English event data, refresh + validation
  scripts. Browser-tested desktop, search, details, and 375px mobile. Validated event data.
