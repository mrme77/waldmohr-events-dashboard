# Dashboard: application and Raspberry Pi handoff

Reviewed against current development on 2026-10-29, including merged translation-cache PR #48 (`3f5039a`). This review checks repository behavior. The latest recorded Pi observations are listed separately below; the Pi was not contacted during this review.

The repository-root [README](../README.md) is the public overview and setup guide. This file holds the internal deployment handoff. [docs/validation.md](../docs/validation.md) records checks, and [progress.md](../progress.md) tracks completed work and remaining gaps.

## Current application behavior

The application is a static Vite + React + TypeScript dashboard with no application backend. It reads normalized JSON files from `public/`; weather is fetched directly from Open-Meteo every 15 minutes.

The calendar combines Waldmohr events, trash collections, public holidays, Homburg flea markets, official Homburg events, and an optional private family calendar. Only the Waldmohr feed is required. Family data remains gitignored. The right rail contains weather, Napoli/St. Louis clocks, Homburg highlights, and upcoming events. NPR and FOX 2 St. Louis headlines appear one at a time, changing every 30 seconds without scrolling or transition animations. The brand indicator is static; clocks update at minute boundaries.

Source websites appear as locally generated SVG QR codes in event details, with instructions to scan using a phone camera. No external QR service receives the source URL. Invalid or unsupported URLs show an unavailable message. Homburg cards open day details instead of another browser tab. Close details with the × button or by tapping outside them.

Personal entries appear before public events in day details, showing their description and location without a QR code. The close control stays visible while scrolling. Napoli and St. Louis clocks stack when the sidebar is narrow, and city/time rows and refresh metadata can wrap.

The weather card opens a seven-day forecast with daily conditions, highs/lows, and precipitation probability. The screen-level modal avoids sidebar clipping, expands up to 700px, and fits the screen width. Close it with ×, an outside tap, or Escape.

## Public data refresh and translation cache

The GitHub Actions `Refresh Dashboard Data` workflow is scheduled daily at 05:17 UTC and also supports manual runs. It fetches public sources, validates the payloads, and commits refreshed JSON files. Transient source failures are retried, including three attempts for the trash calendar. A failed adapter produces a warning while successful datasets continue through validation and publication; the failed adapter's previous file remains available.

Homburg translations use OpenRouter `minimax/minimax-m3.1-flash`, a paid route. The former `:free` launch route was retired in October 2026 and replaced after returning 404s. New translations require the repository Actions secret `OPENROUTER_API_KEY`; the Pi needs no translation key because it deploys generated JSON.

PR #48 saves successful translations in `homburg-events.json` under `translationCache`, keyed by the original German title and summary and scoped to the configured model. Unchanged listings and recurring occurrences reuse those translations across runs. Only new or edited text is sent for translation. Cached English is also reused without an API key; uncached or failed text stays in German and is eligible for retry later. Successful entries survive temporarily absent listings. Changing the model starts a fresh cache.

The first refresh after this fix populates the cache because older payloads did not preserve original summaries. Cache population and savings have not been verified against a live post-merge refresh. An unreadable or corrupt saved cache fails the adapter visibly rather than silently repeating paid requests.

Each Homburg payload records `model`, `translatedListings` (available translations among current distinct listings), `totalListings`, `reusedListings`, and `newlyTranslatedListings`. The workflow log separates reused translations, new translations, and German fallbacks. German originals and official source links remain available.

## Latest recorded Pi observations

On 2026-10-19, the Pi was reported running successfully with an HDMI touchscreen and Chromium. Its hostname is `myai`. The inspected `waldmohr-deploy.timer` runs five minutes after boot and one hour after each deployment finishes. Its service runs `/home/pasquale/dashboard-ops/deploy.sh` as `pasquale`. That service script fast-forwards the checkout from `origin/main`, validates/builds, and publishes `app/dist/` into `/var/www/waldmohr/`, preserving the private deployed `family.json`.

At that inspection, `GCAL_ICS_URL` was configured and a local `app/public/family.json` existed, last modified 2026-10-18 15:21 CEST. The deployment process did not refresh that private feed. These are historical observations, not a current check of Pi configuration or data freshness.

The full-width forecast modal (PR #41, following PR #40) was merged, deployed, and confirmed working by the user on the Pi touchscreen on 2026-10-19. Source QR codes, personal entries before public QR cards, and responsive clock layout were implemented in PRs #37–#39.

The optimized deployment script described below is committed in the repository, but its installation at the service path remains unverified. The last recorded installation attempt on 2026-10-25 could not reach `192.168.1.46` (`No route to host`). Neither current timer health nor the deployed commit has been checked since. A merge alone does not prove that this service script was replaced or that Chromium reloaded.

## Versioned deployment script and installation

`app/ops/deploy.sh` implements the lower-load deployment path. It keeps a lock and a clean-checkout requirement, fetches `origin/main`, and fast-forwards the checkout. It records the last successfully published commit in `~/dashboard-ops/published-commit`. When that commit is unchanged and the published `index.html` exists, it skips installation, validation, build, and publication. The first run establishes the marker by building and publishing once; failed builds or rsync runs do not advance it.

Dependency installation runs on the first deployment or after changes to app manifests, lockfile, npm configuration, Node/npm versions, install environment, or missing installation markers/tools. Other changed commits reuse installed dependencies. Successful publication preserves private `family.json` and attempts a Chromium hard refresh through `wtype`. A failed refresh command emits a warning; command success is not a visual confirmation that Chromium reloaded. When an unchanged deployment is skipped, no refresh keystroke is attempted.

The existing service and timer can keep their configuration, but the service uses its copy in `~/dashboard-ops/`, not the repository file directly. After the current code is pulled onto the Pi, install the replacement there:

```sh
cp "$HOME/dashboard-ops/deploy.sh" "$HOME/dashboard-ops/deploy.sh.backup-$(date +%Y%m%d-%H%M%S)"
install -m 755 "$HOME/Desktop/waldmohr-events-dashboard/app/ops/deploy.sh" "$HOME/dashboard-ops/deploy.sh"
sudo systemctl start waldmohr-deploy.service
journalctl -u waldmohr-deploy.service -n 50 --no-pager
```

Confirm publication and check the screen for updated data. Run the service again after completion and confirm `No build needed`. Installation and those live checks remain outstanding; no Pi temperature improvement has been measured. The display schedule and Chromium launch command have not been checked.

## Remaining automation work

- Refresh the private family calendar locally before deployment while keeping `family.json` outside Git and preserving its deployed private copy.
- Re-fetch event/news JSON within an already open dashboard while preserving the selected month and day. The current frontend loads those datasets on mount; weather alone polls periodically. A full Chromium reload can load fresh JSON but resets application state.
- Verify which deployment script is installed, timer health, the published commit, and Chromium refresh on the Pi. The recorded hourly timer should pull merged code if it is still healthy; this has not been checked live.

## Local operation and verification

From `app/`:

```sh
npm run build          # TypeScript check and static production build
npm test               # Script, cache, deployment, and UI regression tests
npm run validate       # Validate cached data; private family cache is optional
npm run refresh:build  # Fetch sources, validate, and rebuild
```

On 2026-10-29, the translation-cache change passed all 32 tests, data validation, and the production build, including checks repeated after rebasing onto current `main`. Cache tests use simulated responses and cover persistence, no requests for unchanged recurrences, edited text, missing API keys, failures/retries, and corrupt caches. No live paid translation requests were made during those checks.

Earlier local browser checks for the lower-load UI at 375px, 768px, and 1024px found no horizontal overflow; headlines fit their container and headline/brand elements had no CSS animation. Those checks reported an existing missing favicon (404). They do not establish current visual behavior or temperature on the physical Pi.

## Historical implementation notes

- `9dd58ba` added the official Homburg calendar adapter, cache, validator, and calendar layer.
- `2fa3616` replaced KMC magazine event/trip ingestion and the Trip Ideas card with three official Homburg highlights. KMC features described in older planning entries are historical.
- `484dd0b` refreshed committed public JSON caches without UI changes.
- PR #47 merged the lower-load UI and versioned optimized deployment script. Repository implementation is complete; service-copy installation on the Pi remains unverified.
- PR #48 merged persistent Homburg translation caching. The next successful configured refresh can populate the cache; it requires no Pi-side API key or translation process.

For recovery from an old external source tab in kiosk mode, a keyboard can use **Ctrl+Shift+Tab** to return to the previous tab or **Ctrl+W** to close the source tab. Avoid closing the dashboard tab itself. Current QR-based source navigation prevents that tab-switching problem. Embedding arbitrary source websites is unreliable because sites may prohibit iframes.
