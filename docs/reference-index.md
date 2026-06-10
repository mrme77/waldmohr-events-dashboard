# Reference Index

Links to source material and technical references.

## Public Sources
- Waldmohr Aktuell homepage: https://www.waldmohr-aktuell.de/
- Waldmohr Aktuell events category: https://www.waldmohr-aktuell.de/kategorie/veranstaltungen/
- WordPress posts API: https://www.waldmohr-aktuell.de/wp-json/wp/v2/posts
- WordPress categories API: https://www.waldmohr-aktuell.de/wp-json/wp/v2/categories
- NPR News RSS: https://feeds.npr.org/1001/rss.xml
- KSDK St. Louis local RSS: https://www.ksdk.com/feeds/syndication/rss/news/local
- Open-Meteo forecast API: https://api.open-meteo.com/
- German public holidays API (Rheinland-Pfalz): https://date.nager.at/
- Landkreis Kusel waste collection iCal (Waldmohr): https://www.landkreis-kusel.de/
- Homburg Flohmarkt official dates (yearly announcement): https://www.homburg.de/rathaus/aktuelle-informationen/pressemitteilungen/flohmarkt-jahr-startet-am-3-januar-rund-ums-forum/
- Flea market aggregators (deferred, listings sparse): https://www.flohmarkt.info/homburg/ and https://www.flohmarkt-termine.org/landkreis/saarpfalz-kreis/

## Private Sources
- Google Calendar family iCal feed: secret URL kept in `.env` as `GCAL_ICS_URL` (get it from
  Google Calendar → Settings and sharing → Integrate calendar → "Secret address in iCal
  format"; the Reset button there revokes a leaked URL).

## Generated Payloads
Each cache is written to both `data/` and `app/public/`.
- Events cache: `events.json` (Waldmohr Aktuell).
- News cache: `news.json` (NPR + KSDK).
- Trash cache: `trash.json` (Kusel iCal).
- Holidays cache: `holidays.json` (date.nager.at, RLP).
- Flea markets cache: `fleamarkets.json` (Homburg official dates, maintained table).
- Family cache: `family.json` (Google Calendar iCal) — gitignored, never committed.

## Project References
- `AGENTIC_SURFACE_TEMPLATE.md` source template: kept locally outside the repo (not version-controlled).
