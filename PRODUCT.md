# PRODUCT.md - Waldmohr Events Dashboard

This file anchors the product and visual direction for the local events app.

## Audience
An American family relocating to the KMC area that needs fast answers: what is happening, whether it is family-friendly, where it is, and how current the information is.

## Product Shape
A single-page, always-on kiosk dashboard for a wall-mounted Raspberry Pi 5: news marquee, dual
clocks, calendar with rotating "Next Up" spotlight, official Homburg highlights, and weather, all on one "Civic
Departure Board" view. Calendar is the primary surface; everything else is a glanceable rail.

## Visual Direction
- "Civic Departure Board": high-contrast dark theme (`#0a0e12` background, `#eef3f2` ink),
  Fraunces serif headings, Archivo UI text, JetBrains Mono numerals.
- Civic green accent (`#3ed68a`); categories are distinguished by color and shape: Fun/Public
  (circle), Family (star), Leave (star), Holiday (triangle), Trash (square, color-coded by
  bin type), Flea Markets (hollow ring), and Civic events. Theme tokens in
  `app/src/theme.css` define the current palette and marker styling.
- Layered glow and grain background, with a static brand indicator. News shows one wrapping
  headline at a time, rotating every 30 seconds without continuous scrolling. Clocks for Napoli
  and St. Louis update at minute boundaries to reduce kiosk rendering work.
- Calendar dots are colored by category; tap a day/dot opens a detail popover (no filter
  checkboxes, no separate detail panel — see `docs/decisions.md`).

## UI Priorities
- Current/upcoming events above past events; "Next Up" spotlight surfaces what's next.
- Homburg highlights show the next three official nearby listings; tapping a card opens day
  details. KMC magazine events and Trip Ideas were retired in October 2026.
- Source QR codes keep external websites on the user's phone so the kiosk stays on the dashboard.
- The weather card opens a full-width seven-day forecast modal.
- Source links and freshness metadata ("Last Updated") always visible.
- One color dimension (category) for glanceability; tap for detail, not filters.
- Touchscreen-first, sized for the Pi 5 kiosk display.

## Development and Deployment Evidence

Reviewed against current development on 2026-10-29. Runtime and deployment verification are
recorded separately in `app/README.md` and `docs/validation.md`; a merged feature does not
by itself confirm installation or behavior on the Pi.
