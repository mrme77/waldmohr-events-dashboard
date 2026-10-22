# Waldmohr Events Dashboard

A touch-friendly, English-language dashboard for local events and useful updates in Waldmohr, Germany. It brings community events, nearby Homburg listings, weather, and practical calendar information together in one screen.

[Watch the dashboard video](./videopresentation.mov)

## Features

- Waldmohr events and nearby Homburg events, with dates and links to their original sources.
- US and St. Louis news headlines.
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

The scheduled GitHub Actions workflow refreshes the public datasets daily at 05:00 UTC. The dashboard reads the JSON datasets when it loads, so a running display needs to reload to show newly published data. Individual data sources can be temporarily unavailable; check the refresh workflow logs for adapter results.

## Optional configuration

The dashboard can include a private Google Calendar feed for a personal installation. Copy the root `.env.example` to `.env` and set `GCAL_ICS_URL` to the calendar's secret iCal URL. Treat that URL as a password: anyone who has it can read the calendar. The generated family cache is gitignored and must not be committed or served from a public deployment.

Homburg event translations use OpenRouter when `OPENROUTER_API_KEY` is available to the data-refresh workflow. Add it as a GitHub Actions repository secret to enable translations. Without the key, event titles and descriptions remain in German. Never commit `.env` files, secret URLs, or API keys.

## Data sources

- Local events: [Waldmohr Aktuell](https://www.waldmohr-aktuell.de/)
- Homburg events and flea-market dates: [City of Homburg](https://www.homburg.de/)
- News: NPR News and KSDK St. Louis RSS feeds
- Trash collection: Landkreis Kusel calendar
- Public holidays: [Nager.Date](https://date.nager.at/)
- Weather: [Open-Meteo](https://open-meteo.com/)
- Optional personal calendar: a private Google Calendar iCal feed

The application is a static React, TypeScript, and Vite site. Data collection and normalization run separately in Node.js scripts; the browser does not need a backend server.
