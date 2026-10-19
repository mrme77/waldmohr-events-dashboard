# Validation

How to verify the dashboard works.

## v2 Checklist
- From `app/`, run `npm run build`.
- From `app/`, run `npm run dev` and open the Vite URL.
- Confirm the page shows the news-marquee slot, calendar, right-rail weather, dual clocks with updated date, spotlight, and detail popover.
- Confirm the news marquee shows USA and St. Louis headlines from `app/public/news.json`, scrolls slowly, and does not stretch the page horizontally.
- Confirm `app/public/events.json` is loaded via `/events.json`.
- Confirm month cells render category-colored event markers.
- Confirm selecting a day/event opens details with source link, original German title, post date, last checked date, and date confidence.
- Confirm past events do not appear in "Next Up".
- Confirm trash (squares), holiday (triangle), flea-market (hollow ring), family (star), and
  leave (star) events render on the calendar with the correct category colors and shapes.
- Confirm official Homburg events from `app/public/homburg-events.json` render on the calendar,
  retain German originals in details, and link to official city pages.
- Confirm the right rail shows the next three translated official Homburg listings.
- Confirm flea-market events from `app/public/fleamarkets.json` render as hollow ring markers
  with amber color.
- Run `node scripts/validate-events.mjs`.
- Run `node scripts/validate-news.mjs`.
- Run `node scripts/validate-trash.mjs`.
- Run `node scripts/validate-holidays.mjs`.
- Run `node scripts/validate-fleamarkets.mjs`.
- Run `node scripts/validate-family.mjs` (skips cleanly if `family.json` is absent, i.e.
  `GCAL_ICS_URL` not set).
- Or run all of the above at once: `npm run validate` (from `app/`).
- Optional: run `node scripts/refresh-events.mjs`, then validate again and confirm `app/public/events.json` changed.
- Optional: run `node scripts/refresh-news.mjs`, then validate again and confirm `app/public/news.json` changed.
- Optional: run `node scripts/refresh-homburg-events.mjs`, then validate again and confirm
  `app/public/homburg-events.json` changed. With `OPENROUTER_API_KEY`, confirm titles and
  summaries are translated while original German titles remain available in details.

## v1 Historical Checklist (retired 2026-06-09)
The v1 static app (`index.html`, `src/`) was removed; its checklist is kept for history only.
- Open `index.html` in a browser.
- Confirm the page shows last refreshed metadata.
- Confirm month cells render event markers.
- Confirm clicking an event opens details with source link and original German title.

## Last Run
- 2026-10-19: production build passed after adding a touch-openable seven-day Waldmohr forecast
  panel. The panel shows condition, daily high/low, and precipitation probability; visual
  verification on the 7-inch Pi display remains after deployment.
- 2026-10-19: forecast panel moved to a screen-level portal to avoid clipping by the sidebar's
  scroll container; production build passed. Pi verification is recorded in the next entry.
- 2026-10-19: PR #41 merged, deployed using `waldmohr-deploy.service`, and user confirmed the
  forecast modal opens at full width on the Pi touchscreen.
- 2026-06-08: `node scripts/validate-events.mjs` passed.
- Result: `Validated 6 events from 2026-06-08T15:30:00+02:00.`
- 2026-06-08: Browser QA via local server `http://127.0.0.1:4173/` passed.
- Result: rendered six event cards, search narrowed to the museum event, details panel opened, mobile 375px had no horizontal overflow, and browser console had no warnings/errors.
- 2026-06-09: `node scripts/refresh-events.mjs` refreshed 0 display-safe live events from 22 Waldmohr candidate posts to `data/events.json` and `app/public/events.json`.
- 2026-06-09: `node scripts/validate-events.mjs` passed for both payloads.
- Result: validated 0 events from `2026-06-09T11:21:22.575Z`; stale archive posts and past events are excluded from the kiosk calendar.
- 2026-06-09: `npm run build` passed in `app/`.
- 2026-06-09: single Waldmohr Open-Meteo weather widget added; right rail now shows weather, dual clocks with updated date, then Next Up; `npm run build` passed in `app/`.
- 2026-06-09: `node scripts/refresh-news.mjs` refreshed 12 headlines from NPR USA and KSDK St. Louis to `data/news.json` and `app/public/news.json`.
- 2026-06-09: `node scripts/validate-news.mjs` passed for both news payloads.
- 2026-06-09: marquee containment updated for live RSS text; scroll duration set to 80 seconds; `npm run build` passed in `app/`.
- MVP browser QA/demo pass completed in a normal browser: layout, theme, marquee, clocks,
  calendar, weather, and family layer all render correctly (see `progress.md`). QA found the
  event-date filter was incorrectly excluding upcoming events posted far in advance; fixed by
  removing the `maxPostLeadDays` check from `isDisplayableEventDate` in
  `scripts/refresh-events.mjs` (PR #20).
- 2026-06-13: `node scripts/refresh-kmc.mjs` refreshed 15 KMC `UNTERWEGS` events from the
  Kaiserslautern American June 12, 2026 Issuu issue to `data/kmc-events.json` and
  `app/public/kmc-events.json`.
- 2026-06-13: `npm run validate` passed in `app/`, including 15 KMC events from
  `2026-06-13T07:58:14.853Z`.
- 2026-06-13: `npm run build` passed in `app/` after KMC events were added as a neon-green
  diamond marker category.
- 2026-06-25: `node scripts/refresh-kmc-trips.mjs` refreshed 28 KMC trip ideas from the
  Kaiserslautern American June 26, 2026 Issuu issue to `app/public/kmc-trip-ideas.json`.
- 2026-06-25: `npm run validate` passed in `app/`, including 28 KMC trip ideas from
  `2026-06-25T19:14:42.604Z`.
- 2026-06-25: `npm run build` and `npm test` passed after the Trip Ideas panel was added with
  10-second paging.
- Remaining automation: refresh the private family cache locally before deployment and reload
  event/news JSON in an already-open Chromium page. Pi deployment and forecast modal were verified
  on 2026-10-19.
