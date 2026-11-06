---
type: architecture
title: Architecture Overview
description: Module responsibilities, runtime state variables, and the top-level data-flow from API fetch through the filter pipeline to rendered bounty cards.
tags: [architecture, modules, data-flow, state]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-06T04:41:53.634Z
sources:
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-f8d10828394c4129061d5b0e
    resource: repo://index.html
  - id: openwiki-source-e298bfc9d2710d6f76541ae6
    resource: repo://js/api.js
  - id: openwiki-source-6177b06be54e22dc8ce1bbda
    resource: repo://js/main.js
  - id: openwiki-source-2d4818a82a9917305ccf7ff8
    resource: repo://js/storage.js
  - id: openwiki-source-9d69c1e449544a6ab15c4d3c
    resource: repo://js/ui.js
generated: { by: "claude-code", at: "2026-11-06T04:41:53.634Z" }
---

# Architecture Overview

Torn Bounty Hunter is a **no-build, no-framework, single-page application**. `index.html` is the entry point; it loads `js/main.js` as an ES module. No bundler, no npm.

## Modules

| File | Responsibility |
|------|----------------|
| `js/api.js` | All `fetch` calls: Torn API (bounties + status) and FFScouter API. Exports normalised async functions only; never touches the DOM. |
| `js/storage.js` | `localStorage` read/write helpers. Owns all key names. No side-effects. |
| `js/ui.js` | DOM mutation only: status bar, loading/error states, `renderBounties`. Stateless — receives data, returns nothing. |
| `js/main.js` | App init, all DOM event wiring, runtime state, filter logic, auto-refresh scheduling, Check Status / Check FF flows. |
| `css/style.css` | All styling via CSS custom properties; dark-mode aware. |
| `index.html` | HTML skeleton, `<dialog>` modals (help, FF consent), filter controls. |

## Runtime State (main.js)

```js
let allBounties     = [];   // full normalised list from last successful fetch
let currentFiltered = [];   // last rendered subset; used as ID source for status/FF batches
let statusMap       = {};   // { [targetId]: statusObject } — cleared on every bounty reload
let ffMap           = {};   // { [targetId]: { fairFight, bsEstimate, lastUpdated } } — cleared on reload
let refreshTimeoutId    = null;
let countdownIntervalId = null;
const STATUS_CHECK_LIMIT = 100;
```

`statusMap` and `ffMap` are keyed by `target_id` (integer). Both are cleared whenever `loadBounties` runs, ensuring stale enrichment data never persists across bounty refreshes.

## Data Flow

```
localStorage (api key)
      │
      ▼
loadBounties()
      │  fetchAllBounties() → pages /v2/torn/bounties → normaliseBounties()
      ▼
allBounties[]
      │
      ▼
applyFiltersAndRender()
      │  apply 11 filter dimensions + sort
      ▼
currentFiltered[]  ──────────────────┐
      │                              │
      ▼                              ▼
renderBounties()             [Check Status / Check FF]
   (ui.js)                   fetchStatusBatch / fetchFairFightBatch
      │                              │
      ▼                        statusMap / ffMap
  DOM cards                          │
                                     ▼
                               applyFiltersAndRender()
                               (re-render with enrichment)
```

## Initialisation Sequence

The IIFE `init()` at module load:

1. Restores saved filters via `loadFilters()` → `applyFilterValues()`.
2. Restores `my-level` and auto-refresh interval.
3. Calls `updateFilterToggleBadge()`.
4. If an API key exists in localStorage: masks the input field, enables the Refresh button, calls `loadBounties()`.
5. Otherwise shows the placeholder prompt.

## Cross-Module Contracts

- `api.js` never imports from `storage.js` or `ui.js`.
- `ui.js` never imports from `storage.js` or `api.js`.
- `storage.js` has no imports.
- `main.js` imports from all three and owns all shared state.
