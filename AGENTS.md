# AGENTS.md - Waldmohr Events Dashboard

Local English events dashboard for an American family tracking current public events in Waldmohr. Agents read this first, then the durable docs below.

## What It Is
This project turns public Waldmohr Aktuell event posts into a local, English-first calendar dashboard. The first user is an American family relocating to Waldmohr that needs current, source-linked, family-relevant local events without reading every German post.

See `PRODUCT.md` for UI intent and `docs/spec.md` for the contract.

## Canonical Commands
| Goal | Command | Notes |
|---|---|---|
| Run | Open `index.html` in a browser | No build step for the first version. |
| Refresh data | `node scripts/refresh-events.mjs` | Pulls public WordPress API posts and updates `data/events.json`. |
| Test | `node scripts/validate-events.mjs` | Validates event data shape and date parsing. |

## Runtime Dependencies
- Waldmohr Aktuell WordPress REST API: `https://www.waldmohr-aktuell.de/wp-json/wp/v2/posts`.
- Browser with modern JavaScript support.
- Node.js 18+ for refresh and validation scripts.

## Key Paths
- `index.html` - static app shell.
- `src/styles.css` - all UI styling and CSS variables.
- `src/app.js` - calendar rendering, filters, search, and event detail behavior.
- `data/events.json` - normalized English event records used by the app.
- `scripts/refresh-events.mjs` - public-source refresh pipeline.
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
