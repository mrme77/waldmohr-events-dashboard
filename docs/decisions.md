# Decision Log

All architectural and design decisions.

## [2026-06-08] Start With A Static Local App
**Context**: The first need is a usable local calendar, not deployment or multi-user auth.
**Decision**: Build a static HTML/CSS/JS app with JSON data.
**Reason**: It can run locally, is easy to inspect, and keeps the initial refresh pipeline separate from UI complexity.
**Status**: Accepted.

## [2026-06-08] Use WordPress REST API Before HTML Scraping
**Context**: Waldmohr Aktuell exposes public WordPress REST endpoints.
**Decision**: The refresh script fetches structured posts from `wp-json/wp/v2/posts`.
**Reason**: Structured JSON is less brittle than parsing category pages.
**Status**: Accepted.

## [2026-06-08] Keep Translation Manual/Rule-Based In V1
**Context**: The user wants current content, but no paid translation service has been selected.
**Decision**: V1 uses curated English event records and a refresh script that preserves source German text for review.
**Reason**: Avoids hardcoding API keys and avoids pretending machine translation quality has been verified.
**Status**: Accepted.

## [2026-06-09] Move To A Pi 5 Touch + Voice Kiosk (v2)
**Context**: Goal shifted from a browsable web app to an always-on, wall-mounted dashboard on a
Raspberry Pi 5 (8 GB, 1 TB NVMe) with a touchscreen, for the KMC area.
**Decision**: Rebuild as a single-page kiosk: dual clocks, calendar, weather, news ticker, voice.
**Reason**: A glanceable always-on display with optional touch/voice is a different product than a
browse-and-click site.
**Status**: Accepted.

## [2026-06-09] Adopt Vite + React + TypeScript
**Context**: v2 composes 5+ live widgets, each with its own refresh interval, plus secret handling.
**Decision**: Migrate from static HTML/JS to Vite + React + TypeScript, served by a small local
Node server.
**Reason**: Multi-widget live composition and a build step (env vars, real `fetch`, HMR) justify a
framework; the rendering alone would not. Supersedes the v1 "static local app" decision for v2.
**Status**: Accepted.

## [2026-06-09] Decouple Ingestion From Presentation
**Context**: New sources (Kaiserslautern, Ramstein, Google Calendar, trash, news) are heterogeneous
— HTML scrapes, headless rendering, iCal, RSS. None share the WordPress API shape.
**Decision**: Per-source adapters in `scripts/` run as low-frequency cron jobs that normalize to a
shared event schema and write JSON (optional SQLite for history). The frontend only reads cached
JSON and hits fast keyless APIs (Open-Meteo).
**Reason**: Keeps heavy/brittle scraping off the render path and isolates each source's fragility.
The adapter pattern is the core architectural move, independent of the frontend framework.
**Status**: Accepted.

## [2026-06-09] Drop Filters; Color By Category; Tap For Detail
**Context**: A glanceable kiosk has little use for tag-filter checkboxes and click-to-open panels.
**Decision**: Remove tag filters and the detail panel. One calendar, color = category
(Fun/Public · Family Sports · Leave · Trash · Civic), tap a day/dot → detail popover. City shown
inside the popover, not as a second color dimension.
**Reason**: Single color dimension stays readable at a glance; touch handles drill-down.
**Status**: Accepted.

## [2026-06-09] Family Layer From Owned Sources, Not Manual Entry
**Context**: Family events (sports, leave, trash) need input, but typing on a kiosk is painful.
**Decision**: Pull family events from a Google Calendar private iCal URL; pull trash days from the
Landkreis Kusel waste portal's iCal export. No manual entry UI.
**Reason**: The family already edits Google Calendar on their phones; trash has an official feed.
Both are keyless iCal, easier than the HTML scrapers.
**Status**: Accepted.

## [2026-06-09] Keyless Sources And Local STT To Minimize Secrets
**Context**: Each external key is a liability (storage, rotation, GDPR transfer).
**Decision**: Weather = Open-Meteo (keyless); news = RSS (keyless); STT = local whisper.cpp on the
Pi 5 (no cloud STT). Only OpenRouter (voice reasoning) and the Google iCal URL are secret, both held
server-side only.
**Reason**: The Pi 5 is fast enough for local STT; minimizing keys reduces both ops burden and data
exposure. See `docs/compliance.md`.
**Status**: Accepted.

## [2026-06-09] GDPR Household Exemption; Keep Family Layer Local
**Context**: User asked to respect EU data law.
**Decision**: Rely on the GDPR Art. 2(2)(c) household exemption: the family/personal layer stays
local-network only and is never publicly broadcast. Scrapers store minimal fields, attribute +
link sources, honor robots.txt, and run at low frequency.
**Reason**: The exemption holds only while personal data is not published; "leave" data is also a
security concern. Real legal exposure is copyright / sui generis DB right, mitigated by minimal
storage + attribution. Full posture in `docs/compliance.md`.
**Status**: Accepted.

## [2026-06-09] v2 App Lives In `app/`; "Civic Departure Board" Aesthetic
**Context**: v2 is a Vite app; the v1 static files still work and shouldn't be disturbed mid-build.
**Decision**: Scaffold the v2 app under `app/` (its own `package.json`). Adopt a "Civic Departure
Board" visual direction: high-contrast dark, Fraunces serif headings × Archivo UI × JetBrains Mono
numerals, layered glow + grain background, live pulse, staggered load reveal.
**Reason**: Keeps v1 intact during migration; a committed, distinctive aesthetic avoids generic
dark-mode and suits an always-on broadcast board read from across a room.
**Status**: Accepted. v1 retired once v2 reaches parity.

## [2026-06-09] Retire The v1 Static App
**Context**: The v1 static dashboard (`index.html`, `src/`) froze "today" at a hardcoded date
(`src/app.js`), and maintaining two UIs over one data source risked drift.
**Decision**: Delete `index.html`, `src/`, and the `data/events.js` window-global shim; drop the
shim write from `scripts/refresh-events.mjs`. The Vite app in `app/` is the only UI.
**Reason**: v2 already covers v1's function with live `new Date()` handling via `useNow()`; one UI
removes the drift risk and the stale-date bug with it. `data/events.json` remains the pipeline
source of truth alongside `app/public/events.json`.
**Status**: Accepted.

## [2026-06-10] Drop Voice; No Local Node Server
**Context**: Voice (local whisper.cpp STT + OpenRouter reasoning, proxied by a local Node server)
was planned in the "Move To A Pi 5 Touch + Voice Kiosk", "Adopt Vite + React + TypeScript", and
"Keyless Sources And Local STT" decisions above.
**Decision**: Drop voice entirely — no STT, no OpenRouter, no Node server. The kiosk is
touch-only and fully static (Vite build served as-is). A TTS read-aloud idea was also parked.
**Reason**: The touch dashboard is sufficient on its own; dropping voice removes the project's
only paid/keyed dependency and the only reason a backend server was needed.
**Status**: Accepted. Supersedes the voice/STT/OpenRouter/Node-server parts of the three
2026-06-09 decisions referenced above.

## [2026-06-10] Drop Kaiserslautern/Ramstein Scrapes; Add Homburg Flea Markets
**Context**: Kaiserslautern (TYPO3 HTML scrape) and Ramstein-Miesenbach (headless-Chromium scrape)
were planned as additional event sources in "Decouple Ingestion From Presentation".
**Decision**: Drop both. Add a Homburg Flohmarkt adapter (`scripts/refresh-fleamarkets.mjs`)
instead, using a maintained table of official yearly dates from homburg.de.
**Reason**: Flea markets were wanted over more municipal event scrapes, and a maintained-table
source is far less brittle than a headless-Chromium scrape.
**Status**: Accepted. Supersedes the Kaiserslautern/Ramstein sources named in the 2026-06-09
"Decouple Ingestion From Presentation" decision.

## [2026-06-13] Add Kaiserslautern American UNTERWEGS As KMC Events
**Context**: The Kaiserslautern American digital edition publishes an `UNTERWEGS` section with
KMC-area event listings useful to the family, and the Issuu reader exposes the rendered page text
through public SVG page assets.
**Decision**: Add `scripts/refresh-kmc.mjs` and `scripts/validate-kmc.mjs`. The adapter discovers
the current issue from the Kaiserslautern American homepage embed, reads Issuu document metadata,
fetches page SVG text, parses `UNTERWEGS` event blocks, and writes `kmc-events.json` to both
`data/` and `app/public/`. The frontend loads it as an optional calendar layer.
**Reason**: This keeps the KMC magazine source isolated from Waldmohr Aktuell while reusing the
existing normalized event schema. It avoids browser automation and new dependencies by using
public text-bearing SVG assets. Dates without an explicit year are inferred from the issue year and
marked with `dateConfidence: "inferred"`.
**Operational note**: New digital issues usually appear on Fridays. Manual refresh is
`cd app && npm run refresh:build`; an automated Friday PR can be added later, but scheduled
refreshes remain an ask-first project boundary.
**Status**: Accepted.

## [2026-06-18] Drop The data/ Tree; app/public/ Is The Only Cache
**Context**: Every adapter dual-wrote each payload to both `data/*.json` and `app/public/*.json`,
and each validator checked both copies. Once the v1 static app was retired, only `app/public/`
is fetched by the app — the `data/` copies were byte-identical, read by nothing, and validated
only against themselves. An over-engineering audit flagged the duplication; investigation found no
CI, build step, or external script that consumes `data/`.
**Decision**: Delete the `data/` tree. Refresh and validate scripts now target a single
`app/public/*.json` cache each. The dual-write arrays, the validator's "caches out of sync" check,
and the `data/family.json`/`data/raw/` gitignore entries are removed.
**Reason**: A second identical copy that nothing reads is pure drift risk and doubled validation
work. One cache, served and validated in place, removes both.
**Status**: Accepted. Supersedes the "`data/events.json` remains the pipeline source of truth"
note in the 2026-06-09 "Retire The v1 Static App" decision and the dual `data/` + `app/public/`
write described in the 2026-06-13 KMC decision.

## [2026-06-25] Add OpenRouter-Backed KMC Trip Summaries
**Context**: Some Kaiserslautern American issues do not publish `UNTERWEGS`, but the broader issue
can still contain useful day trips, attractions, vacations, tours, hikes, markets, and places to
visit. The SVG text layer already used by the KMC event adapter exposes issue text without browser
automation.
**Decision**: Add a separate KMC trip-summary adapter that reuses shared Issuu issue discovery and
SVG text extraction, scans the whole issue in bounded page chunks, and calls OpenRouter with
`google/gemini-2.5-flash` to produce structured `kmc-trip-ideas.json`. The dashboard renders the
cache as an optional right-rail Trip Ideas panel, three ideas at a time, rotating every 10 seconds
with manual previous/next controls.
**Reason**: Trip summaries are recommendation-style content, not dated calendar events. Keeping
them in a separate payload avoids polluting the event schema while still surfacing useful family
outing ideas. The OpenRouter key stays local to refresh time in `.env`; no secret is shipped to
the client, and every displayed idea links back to the originating Issuu page.
**Operational note**: The adapter skips cleanly when the OpenRouter key is absent and preserves a
previous non-empty cache where possible. It retries malformed model JSON once with a stricter
prompt and then skips only the failed chunk so one bad model response does not lose the whole
issue.
**Status**: Accepted. This does not reverse the 2026-06-10 voice decision: OpenRouter is used only
for offline ingestion, not for a live voice assistant or backend.
