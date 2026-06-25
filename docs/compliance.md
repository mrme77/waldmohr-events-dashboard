# Compliance & Data Posture

How this project stays on the right side of EU data law and source-site terms.
Engineering best-practice, not legal advice.

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
| KMC issue text sent to OpenRouter | Public magazine text only; used at refresh time to create trip summaries, never mixed with family data. |

## The real legal exposure is copyright, not GDPR

Scraping public event listings raises **copyright** and the **EU sui generis database right**
(Directive 96/9/EC) more than data-protection law. Mitigations, baked into the adapters:

- **Store minimal facts** (date, title, venue) — not wholesale copies of articles.
- **Summarize, do not republish full articles** for KMC trip ideas; keep summaries short and
  source-linked to Issuu pages.
- **Always attribute + link** the source (`sourceUrl` on every event). Already a project rule.
- **Personal use only.** No redistribution, no public republishing of aggregated data.

## Scraping etiquette (per source)

- **Honor `robots.txt`** for each site before scraping; re-check periodically.
- **Low frequency** — cron every few hours, never tight loops.
- **Descriptive User-Agent** and rate limiting.
- Prefer official structured feeds (WordPress API, iCal) over HTML scraping where they exist.

## Secrets & security (GDPR Art. 32 good practice)

- All keys/URLs in `.env`, gitignored. Never committed, never in the client bundle.
- `GCAL_ICS_URL` is itself a secret (it grants read access to the calendar) — used only by
  `scripts/refresh-family.mjs` at refresh time, never shipped to the client.
- The OpenRouter key is also local-only and used only by `scripts/refresh-kmc-trips.mjs` at
  refresh time; no OpenRouter secret is committed or shipped to the client.

## Retention

Keep current + near-past events only; purge stale records on refresh. No long-term archive of
personal calendar data.

## Operating checklist

- [ ] Family/personal layer never leaves the local network.
- [ ] `robots.txt` checked for each scraped source.
- [ ] Scrapers store minimal fields + source link; run at low frequency.
- [ ] Secrets in `.env` only, never in the client bundle.
