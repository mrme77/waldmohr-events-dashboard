# Dashboard: current application and Pi notes

Reviewed 2026-10-18 against commits `9dd58ba`, `2fa3616`, and `484dd0b`.

## Current behavior

The application is a static Vite + React + TypeScript dashboard. It reads
normalized JSON caches from `public/`; weather is fetched live from Open-Meteo.
There is no application backend. The user reports it is now running successfully
on a Raspberry Pi with an HDMI touchscreen and Chromium.

The calendar merges Waldmohr events, trash collections, public holidays,
Homburg flea markets, official Homburg events, and an optional private family
calendar. Only the Waldmohr feed is required. Family data remains gitignored.
The right rail contains weather, Napoli/St. Louis clocks, Homburg highlights,
and upcoming events. News headlines scroll across the top.

## Changes made on the other platform

- `9dd58ba`: added the official Homburg city calendar adapter, cache, validator,
  and calendar layer.
- `2fa3616`: replaced KMC magazine event/trip ingestion and the rotating Trip
  Ideas card with a panel showing three Homburg listings. The refresh adapter
  translates distinct German titles and summaries through OpenRouter when
  `OPENROUTER_API_KEY` is configured, retaining German on translation failure.
  Original titles and official source URLs remain in the normalized events.
- `484dd0b`: refreshed the committed public JSON caches; no UI changes.

The repository-root README still describes removed KMC adapters, Trip Ideas,
and a pending Pi deployment. Use the current source and this note when those
historical descriptions disagree.

## External links on the touchscreen

Previously, both `EventDetail.tsx` and `HomburgHighlights.tsx` used links with
`target="_blank"`. These open a separate Chromium tab. In kiosk mode the browser
controls are hidden, so the touchscreen has no visible tab switcher or back
button. The dashboard cannot draw a return button over an unrelated website
once that website occupies the screen.

With a keyboard, try **Ctrl+Shift+Tab** to return to the previous tab, or
**Ctrl+W** to close the source tab. Avoid closing the dashboard tab itself.
These are recovery steps, not a permanent touchscreen solution.

The implemented solution keeps the Pi on the dashboard: source websites appear
as QR codes in event details, with instructions to scan using a phone camera.
Homburg cards open day details rather than a browser tab. Close the details using
the × button or by tapping outside them. QR codes are SVGs generated locally by
`qrcode.react`; no external QR service receives the source URL. Invalid or
unsupported URLs show an unavailable message instead of a code.

Personal entries from the family calendar appear before public events in day
details so birthdays and leave are visible before the larger source QR cards.
Personal entries show their description and location without a QR code. The
close control stays visible while scrolling. The news marquee loops in 50 seconds.

The clock panel adapts to its own available width: Napoli and St. Louis stack
when the sidebar is narrow, including on small HDMI displays. City/time rows and
refresh metadata can wrap instead of overlapping at larger text sizes.

Embedding source sites in an iframe is not a reliable universal replacement:
external websites may prohibit embedding. Changing links to the same tab alone
also leaves kiosk users without a visible way back.

The Waldmohr weather card opens a seven-day forecast (daily condition, high/low,
and precipitation probability) in a touch-friendly panel. The existing keyless
Open-Meteo request returns both current conditions and the forecast; close the
panel with its × button, an outside tap, or Escape.

## Pi automation handoff (2026-10-19)

The Pi hostname is `myai`. Its `waldmohr-deploy.timer` runs five minutes after
boot and one hour after each deployment finishes. The service runs
`/home/pasquale/dashboard-ops/deploy.sh` as `pasquale`. That script fast-forwards
the checkout from `origin/main`, runs `npm ci`, `npm run validate`, and
`npm run build`, then rsyncs `app/dist/` into `/var/www/waldmohr/`, excluding
`family.json` so its private copy at the deploy destination is preserved.

The Pi has `GCAL_ICS_URL` configured and a local `app/public/family.json` cache
last modified 2026-10-18 15:21 CEST. The deployment script does not run the
family refresh adapter, so birthdays will not update automatically yet. The
hourly Pi deployment updates Nginx, but an open Chromium page does not re-fetch
event and news JSON automatically. Weather currently refreshes every 15 minutes.
Remaining full-automation work: refresh the private family cache locally before
build/deploy and refresh dashboard JSON in the open page without discarding the
current view or selected date.

The seven-day forecast UI is implemented in the active feature branch; after its
PR merges, the Pi's hourly deployment and a Chromium reload will show it.

## Operation and verification

From `app/`:

```sh
npm run build          # TypeScript check and static production build
npm test               # Existing ingestion/script tests
npm run validate       # Validate cached data; private family cache is optional
npm run refresh:build  # Fetch sources, validate, and rebuild
```

Refreshing caches does not itself refresh an already open dashboard: event and
news caches are loaded on component mount. The Pi deploys updated files hourly,
but the browser must reload to read them.

The Pi's display schedule and Chromium launch command have not been checked. The
Pi deployment timer and script have been inspected; their behavior is described
in the automation handoff above.
