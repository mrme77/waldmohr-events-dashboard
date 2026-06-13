# PRODUCT.md - Waldmohr Events Dashboard

This file anchors the product and visual direction for the local events app.

## Audience
An American family relocating to the KMC area that needs fast answers: what is happening, whether it is family-friendly, where it is, and how current the information is.

## Product Shape
A single-page, always-on kiosk dashboard for a wall-mounted Raspberry Pi 5: news marquee, dual
clocks, calendar with rotating "Next Up" spotlight, and weather, all on one "Civic Departure
Board" view. Calendar is the primary surface; everything else is a glanceable rail.

## Visual Direction
- "Civic Departure Board": high-contrast dark theme (`#0a0e12` background, `#eef3f2` ink),
  Fraunces serif headings, Archivo UI text, JetBrains Mono numerals.
- Civic green accent (`#3ed68a`); category colors for Fun/Public, Family Sports, Leave, Trash,
  Civic/Holiday, KMC (neon-green diamond).
- Layered glow + grain background, live pulse, staggered load reveal — built to be read from
  across a room on an always-on display.
- Calendar dots are colored by category; tap a day/dot opens a detail popover (no filter
  checkboxes, no separate detail panel — see `docs/decisions.md`).

## UI Priorities
- Current/upcoming events above past events; "Next Up" spotlight surfaces what's next.
- Source links and freshness metadata ("Last Updated") always visible.
- One color dimension (category) for glanceability; tap for detail, not filters.
- Touchscreen-first, sized for the Pi 5 kiosk display.
