# Compliance & Data Posture

How this project stays on the right side of EU data law and source-site terms.
Engineering best-practice, not legal advice.

Engineering references synchronized with development on 2026-10-29. The legal conclusions
below are carried forward from earlier documentation and were not reassessed in this update.

## GDPR scope — the household exemption

GDPR (Regulation (EU) 2016/679), Art. 2(2)(c), does **not** apply to processing by a natural
person "in the course of a purely personal or household activity." A family dashboard running
on your own Pi, fed by your own calendar, viewed by your own household, falls inside this
exemption.

**The exemption breaks the moment personal data is published or broadcast publicly.** So:

- The **family/personal layer** (Google Calendar entries: sports, leave, names; trash days)
  stays **local-network only**. Never put it on a public stream, public URL, or shared display
  outside the household.
- "Leave" entries reveal when the house is empty — treat as a **security** concern, not just
  privacy. Local only.

## What is personal data here

| Data | Handling |
|---|---|
| Family calendar entries | Local only. Pulled via private iCal URL, never republished. |
| Event organizer names in scraped posts | Already public; store minimal fields; keep source link. |
| Homburg title/summary text sent to OpenRouter | Public city-calendar text only; translated at refresh time, never mixed with private family data. |

## The real legal exposure is copyright, not GDPR

Scraping public event listings raises **copyright** and the **EU sui generis database right**
(Directive 96/9/EC) more than data-protection law. Mitigations, baked into the adapters:

- **Store minimal facts** (date, title, venue) — not wholesale copies of articles.
- **Summarize, do not republish full articles**; retain concise event summaries and links
  to the originating official Homburg listings. The former KMC trip pipeline is removed.
- **Always attribute + link** the source (`sourceUrl` on every event). Already a project rule.
- **Personal use only.** No redistribution, no public republishing of aggregated data.

## Scraping etiquette (per source)

- **Honor `robots.txt`** for each site before scraping; re-check periodically.
- **Low frequency** — the public refresh workflow is configured daily at 05:17 UTC, with
  manual dispatch available; avoid tight loops. Browser weather refresh is every 15 minutes.
- **Descriptive User-Agent** and rate limiting.
- Prefer official structured feeds (WordPress API, iCal) over HTML scraping where they exist.

## Secrets & security (GDPR Art. 32 good practice)

- Secrets belong in local environment variables or gitignored `.env`, or GitHub Actions
  repository secrets for the scheduled workflow. Never commit them or put them in the client bundle.
- `GCAL_ICS_URL` is itself a secret (it grants read access to the calendar) — used only by
  `scripts/refresh-family.mjs` at refresh time, never shipped to the client.
- `OPENROUTER_API_KEY` is a GitHub Actions repository secret for scheduled Homburg
  translations, or a local environment/`.env` value for manual refreshes. It is used by
  `scripts/refresh-homburg-events.mjs` and `scripts/homburg-translations.mjs` at refresh
  time. The Pi only deploys generated JSON and does not need the key; no OpenRouter
  secret is committed or shipped to the client.

## Retention

Keep current + near-past events only; purge stale records on refresh. No long-term archive of
personal calendar data.

Current implementation detail: `homburg-events.json` also persists successful public
translations. Its model-scoped cache retains original German title/summary pairs and English
results even after the associated listings disappear from the feed; it has no expiry or
pruning policy. The event-retention intention above does not describe this translation cache.
Private family data remains in the separate, gitignored `family.json` and is never sent for
translation. The retention and legal implications of this public-text cache were not
reassessed during this documentation update.

## Operating checklist

- [ ] Family/personal layer never leaves the local network.
- [ ] `robots.txt` checked for each scraped source.
- [ ] Scrapers store minimal fields + source link; run at low frequency.
- [ ] Secrets in local environment/`.env` or Actions repository secrets, never in the client bundle.
