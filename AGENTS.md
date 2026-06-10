# AGENTS.md - Waldmohr Events Dashboard

Local English events dashboard for an American family tracking current public events in Waldmohr. Agents read this first, then the durable docs below.

## What It Is
This project turns public Waldmohr Aktuell event posts into a local, English-first calendar dashboard. The first user is an American family relocating to Waldmohr that needs current, source-linked, family-relevant local events without reading every German post.

See `PRODUCT.md` for UI intent and `docs/spec.md` for the contract.

## Canonical Commands
| Goal | Command | Notes |
|---|---|---|
| Run | `cd app && npm install && npm run dev` | Vite dev server at `http://localhost:5173`. |
| Build | `cd app && npm run build` | Type-checks then builds to `app/dist/`. |
| Refresh data | `cd app && npm run refresh` | Runs all six adapters (events, news, trash, holidays, flea markets, family); each writes to `data/*.json` and `app/public/*.json`. Family runs only where `GCAL_ICS_URL` is set and its outputs are gitignored. |
| Test | `cd app && npm run validate` | Validates all six cached payloads (family skips when absent). |
| Refresh + build | `cd app && npm run refresh:build` | Refresh, validate, then production build. |

## Runtime Dependencies
- Waldmohr Aktuell WordPress REST API: `https://www.waldmohr-aktuell.de/wp-json/wp/v2/posts`.
- NPR + KSDK RSS feeds (news), Open-Meteo (weather, fetched live by the app).
- date.nager.at public holidays API (Rheinland-Pfalz).
- Landkreis Kusel waste collection iCal (Waldmohr trash).
- Homburg flea market dates: maintained table in `scripts/refresh-fleamarkets.mjs`, synced
  yearly from the homburg.de announcement (the script warns when dates run low).
- Google Calendar private iCal feed (family layer): secret URL in `.env` as `GCAL_ICS_URL`,
  never committed; generated `family.json` caches are gitignored.
- Browser with modern JavaScript support.
- Node.js 18+ for refresh and validation scripts.

## Key Paths
- `app/` - Vite + React + TypeScript application (the only UI).
- `app/src/App.tsx` - app shell and layout.
- `app/src/components/` - calendar, event detail, news marquee, clocks, weather.
- `app/public/*.json` - data files served to the app.
- `data/*.json` - normalized English event records (pipeline source of truth).
- `scripts/refresh-*.mjs` - public-source refresh adapters (events, news, trash, holidays, flea markets).
- `scripts/validate-*.mjs` - payload validators, one per adapter.
- `docs/` - durable project truth.

## Durable Docs
- `docs/spec.md` - intent, acceptance criteria, constraints, non-goals.
- `PRODUCT.md` - design register for the UI.
- `docs/decisions.md` - architectural decisions.
- `docs/validation.md` - verification checklist and last run.
- `docs/reference-index.md` - source and framework links.
- `plan.md`, `progress.md`, `TASKS.md` - live work state.
- `learnings.md` - fragile commands and toolchain notes.

## Boundaries
**Always**
- Keep every displayed event tied to a source URL.
- Show when data was last refreshed.
- Mark past events separately from upcoming/current events.
- Keep `.env*` out of version control.

**Ask First**
- Adding dependencies or switching to a framework.
- Adding automated scheduled refreshes.
- Crawling sources beyond public pages/APIs.

**Never**
- Store credentials or API keys in the repo.
- Commit without explicit user approval.
- Present inferred dates as confirmed facts; use `dateConfidence`.
