# Learnings

Fragile commands, toolchain traps, and source notes.

## 2026-06-08
- Waldmohr Aktuell exposes WordPress REST data at `/wp-json/wp/v2/posts`.
- Shell URLs with `?` must be quoted in zsh or glob expansion fails.
- The `Veranstaltungen` category has id `7`, but event-like posts can also appear under `Allgemein`, `Vereine`, `W4`, or other categories.

## 2026-11-11

- A browser's network-online flag does not prove internet access. Verify an external
  HTTPS response and keep provider failures distinguishable from a reported disconnect.
- Web fullscreen controls cannot minimize the Pi's Chromium kiosk. The optional local
  extension uses the native browser window API; the static app still has no backend.
- The extension is loaded from the repository checkout, outside the published `dist/`.
  Use the same Chromium profile as the kiosk and reload the extension after updates.
- An additional extension-enabled Playwright browser executable was unavailable in this
  workspace. Tests used controlled APIs and simulated UI; do not report that as native
  Pi minimization/fullscreen verification or automatically download a browser.
- Automated SSH authentication was unavailable even after the operator restored Pi
  connectivity. Do not infer display scaling/model from labwc process IDs alone.
