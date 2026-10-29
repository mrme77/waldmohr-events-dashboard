# Reference Index

Current source and code references, reviewed against development on 2026-10-29.
External sites and terms were not revalidated during this documentation update.

## Current Public Sources

- Waldmohr Aktuell homepage: https://www.waldmohr-aktuell.de/
- Waldmohr Aktuell events category: https://www.waldmohr-aktuell.de/kategorie/veranstaltungen/
- WordPress posts API: https://www.waldmohr-aktuell.de/wp-json/wp/v2/posts
- WordPress categories API: https://www.waldmohr-aktuell.de/wp-json/wp/v2/categories
- NPR News RSS: https://feeds.npr.org/1001/rss.xml
- FOX 2 News (St. Louis) RSS: https://fox2now.com/feed/
- Open-Meteo forecast API: https://api.open-meteo.com/
- German public holidays API (Rheinland-Pfalz): https://date.nager.at/
- Landkreis Kusel waste collection iCal (Waldmohr): https://www.landkreis-kusel.de/
- Homburg Flohmarkt yearly announcement: https://www.homburg.de/rathaus/aktuelle-informationen/pressemitteilungen/flohmarkt-jahr-startet-am-3-januar-rund-ums-forum/
- Homburg city calendar: https://www.homburg.de/veranstaltungen/
- Homburg calendar JSON feed: https://www.homburg.de/umbraco/api/veranstaltungen/getall?katId=&search=&ort=&showall=
- OpenRouter chat completions API for Homburg translations: https://openrouter.ai/docs/api-reference/chat-completion

## Private Source

- Google Calendar family iCal: the secret address is kept locally as `GCAL_ICS_URL`.
  Obtain it under Settings and sharing → Integrate calendar → Secret address in iCal
  format. Never place the address or generated family data in public project records.

## Generated Payloads

Adapters write `app/public/`; the app reads those files from its own origin on mount.

- `events.json`: Waldmohr Aktuell events.
- `news.json`: NPR and FOX 2 News headlines, already in English.
- `trash.json`: Kusel iCal collections.
- `holidays.json`: date.nager.at, Rheinland-Pfalz.
- `fleamarkets.json`: maintained Homburg dates from official yearly announcements.
- `homburg-events.json`: official Homburg events plus successful translation reuse cache.
  Cache entries retain original title/summary pairs and English results, scoped to
  `minimax/minimax-m3.1-flash`. Only missing pairs need API translation; failed pairs retry.
- `family.json`: optional private Google Calendar data; gitignored, never committed.

The public refresh workflow is configured for 05:17 UTC daily in
`../.github/workflows/refresh-data.yml`, with manual dispatch. Weather bypasses these JSON
files and refreshes directly in the browser every 15 minutes. Workflow execution and Pi
installation are separate from these source-code settings.

## Implementation and Operations

- `../scripts/homburg-translations.mjs`: model, cache loading, reuse, translation requests.
- `../scripts/refresh-homburg-events.mjs`: normalization and persisted payload.
- `../scripts/refresh-news.mjs`: authoritative current news feed URLs.
- `../app/ops/deploy.sh`: optimized replacement deployment script; Pi installation unverified.
- `../app/README.md`: internal Pi handoff and verification limits.
- `validation.md`: local checks, historical results, and open live verification.

## Historical or Deferred Sources

KSDK was the earlier St. Louis news feed and is no longer configured. Kaiserslautern American
and Issuu KMC event/trip ingestion were removed in October 2026; references below are history,
not current adapters:

- Kaiserslautern American: https://www.kaiserslauternamerican.com/
- Issuu publisher: https://issuu.com/advantinews
- Former issue pattern: `https://issuu.com/advantinews/docs/{issue-slug}`.
- Deferred flea-market aggregators: https://www.flohmarkt.info/homburg/ and
  https://www.flohmarkt-termine.org/landkreis/saarpfalz-kreis/

## Project Reference

- `AGENTIC_SURFACE_TEMPLATE.md`: original source template, kept locally outside this repo.
