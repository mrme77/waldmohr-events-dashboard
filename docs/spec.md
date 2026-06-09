# Project Specification: Waldmohr Events Dashboard

## Intent
Build a local English-first calendar dashboard that helps an American family moving to Waldmohr see current public events, understand why they matter, and verify every item against its original source.

## Acceptance Criteria
- [ ] The home screen shows a calendar-style month view and an upcoming-events list.
- [ ] Each event displays English title, plain-English summary, date, time when available, venue when available, family relevance tags, source URL, original German title, post date, and last checked date.
- [ ] Users can filter by family, community, culture, outdoors, civic, library, and clubs.
- [ ] Past events are visually separated from upcoming/current events.
- [ ] The app works locally without a build step.
- [ ] A refresh script can pull public Waldmohr Aktuell posts and normalize candidate event records.
- [ ] A validation script checks data shape before the app uses refreshed data.

## Constraints
- **Source-linked**: no event is displayed without a source URL.
- **Freshness-visible**: the app must show last refreshed time.
- **No hidden credentials**: public sources only for the first version.
- **Date caution**: inferred event dates must be marked with `dateConfidence`.
- **Local-first**: first version must run from local files.

## Non-Goals
- Full clone of Waldmohr Aktuell.
- Backend CMS or admin workflow.
- Automated machine translation paid API integration.
- Scraping private or authenticated pages.
