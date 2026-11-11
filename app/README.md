# Dashboard: application and Raspberry Pi handoff

Reviewed against the connection-indicator and Desktop-button development branch on 2026-11-11, including earlier translation-cache PR #48 (`3f5039a`). Local implementation and tests are separate from Pi installation and observed behavior.

The repository-root [README](../README.md) is the public overview and setup guide. This file holds the internal deployment handoff. [docs/validation.md](../docs/validation.md) records checks, and [progress.md](../progress.md) tracks completed work and remaining gaps.

## Current application behavior

The application is a static Vite + React + TypeScript dashboard with no application backend. It reads normalized JSON files from `public/`; weather is fetched directly from Open-Meteo every 15 minutes.

The calendar combines Waldmohr events, trash collections, public holidays, Homburg flea markets, official Homburg events, and an optional private family calendar. Only the Waldmohr feed is required. Family data remains gitignored. The right rail contains weather, Napoli/St. Louis clocks, Homburg highlights, and upcoming events. NPR and FOX 2 St. Louis headlines appear one at a time, changing every 30 seconds without scrolling or transition animations. The header shows internet status and a Desktop control; clocks update at minute boundaries.

Source websites appear as locally generated SVG QR codes in event details, with instructions to scan using a phone camera. No external QR service receives the source URL. Invalid or unsupported URLs show an unavailable message. Homburg cards open day details instead of another browser tab. Close details with the × button or by tapping outside them.

Personal entries appear before public events in day details, showing their description and location without a QR code. The close control stays visible while scrolling. Napoli and St. Louis clocks stack when the sidebar is narrow, and city/time rows and refresh metadata can wrap.

The weather card opens a seven-day forecast with daily conditions, highs/lows, and precipitation probability. The screen-level modal avoids sidebar clipping, expands up to 700px, and fits the screen width. Close it with ×, an outside tap, or Escape.

## Internet indicator (development branch)

The header replaces the decorative green dot with a Wi-Fi-shaped internet status
button. It checks external HTTPS access through the existing Open-Meteo provider
on startup, every 30 seconds while the page is visible, when the page becomes
visible again, and when the browser reports reconnection. Tapping it retries the
check. Each request bypasses the HTTP cache and times out after eight seconds.
These checks do not refresh news/events or call the translation service.

Green `Internet connected` means the external check succeeded. Red `No network`
means the browser reports no network connection. Amber `Check connection` means
internet access could not be verified; an Open-Meteo outage can also cause this
state. The initial label is `Checking internet`. The button's tooltip includes the
check result and, for a successful check, its timestamp. The browser cannot report
the Pi's Wi-Fi signal strength or distinguish its Wi-Fi adapter from Ethernet.

Local verification: all 44 automated tests and the production build passed.
Browser checks with simulated successful and failed responses covered internet
verification, offline/reconnect events, manual retry, and 375px, 768px, 1024px,
and 1280px widths without horizontal overflow. The status button has a 44px touch
target. These changes are prepared for PR review and have not been deployed or checked on the Pi. Cached-data validation also passed; it does not establish source freshness.

### Pi touchscreen and on-screen keyboard

Earlier notes identify a 7-inch HDMI touchscreen, but do not identify its model.
The operator identified labwc and tentatively reported `http://localhost:8080`
as the dashboard address; its launch settings have not been inspected directly.
Touchscreen detection, display scale, and the desktop keyboard need to be checked
on the physical Pi. Browser zoom does not set the desktop keyboard's size.
Read-only diagnostic commands for an existing Pi terminal session:

```sh
cat /etc/os-release
wlr-randr
pgrep -a -f 'squeekboard|onboard|labwc|wayfire'
```

`wlr-randr` may be unavailable or may require the graphical session's Wayland
environment. Report that error rather than assuming the display's scale. No Pi
configuration changes or package installations have been made for this feature.

### Desktop button and returning to the dashboard

The `Desktop` button beside the connection indicator requests that Chromium
minimize the dashboard window, keeping its calendar selection and page open.
Click Chromium's taskbar entry to restore the dashboard. This is separate from
the web Fullscreen API, which cannot minimize Chromium's kiosk window.

This feature uses the Manifest V3 extension in `ops/desktop-extension/`; no
application server or additional npm package is required. It accepts only HTTP
pages on `localhost` and `127.0.0.1`, including `http://localhost:8080`. Other
machines opening the dashboard through a LAN IP do not get desktop controls.
The extension can minimize only the window containing the requesting tab; it
has no shell-command feature and requests no browser-wide permissions. Without
the extension, the Desktop button is disabled and explains that setup is needed.

After the branch is reviewed, merged, and pulled onto the Pi, perform this
one-time setup in the same Chromium profile that runs the dashboard:

1. Open `chrome://extensions` (leave kiosk mode or close the dashboard window
   temporarily if necessary).
2. Enable **Developer mode**, then choose **Load unpacked**.
3. Select `/home/pasquale/Desktop/waldmohr-events-dashboard/app/ops/desktop-extension`.
4. Reopen or reload the dashboard at its local address. If Chromium runs the
   dashboard in incognito mode, also enable **Allow in incognito** for this
   extension in its details.
5. Tap **Desktop**, confirm the Pi desktop appears, then click Chromium on the
   taskbar. Check that the dashboard returns fullscreen with its selection intact.

The extension files are read from the repository checkout rather than the static
`dist/` publish directory. Reload the extension in `chrome://extensions` after
future updates to these files. No extension has been installed on the Pi yet.

Verification: tests cover loopback address restrictions, matching requests and
responses, minimizing only the sending window, timeouts, cancellation, and
explicit browser API failures. Browser UI checks used a simulated helper to
verify the disabled/enabled states, preserved page, visible failure message,
retry, and 44px buttons at 375px, 768px, 1024px, and 1280px without horizontal
overflow. The extension-enabled browser test could not launch because that
Playwright browser executable is not installed; no browser was downloaded.
Native minimization, fullscreen restoration, and taskbar access on labwc still
need the manual Pi check above.

## Public data refresh and translation cache

The GitHub Actions `Refresh Dashboard Data` workflow is scheduled daily at 05:17 UTC and also supports manual runs. It fetches public sources, validates the payloads, and commits refreshed JSON files. Transient source failures are retried, including three attempts for the trash calendar. A failed adapter produces a warning while successful datasets continue through validation and publication; the failed adapter's previous file remains available.

Homburg translations use OpenRouter `minimax/minimax-m3.1-flash`, a paid route. The former `:free` launch route was retired in October 2026 and replaced after returning 404s. New translations require the repository Actions secret `OPENROUTER_API_KEY`; the Pi needs no translation key because it deploys generated JSON.

PR #48 saves successful translations in `homburg-events.json` under `translationCache`, keyed by the original German title and summary and scoped to the configured model. Unchanged listings and recurring occurrences reuse those translations across runs. Only new or edited text is sent for translation. Cached English is also reused without an API key; uncached or failed text stays in German and is eligible for retry later. Successful entries survive temporarily absent listings. Changing the model starts a fresh cache.

The first refresh after this fix populates the cache because older payloads did not preserve original summaries. An operator-supplied refresh log reports 31 reused translations, 0 newly translated, 0 German fallbacks, and 450 occurrences. This confirms reuse for that run and explains the absence of new OpenRouter activity; the first population run and current scheduled-run health were not independently inspected. An unreadable or corrupt saved cache fails the adapter visibly rather than silently repeating paid requests.

Each Homburg payload records `model`, `translatedListings` (available translations among current distinct listings), `totalListings`, `reusedListings`, and `newlyTranslatedListings`. The workflow log separates reused translations, new translations, and German fallbacks. German originals and official source links remain available.

## Latest recorded Pi observations

During the November session, the operator confirmed SSH access as `pasquale` to
`myai` at `192.168.1.46` after restoring its network connection, and identified
labwc from process output. The automated SSH check from this workspace was
rejected because it had no accepted authentication. Display scaling, touchscreen
model, deployment-script installation, and extension operation remain unverified.

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
