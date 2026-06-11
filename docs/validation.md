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
- Confirm trash, holiday, flea-market, and family events render on the calendar with the correct
  category colors.
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

## v1 Historical Checklist (retired 2026-06-09)
The v1 static app (`index.html`, `src/`) was removed; its checklist is kept for history only.
- Open `index.html` in a browser.
- Confirm the page shows last refreshed metadata.
- Confirm month cells render event markers.
- Confirm clicking an event opens details with source link and original German title.

## Last Run
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
- Remaining: none for the MVP. Next validation milestone is Pi 5 deployment (plan.md Phase 8).
