# CLAUDE.md

This file provides guidance to Claude when working in this repository.

## Project Overview

A better bounty interface for the browser game **Torn City** (torn.com).

- Fetches live bounty data from the Torn City API
- Displays bounties in a cleaner, more actionable UI than the default game interface
- The user's API key is stored **locally only** (never sent to any server we control)
- API calls are made directly from the client to `https://api.torn.com` with the key passed as a query parameter per Torn's API spec

## Security Rules

- **Never** store or transmit the API key anywhere except the user's local browser storage and direct calls to `api.torn.com`
- The API key must never be included in any server-side code, logs, or analytics
- Use `localStorage` for persisting the key between sessions (or prompt each time if preferred)

## Torn City API

- Base URL: `https://api.torn.com`
- Auth: API key passed as `?key=<API_KEY>` query parameter
- Bounty-relevant endpoints:
  - `GET /v2/torn/bounties?offset=0&key=<API_KEY>` — list of active bounties (v2 only)

## Tech Stack

- **Vanilla JS** (ES modules, no framework, no build step)
- **HTML5 / CSS3** (CSS custom properties for theming)
- No npm, no bundler — open `index.html` directly in a browser

## Project Structure

```
torn/
├── CLAUDE.md
├── index.html        # Entry point
├── css/
│   └── style.css     # All styles
└── js/
    ├── api.js        # Torn API calls (key never leaves client)
    ├── storage.js    # localStorage helpers for API key
    ├── ui.js         # DOM rendering helpers
    └── main.js       # App init and wiring
```

## Development Commands

```bash
# Serve locally (ES modules require a server, not file://)
npx serve -l 8080
```

## Conventions

- ES modules (`type="module"` on script tags)
- No inline JS in HTML
- API key read from `localStorage` key `torn_api_key`
- All `api.torn.com` calls go through `js/api.js` only — no fetch calls elsewhere
