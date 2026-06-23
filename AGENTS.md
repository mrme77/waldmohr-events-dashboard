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
| Refresh data | `cd app && npm run refresh` | Runs all seven adapters (events, news, trash, holidays, flea markets, KMC magazine events, family); each writes its `app/public/*.json` cache. Family runs only where `GCAL_ICS_URL` is set and its output is gitignored. |
| Test | `cd app && npm run validate` | Validates all seven cached payloads (family skips when absent). |
| Refresh + build | `cd app && npm run refresh:build` | Refresh, validate, then production build. |

## Runtime Dependencies
- Waldmohr Aktuell WordPress REST API: `https://www.waldmohr-aktuell.de/wp-json/wp/v2/posts`.
- NPR + KSDK RSS feeds (news), Open-Meteo (weather, fetched live by the app).
- date.nager.at public holidays API (Rheinland-Pfalz).
- Landkreis Kusel waste collection iCal (Waldmohr trash).
- Homburg flea market dates: maintained table in `scripts/refresh-fleamarkets.mjs`, synced
  yearly from the homburg.de announcement (the script warns when dates run low).
- KMC events: `scripts/refresh-kmc.mjs` finds the current
  embedded issue, extracts the `UNTERWEGS` SVG text layer, and writes KMC-area events. Dates that
  omit a year are inferred from the issue year and marked with `dateConfidence: "inferred"`.
- Google Calendar private iCal feed (family layer): secret URL in `.env` as `GCAL_ICS_URL`,
  never committed; generated `family.json` caches are gitignored.
- Browser with modern JavaScript support.
- Node.js 18+ for refresh and validation scripts.

## Key Paths
- `app/` - Vite + React + TypeScript application (the only UI).
- `app/src/App.tsx` - app shell and layout.
- `app/src/components/` - calendar, event detail, news marquee, clocks, weather.
- `app/public/*.json` - normalized English event payloads; the single source served to and read by the app.
- `scripts/refresh-*.mjs` - public-source refresh adapters (events, news, trash, holidays, flea markets, KMC).
- `scripts/validate-*.mjs` - payload validators, one per adapter.
- `scripts/lib.mjs` - shared script helpers: `writeJson`, `runMain`, and the `runValidation` harness.
- `docs/` - durable project truth.

## Durable Docs
- `docs/spec.md` - intent, acceptance criteria, constraints, non-goals.
- `PRODUCT.md` - design register for the UI.
- `docs/decisions.md` - architectural decisions.
- `docs/validation.md` - verification checklist and last run.
- `docs/reference-index.md` - source and framework links.
- `plan.md`, `progress.md`, `TASKS.md` - live work state.
- `learnings.md` - fragile commands and toolchain notes.

## GitHub Operations
- Use the installed, authenticated GitHub CLI for GitHub operations. Run
  `gh auth status` before pushing, opening pull requests, or inspecting remote
  GitHub state.
- If authentication is invalid, stop and ask the user to run `gh auth login`.
  Use `gh auth setup-git` when Git transport needs GitHub CLI credentials.
- Use `git push` for Git transport and `gh pr`, `gh issue`, and `gh run` for
  GitHub workflows. Do not switch to a GitHub app or connector as a fallback.
- Direct pushes to `main` require the user to explicitly choose and authorize
  that exception for the current change. Otherwise, use a branch and pull request.

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
- Commit or push without explicit user approval.
- Push directly to the `main` branch unless the user explicitly authorizes it for the current change.
- Auto-commit or auto-push code changes; all changes must undergo manual user review first.
- Present inferred dates as confirmed facts; use `dateConfidence`.
