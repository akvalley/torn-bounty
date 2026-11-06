---
type: quickstart
title: Quickstart — Torn Bounty Hunter
description: Project purpose, tech stack summary, and a task-routing map pointing agents to the right wiki pages for common work.
tags: [quickstart, overview, routing]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-06T04:41:53.634Z
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
generated: { by: "claude-code", at: "2026-11-06T04:41:53.634Z" }
---

# Quickstart — Torn Bounty Hunter

A vanilla JS/HTML/CSS single-page app that fetches the live Torn City bounty board and presents it in a faster, filterable interface.

**Live:** https://torn-bounty-hunter.netlify.app  
**Repo:** https://github.com/akvalley/torn-bounty  
**Deploy:** `git push` → Netlify auto-deploys from `main` within ~30 s.

## Tech Stack

- Vanilla JS ES modules, no build step, no npm.
- HTML5 / CSS3 with custom properties for theming.
- Run locally: `npx serve -l 8080` (ES modules require a server, not `file://`).

## Module Map

| File | Does |
|------|------|
| `js/api.js` | All `fetch` calls to Torn and FFScouter APIs |
| `js/storage.js` | All `localStorage` read/write |
| `js/ui.js` | DOM rendering — cards, loading states, status bar |
| `js/main.js` | App init, event wiring, state, filter logic, enrichment flows |
| `css/style.css` | All styles |
| `index.html` | HTML skeleton, `<dialog>` modals, filter controls |

## Task Routing

| Task | Go to |
|------|-------|
| Understand overall structure / data flow | [Architecture Overview](architecture/overview.md) |
| Add or change a filter | [Filter Pipeline](features/filter-pipeline.md) |
| Change Check Status behaviour | [Player Status Enrichment](features/status-enrichment.md) |
| Change Check FF behaviour | [Fair Fight Enrichment](features/ff-enrichment.md) |
| Modify card layout / badges | [Bounty Card Rendering](rendering/bounty-cards.md) |
| Change Torn API calls or error messages | [Torn API Integration](api/torn-api.md) |
| Change FFScouter API calls | [FFScouter API Integration](api/ffscouter-api.md) |
| Add or change a persisted setting | [Client-Side Persistence](storage/persistence.md) |
| Change auto-refresh behaviour | [Auto-Refresh Scheduling](features/auto-refresh.md) |

## Security Rules

The Torn API key **must never** leave the client. It is stored only in `localStorage` under key `torn_api_key` and passed only to `api.torn.com` and `ffscouter.com` as a query parameter. Never log it, never send it to any server this app controls.
