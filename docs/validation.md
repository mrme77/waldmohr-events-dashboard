# Validation

Current development checks and historical verification records. Reviewed on 2026-10-29.

## Latest Recorded Local Verification — 2026-10-29

The translation-cache work (merged as PR #48) was checked locally before merge, including after
rebasing onto then-current main:

- `cd app && npm test`: all 32 tests passed.
- `cd app && npm run validate`: cached datasets validated; the optional private family
  dataset also validated on that local installation. Its contents are not part of this record.
- `cd app && npm run build`: TypeScript and Vite production build passed.
- Final branch diff passed `git diff --check` after removing a trailing blank line.

Translation regression tests use mocked requests and temporary files. They cover persistence
across runs, zero API requests for unchanged recurrences, translating only new/edited text,
cache reuse without a key, German fallbacks, failed-request retry, invalid results, missing or
legacy caches, corruption/read errors, and model changes. No live paid translation requests
were made for these checks. This documentation update does not claim a new test run.

## Current Development Checklist

From `app/`, run `npm test`, `npm run validate`, and `npm run build`. To inspect the UI,
run `npm run dev` and open its local URL.

- Confirm the month calendar, right-rail weather/Homburg highlights, Napoli and St. Louis
  clocks, last-updated metadata, Next Up spotlight, and day details are present.
- Confirm news uses NPR/FOX 2 headlines from `public/news.json`, displays one complete
  wrapping headline, and changes every 30 seconds without continuous scrolling.
- Confirm clocks update at minute boundaries and the brand indicator has no pulse animation.
- Confirm calendar markers distinguish events, trash, holidays, flea markets, family and leave.
  Past events stay out of Next Up and Homburg highlights.
- Confirm day details keep the close control accessible, show public source QR codes instead
  of opening kiosk browser tabs, and place personal entries before public events.
- Confirm Homburg data preserves original German titles and official source URLs; the right
  rail shows up to three upcoming/current listings, using available English translations or
  source text when no translation exists.
- Confirm touching weather opens the screen-level seven-day forecast and closes through ×,
  outside tap, or Escape. Check at 375px, 768px, and 1024px without horizontal overflow.
- Confirm event/news JSON loads on mount; a reload is needed to read published changes.
  Weather independently refreshes every 15 minutes.

`npm run validate` includes Homburg and optional family validation. From the repository root,
individual validators can also be run as `node scripts/validate-<source>.mjs` for events, news,
trash, holidays, fleamarkets, homburg-events, or family. Family skips if its file is absent.

## Refresh and Translation Checks

The existing GitHub workflow is configured to refresh public data daily at 05:17 UTC, and can
be dispatched manually. Source failures are warned about while successful datasets proceed to
validation/publication. Repository configuration does not prove a scheduled run completed.

For an intentional live refresh, run `npm run refresh` from `app/`; this contacts external
sources and can incur translation usage when `OPENROUTER_API_KEY` is set. Keep secrets out of
commands and output. For Homburg-specific refresh, run `node scripts/refresh-homburg-events.mjs`
from the repository root, then `node scripts/validate-homburg-events.mjs`.

Inspect `homburg-events.json` and the refresh log:

- First successful translation refresh from a legacy payload populates `translationCache`.
- An unchanged source pair reuses its result; a new or changed title/summary is translated.
- `translatedListings` counts all available translations for distinct current listings;
  `reusedListings` and `newlyTranslatedListings` report reuse and new successes separately.
- Missing keys preserve cached English and retain source text for cache misses. Failed API
  translations are not cached and remain eligible for retry.
- A model change starts fresh; unreadable or corrupt saved caches fail visibly rather than
  silently triggering replacement paid requests.

Live cache population and actual usage savings have not been verified in this review.

## Pi Verification Still Required

The existing hourly deployment timer and forecast modal were confirmed in the 2026-10-19
handoff. The optimized replacement at `app/ops/deploy.sh` is locally tested and merged, but
installation into the Pi operations directory remains unverified. See `../app/README.md` for
installation commands and the earlier failed SSH attempt. Once installed, verify:

- A changed commit validates, builds, publishes, and attempts a Chromium refresh.
- A second unchanged run reports `No build needed`.
- Changed dependency inputs reinstall packages; unchanged inputs reuse them.
- Failed builds/publishes retry without advancing the published commit marker.
- Private `family.json` remains preserved at the destination.

The replacement's live Chromium refresh, temperature impact, and current timer health have
not been measured here. Local family-cache refresh before deployment and state-preserving
in-page event/news refresh remain pending.

## v1 Historical Checklist (retired 2026-06-09)
The v1 static app (`index.html`, `src/`) was removed; its checklist is kept for history only.
- Open `index.html` in a browser.
- Confirm the page shows last refreshed metadata.
- Confirm month cells render event markers.
- Confirm clicking an event opens details with source link and original German title.

## Historical Verification
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
- At the 2026-10-19 handoff, family-cache refresh and open-page JSON refresh remained pending.
  That dated Pi/forecast confirmation does not verify later deployment-script installation.
