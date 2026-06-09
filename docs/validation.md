# Validation

How to verify the dashboard works.

## Checklist
- Open `index.html` in a browser.
- Confirm the page shows last refreshed metadata.
- Confirm month cells render event markers.
- Confirm clicking an event opens details with source link and original German title.
- Run `node scripts/validate-events.mjs`.
- Optional: run `node scripts/refresh-events.mjs`, then validate again.

## Last Run
- 2026-06-08: `node scripts/validate-events.mjs` passed.
- Result: `Validated 6 events from 2026-06-08T15:30:00+02:00.`
- 2026-06-08: Browser QA via local server `http://127.0.0.1:4173/` passed.
- Result: rendered six event cards, search narrowed to the museum event, details panel opened, mobile 375px had no horizontal overflow, and browser console had no warnings/errors.
