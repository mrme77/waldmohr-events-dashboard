# Handoff

Reviewed on 2026-11-22. Canonical instructions: [AGENTS.md](../AGENTS.md).

- PR #53 removed the Ring Doorbell button, supporting component/tests, and setup docs.
  It merged as `95a8212`; local `main` was fast-forwarded to that merge with a clean tree.
- The removal passed all 44 remaining tests, the production build, and diff checks.
  Physical Pi deployment was not verified.
- Keep OpenRouter translations and the existing cache. The Argos experiment is saved
  locally on `feat/argos-translations` at `4597792`; it was not pushed, merged, or deployed.
  Samples showed poorer wording and translated a band name; the operator retained OpenRouter.
- The current follow-up is a documentation-only synchronization, based on those results.
  Do not treat this handoff as evidence that the documentation branch has merged.

Next operational checks are listed in [TASKS.md](../TASKS.md): verify the Pi's deployed
revision and header, unchanged-deploy skipping, and Chromium refresh. Family-cache refresh
and event/news refresh preserving calendar selection remain open.

Keep private calendar data out of Git, logs, and translation inputs. Do not claim current
Pi behavior from old observations. Commit/push requires the explicit approval in AGENTS.md.
