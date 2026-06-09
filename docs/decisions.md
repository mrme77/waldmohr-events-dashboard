# Decision Log

All architectural and design decisions.

## [2026-06-08] Start With A Static Local App
**Context**: The first need is a usable local calendar, not deployment or multi-user auth.
**Decision**: Build a static HTML/CSS/JS app with JSON data.
**Reason**: It can run locally, is easy to inspect, and keeps the initial refresh pipeline separate from UI complexity.
**Status**: Accepted.

## [2026-06-08] Use WordPress REST API Before HTML Scraping
**Context**: Waldmohr Aktuell exposes public WordPress REST endpoints.
**Decision**: The refresh script fetches structured posts from `wp-json/wp/v2/posts`.
**Reason**: Structured JSON is less brittle than parsing category pages.
**Status**: Accepted.

## [2026-06-08] Keep Translation Manual/Rule-Based In V1
**Context**: The user wants current content, but no paid translation service has been selected.
**Decision**: V1 uses curated English event records and a refresh script that preserves source German text for review.
**Reason**: Avoids hardcoding API keys and avoids pretending machine translation quality has been verified.
**Status**: Accepted.
