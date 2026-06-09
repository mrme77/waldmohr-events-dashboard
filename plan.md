# Plan

## v1 — DONE
First local English calendar dashboard for Waldmohr events (static HTML/CSS/JS + JSON). Shipped.

## v2 — KMC Kiosk Dashboard

**Objective**: a single-page, high-contrast, touch + voice dashboard for a wall-mounted
Raspberry Pi 5, covering the Kaiserslautern Military Community (KMC) area for a relocating
American family.

### Target hardware
- Raspberry Pi 5, 8 GB RAM, 1 TB NVMe SSD.
- Touchscreen (size TBD — drives layout density).
- Chromium in kiosk mode, daily auto-reload.

### Surfaces (one page)
- **News marquee running across the very top of the page** (USA + St. Louis, RSS, keyless).
- Dual clock: Berlin (Europe/Berlin) + St. Louis/Central (America/Chicago).
- Calendar, one view, color = category (Fun/Public · Family Sports · Leave · Trash · Civic).
  Tap a day/dot → detail popover (time, venue, city, brief description, source link).
- Rotating "Next Up" spotlight (auto-advances; tap to pin).
- Weather strip: Ramstein, Kaiserslautern, Saarbrücken (Open-Meteo, keyless).
- Voice button: tap-to-talk → local STT → OpenRouter → answer.

Layout (news marquee pinned top):
```
┌──────────────────────────────────────────────────────────────────┐
│ ◄ 📰 USA …headline…  ·  St. Louis …headline…  ·  … (scrolling) ►   │ marquee, top
├──────────────────────────────────────────────────────┬───────────┤
│ KMC DASHBOARD   Berlin 14:32 · St.Louis 07:32   ↻ 2m  │  NEXT UP  │
├──────────────────────────────────────────────────────┤ spotlight │
│  JUNE 2026  calendar, dots colored by category        │ tap=pin   │
│  tap day/dot → detail popover                         │  • upcoming
├──────────────────────────────────────────────────────┴───────────┤
│ ☀ Ramstein 22°  ⛅ Kaiserslautern 21°  🌧 Saarbrücken 20°  [ 🎤 ] │ weather + voice
└──────────────────────────────────────────────────────────────────┘
```

### Architecture
```
INGESTION (Node, cron on Pi, low frequency)
  scripts/sources/   waldmohr-aktuell (WP API) · kaiserslautern (HTML scrape) · ramstein (headless)
  scripts/family/    google-cal (private iCal URL) · trash (Kusel iCal)
  scripts/news/      RSS adapters (US national + St. Louis)
  → normalize to shared event schema → data/*.json  (optional SQLite for history/dedup)

LOCAL SERVER (Node, on Pi)
  serves built app + JSON
  /api/ask → holds OPENROUTER_API_KEY, proxies voice queries (key never in client)

FRONTEND (Vite + React + TypeScript → Chromium kiosk)
  widgets: DualClock · CalendarSpotlight · WeatherStrip · NewsTicker · VoiceButton
  polls Open-Meteo directly; reads cached events/news JSON; voice → /api/ask
```

### Secrets (`.env`, gitignored, server-side only)
- `GCAL_ICS_URL` — Google family calendar private iCal address.
- `OPENROUTER_API_KEY` — voice reasoning.

### Event sources — status
- Waldmohr: `waldmohr-aktuell.de` WordPress REST API. Working; needs cleanup.
- Kaiserslautern: `kaiserslautern.de` TYPO3 Veranstaltungskalender. No API → HTML scrape.
- Ramstein-Miesenbach: `ramstein-miesenbach.de`. JS-rendered → headless Chromium.
- Trash: Landkreis Kusel waste portal. iCal export confirmed for Waldmohr; reverse-engineer
  the ICS URL/params at build time.
- Family: Google Calendar private iCal URL.

### MVP — Waldmohr events only
Ship a working single-page kiosk with **just the Waldmohr event source**. Prove the shell,
calendar, and data flow before generalizing. Everything else is deferred.

1. **Scaffold** — Vite + React + TS, high-contrast theme, layout shell with the **news marquee
   slot pinned at top** (placeholder text until the RSS feed lands), dual clocks. No external deps.
2. **Waldmohr events** — fix the refresh placeholder-overwrite bug; normalize schema; render
   calendar (color = category) + rotating spotlight + tap-to-detail popover from Waldmohr data.

That is the MVP. Demo it, then continue below.

### Later phases (after MVP)
3. **Weather widget** — Open-Meteo, Waldmohr first. Keyless. Expand to the original 3-city strip later if useful.
4. **News marquee content** — RSS adapters (US + St. Louis) feeding the top marquee.
5. **More event sources** — Kaiserslautern scrape, then Ramstein headless.
6. **Family layer** — Google Calendar iCal + Kusel trash iCal; category color coding.
7. **Voice** — local Node server + OpenRouter proxy + local whisper.cpp STT (optional TTS).
8. **Pi deployment** — Chromium kiosk autostart, cron schedule, daily reload.

### Open questions
- Touchscreen size / resolution (drives layout density).
- Voice TTS: spoken answers (local piper) or text-only?

See `docs/compliance.md` for the GDPR / scraping legal posture. See `docs/decisions.md` for
the v2 architecture decisions.
