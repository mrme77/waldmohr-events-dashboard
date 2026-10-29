# Plan

Reviewed against repository source on 2026-10-29, including merged PRs #47 and #48.
This file describes current development; historical phases are listed separately below.

## Current dashboard

The application is a static Vite, React, and TypeScript touch dashboard for a Raspberry Pi 5.
It focuses on Waldmohr and nearby Homburg for an American family in the KMC area.

- Calendar layers: Waldmohr events, official Homburg events, Homburg flea markets, Kusel trash
  collections, Rheinland-Pfalz public holidays, and an optional private family calendar.
- News: NPR USA and FOX 2 St. Louis RSS. One wrapping headline appears at a time and changes
  every 30 seconds; it does not scroll continuously.
- Clocks: Napoli (`Europe/Rome`) and St. Louis (`America/Chicago`), updated at minute boundaries.
- Right rail: weather, clocks, the next three Homburg listings, and upcoming events.
- Event details show source QR codes for opening official pages on a phone. Family entries
  appear before public entries and do not receive source QR codes.
- Weather: live Open-Meteo conditions and a seven-day forecast in a screen-level modal;
  the browser refreshes weather every 15 minutes.

## Data and deployment

Public-source adapters run in GitHub Actions daily at **05:17 UTC** and can also be triggered
manually. They write `app/public/*.json`, which the workflow validates and commits. A failed
adapter produces a warning while validation and publication continue for successful datasets.
The private family adapter requires local `GCAL_ICS_URL`; the public workflow does not supply it.

| Adapter | Current source |
|---|---|
| `scripts/refresh-events.mjs` | Waldmohr Aktuell WordPress REST API |
| `scripts/refresh-news.mjs` | NPR USA and FOX 2 St. Louis RSS |
| `scripts/refresh-trash.mjs` | Landkreis Kusel waste iCal |
| `scripts/refresh-holidays.mjs` | Nager.Date public holidays |
| `scripts/refresh-fleamarkets.mjs` | Maintained table of official Homburg dates |
| `scripts/refresh-homburg-events.mjs` | Official Homburg city-calendar JSON feed |
| `scripts/refresh-family.mjs` | Private Google Calendar iCal |

The browser reads these JSON files on mount; it has no backend server and does not periodically
re-fetch event or news JSON. A full browser reload loads newly published datasets but resets
the current view. Refreshing those datasets while preserving the selected month and day remains
an open task.

Homburg translations use OpenRouter `minimax/minimax-m3.1-flash` when `OPENROUTER_API_KEY` is
available. PR #48 saves successful translations in `homburg-events.json`, keyed by the original
German title and summary. Unchanged text reuses the cache, including without an API key; only
new or edited text is sent for translation. Failed or missing translations retain German and
can be retried. The first refresh populates the cache; changing the model starts a fresh cache.
The Pi deploys the generated JSON and does not need the OpenRouter key.

The Pi's hourly deployment timer was previously operator-confirmed. The current repository
deployment script, `app/ops/deploy.sh`, pulls `main`, skips work when the published commit is
unchanged, reuses dependencies when their inputs are unchanged, validates/builds changed
commits, and publishes `app/dist` while preserving the private family JSON. After a successful
publish it attempts a Chromium refresh and warns if the keystroke fails.

**Installation of this optimized script on the Pi is unverified.** Its source file is versioned
separately from the operations copy used by the Pi service. Pulling `main` alone does not prove
the service uses the optimized script. See the internal [Pi handoff](app/README.md) for installation
and verification steps. No new live Pi check was performed for this documentation review.

## Secrets and privacy

- `GCAL_ICS_URL`: private Google Calendar iCal URL, used only by the family refresh adapter.
- `OPENROUTER_API_KEY`: used only during Homburg translation refreshes, configured as an Actions
  repository secret or in the local root `.env`.
- Secrets never ship to the browser. `family.json` is gitignored and must stay local/private.

## Remaining work

1. Verify installation of the optimized deployment script on the Pi; confirm unchanged runs
   report `No build needed` and changed runs publish and refresh Chromium successfully.
2. Refresh the Pi's private family cache locally before deployment, retaining it outside Git.
3. Refresh event/news JSON in the open page without losing the current month or selected day.
4. Verify the first post-#48 refresh populates the translation cache and a later unchanged
   refresh reports reuse. Local mocked tests passed previously; live cache behavior has not
   been confirmed in this documentation review.

## Historical phases

These phases explain earlier work and are not a list of current adapters or planned features.

- **v1:** shipped a static HTML/CSS/JS calendar, then retired it in favor of Vite in June 2026.
- **v2 phases 1–4:** shipped the kiosk shell, live Waldmohr events, weather, and RSS headlines.
  The original St. Louis source was KSDK; the current adapter uses FOX 2.
- **Phases 5–6:** added Homburg flea markets, trash collections, public holidays, and the family
  calendar. Proposed Kaiserslautern/Ramstein scrapes were dropped.
- **Voice:** dropped on 2026-06-10; the application remains touch-only and static.
- **Phases 7/7b:** shipped KMC magazine events and trip summaries, then removed those adapters,
  caches, and UI in October 2026 in favor of official Homburg events and highlights.
- **Pi deployment:** the hourly timer was operator-confirmed on 2026-10-19; PRs #40–#41 shipped
  the forecast modal, which the user confirmed on the Pi. PR #47 added lower-load UI and the
  optimized deployment script; that script's Pi installation remains unverified.
- **PR #48:** merged persistent Homburg translation reuse, with 32 local tests, data validation,
  and production build passing during implementation.

See [docs/decisions.md](docs/decisions.md) for decisions and
[docs/validation.md](docs/validation.md) for validation records.
