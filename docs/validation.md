# Validation

How to verify the dashboard works.

## v2 Checklist
- From `app/`, run `npm run build`.
- From `app/`, run `npm run dev` and open the Vite URL.
- Confirm the page shows the news-marquee slot, dual clocks, last-updated metadata, calendar, spotlight, and detail popover.
- Confirm `app/public/events.json` is loaded via `/events.json`.
- Confirm month cells render category-colored event markers.
- Confirm selecting a day/event opens details with source link, original German title, post date, last checked date, and date confidence.
- Confirm past events do not appear in "Next Up".
- Run `node scripts/validate-events.mjs`.
- Optional: run `node scripts/refresh-events.mjs`, then validate again and confirm `app/public/events.json` changed.

## v1 Historical Checklist
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
- Remaining: visual browser QA/demo for the v2 app in a normal browser.
