# Waldmohr Events Dashboard

A touch-friendly, English-language dashboard for local events and useful updates in Waldmohr, Germany. It brings community events, nearby Homburg listings, weather, and practical calendar information together in one screen.

[Watch the dashboard video](./videopresentation.mov)

## Features

- Waldmohr events and nearby Homburg events, with dates and links to their original sources.
- US and St. Louis news headlines, displayed one at a time and changing every 30 seconds.
- Trash collection dates, Rheinland-Pfalz public holidays, and Homburg flea-market dates.
- Current Waldmohr weather and a seven-day forecast.
- Napoli and St. Louis clocks.
- Touch-friendly event details and QR codes for opening source links on a phone.
- Optional family-calendar entries for a private installation.

## Run locally

Requirements: Node.js 22 and npm.

```sh
git clone https://github.com/mrme77/waldmohr-events-dashboard.git
cd waldmohr-events-dashboard/app
npm ci
npm run dev
```

Vite prints the local development URL, usually `http://localhost:5173`. The dashboard uses the committed public JSON datasets, so no API keys are needed to run it. Weather is fetched from Open-Meteo by the browser.

To build and preview the static site:

```sh
npm run build
npm run preview
```

## Refresh and validate data

The refresh scripts are in the repository root and need the root dependencies as well as the app dependencies:

```sh
cd ..
npm ci
cd app
npm ci
npm run refresh
npm run validate
```

The GitHub Actions workflow is scheduled to refresh public datasets daily at 05:17 UTC and also supports manual runs. The dashboard reads JSON datasets when it loads, so a running display needs to reload to show newly published data. Individual data sources can be temporarily unavailable; check the refresh workflow logs for adapter results. After a partial refresh, the workflow validates and publishes successful dataset updates while retaining failed adapters' previous files.

Run the regression tests with `npm test` from `app/`. The internal deployment handoff is in [app/README.md](./app/README.md); project decisions and verification records are in [docs/](./docs/).

## Optional configuration

The dashboard can include a private Google Calendar feed for a personal installation. Copy the root `.env.example` to `.env` and set `GCAL_ICS_URL` to the calendar's secret iCal URL. Treat that URL as a password: anyone who has it can read the calendar. The generated family cache is gitignored and must not be committed or served from a public deployment.

Homburg event translations use OpenRouter `minimax/minimax-m3.1-flash` when `OPENROUTER_API_KEY` is available to the data-refresh workflow. Add it as a GitHub Actions repository secret to enable new translations. Successful translations are saved in the Homburg JSON payload and reused whenever the original German title and summary are unchanged. Only new or edited text requires another translation request. Without the key, cached English remains available and uncached text stays in German. Failed translations are retried on later refreshes; changing the configured model starts a fresh cache. The first refresh after the cache fix populates it because older payloads did not retain original summaries. Never commit `.env` files, secret URLs, or API keys.

## Data sources

- Local events: [Waldmohr Aktuell](https://www.waldmohr-aktuell.de/)
- Homburg events and flea-market dates: [City of Homburg](https://www.homburg.de/)
- News: NPR News and FOX 2 News St. Louis RSS feeds
- Trash collection: Landkreis Kusel calendar
- Public holidays: [Nager.Date](https://date.nager.at/)
- Weather: [Open-Meteo](https://open-meteo.com/)
- Optional personal calendar: a private Google Calendar iCal feed

The application is a static React, TypeScript, and Vite site. Data collection and normalization run separately in Node.js scripts; the browser does not need a backend server.
