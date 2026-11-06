---
type: feature
title: Fair Fight Enrichment
description: Check FF button lifecycle, the FFScouter one-time consent dialog, registration/check-key fallback, ffMap population, and how FF multipliers and stat estimates are displayed on bounty cards.
tags: [fair-fight, ffscouter, ff-enrichment, consent]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-06T04:41:53.634Z
sources:
  - id: openwiki-source-f8d10828394c4129061d5b0e
    resource: repo://index.html
  - id: openwiki-source-6177b06be54e22dc8ce1bbda
    resource: repo://js/main.js
  - id: openwiki-source-9d69c1e449544a6ab15c4d3c
    resource: repo://js/ui.js
generated: { by: "claude-code", at: "2026-11-06T04:41:53.634Z" }
---

# Fair Fight Enrichment

"Check FF" fetches fair fight multipliers and battle-stat estimates for every currently visible bounty target from [FFScouter](https://ffscouter.com).

## 100-Target Gate

`updateCheckFfBtn(visibleCount)` enables `#check-ff-btn` only when:
- An API key is present in localStorage.
- `visibleCount > 0 && visibleCount <= 100` (same `STATUS_CHECK_LIMIT` as Check Status).

The tooltip changes to explain the limit when it is exceeded.

## Consent Dialog (first use)

On the first "Check FF" click, `loadFfscouterRegistered()` returns false, so `#ff-consent-dialog` is shown instead of making API calls. The dialog informs the user that their Torn API key will be shared with FFScouter.

- **Register & Enable** → `runFfCheckWithRegistration(key)`.
- **Cancel** → dialog closes, nothing else happens.

## Registration Flow (`runFfCheckWithRegistration`)

1. Button text → `'Registering…'`, button disabled.
2. `ffscouterRegister(key)` called; if it throws (key already registered), `ffscouterCheckKey(key)` is used as fallback.
3. If `is_registered` is false after both attempts, an error is shown and the flow aborts.
4. `saveFfscouterRegistered()` persists the flag.
5. Falls through to `runFfCheck(key)`.

## FF Check Flow (`runFfCheck`)

1. IDs collected from `currentFiltered.map(b => b.id)`.
2. Button text → `'Checking…'`, button disabled.
3. `fetchFairFightBatch(key, ids)` → single GET to FFScouter `/api/v1/get-stats`.
4. Result merged into `ffMap` via `Object.assign`.
5. `applyFiltersAndRender()` re-renders all cards with FF data.
6. `#ff-checked-time` → `'as of <time>'`.
7. Button text → `'↻ Re-check FF'`.
8. `finally`: `updateCheckFfBtn(currentFiltered.length)` re-enables the button.

## ffMap Shape

```js
ffMap[playerId] = {
  fairFight:   number | null,   // the multiplier, e.g. 1.47
  bsEstimate:  string,          // human-readable, e.g. "2.99b"
  lastUpdated: string,          // ISO timestamp from FFScouter
}
```

## Card Display

When `ffMap[b.id]` exists, `profileRowHtml` adds to the card:

- **FF badge** — `FF 1.47×` coloured by value:
  - `ff-high` (green): `>= 2`
  - `ff-mid` (amber): `>= 1`
  - `ff-low` (red): `< 1`
  - `ff-unknown` (grey): `fairFight === null`
- **⚡ stat estimate** — raw `bsEstimate` string (e.g. `⚡ 2.99b`), shown when present.

## Lifetime

`ffMap` is cleared (reset to `{}`) at the start of every `loadBounties()` call, so FF data never persists across a bounty data refresh.
