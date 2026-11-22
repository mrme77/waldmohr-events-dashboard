# Agent Context

Reviewed against `main` after PR #53 on 2026-11-22. Read [AGENTS.md](../AGENTS.md)
for project instructions and [plan.md](../plan.md) for remaining work.

The application is the static Vite, React, and TypeScript kiosk under `app/`.
It reads normalized `app/public/*.json`; the retired v1 app and `data/` layout
are not the current implementation. Public adapters refresh through GitHub Actions.

- Sources include Waldmohr/Homburg events, news, weather, trash, holidays, and flea markets.
  The optional private family cache stays gitignored and local.
- Homburg translations use OpenRouter MiniMax with persistent reuse for unchanged
  title/summary pairs. Argos was tested locally and not selected because of quality.
- The header has internet status and Desktop controls. PR #53 removed the Ring shortcut.
- Source URLs, freshness metadata, and explicit date confidence remain required.
- Pi extension activation and installed deploy-script hash were verified on 2026-11-11.
  Deployment of PR #53 and current publish/refresh behavior remain unverified.

See [docs/validation.md](../docs/validation.md) for dated evidence; the latest
code checks for the Ring removal passed 44 tests and the production build.
