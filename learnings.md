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

## 2026-11-11 — Direct Pi activation

- Authorizing the Mac public SSH key enabled direct Pi inspection. Confirmed labwc,
  Chromium 156, `~/.config/waldmohr-kiosk`, and `http://127.0.0.1:8080`.
- The kiosk uses a dedicated profile. Enabling an extension in another profile
  does not enable the dashboard button; loading its full path from labwc autostart
  activated it without a new backend or package. Back up the startup file first.
- Chromium may flatten its process arguments into one NUL-terminated process title.
  Account for that when identifying the exact kiosk process before a restart.
- Window-state transitions are asynchronous. Wait for minimized/normal state before
  requesting fullscreen restoration; an immediate second state request can fail.
- Native minimization and programmatic fullscreen restoration were verified on Pi;
  the operator confirmed Desktop works. Temporary loopback diagnostics were then
  removed and the normal extension-enabled browser was restarted.
- The internet button rechecks reachability and updates its hover timestamp. It
  does not open Wi-Fi settings; a successful recheck can leave its green label unchanged.
