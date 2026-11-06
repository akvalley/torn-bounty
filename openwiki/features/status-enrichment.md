---
type: feature
title: Player Status Enrichment
description: Check Status button lifecycle, the 100-target gate, parallel fetches with Promise.allSettled, statusMap population, extractLocation logic for the Location filter, and how Status and Location filter selects are enabled or disabled.
tags: [status, check-status, status-enrichment, location, filter-gate]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-06T04:41:53.634Z
sources:
  - id: openwiki-source-e298bfc9d2710d6f76541ae6
    resource: repo://js/api.js
  - id: openwiki-source-6177b06be54e22dc8ce1bbda
    resource: repo://js/main.js
generated: { by: "claude-code", at: "2026-11-06T04:41:53.634Z" }
---

# Player Status Enrichment

"Check Status" fetches a live Torn profile for every currently visible bounty target, adds an info row to each card, and unlocks two additional filter controls.

## 100-Target Gate

`updateCheckStatusBtn(visibleCount)` enables `#check-status-btn` only when:
- An API key exists in localStorage.
- `visibleCount > 0 && visibleCount <= 100` (constant `STATUS_CHECK_LIMIT`).

Tooltip text changes to explain the limit when exceeded.

## Check Status Flow

Triggered by `#check-status-btn` click:

1. IDs collected from `currentFiltered.map(b => b.id)`.
2. Button disabled, text → `'Checking…'`.
3. `fetchStatusBatch(key, ids)` called — fires one `GET /v2/user/:id?selections=profile` per ID via `Promise.allSettled`; failures are silently skipped.
4. Result merged into `statusMap` via `Object.assign` (additive — previous entries for other targets are retained).
5. `updateLocationOptions()` rebuilds the Location dropdown.
6. `applyFiltersAndRender()` re-renders cards with status data.
7. `#status-checked-time` → `'as of <time>'`.
8. Button text → `'↻ Re-check'`.
9. `finally`: `updateCheckStatusBtn(currentFiltered.length)` re-enables the button.

## statusMap Shape

```js
statusMap[targetId] = {
  state:       string,   // 'Okay' | 'Hospital' | 'Traveling' | 'Jail' | 'Federal' | 'Unknown'
  description: string,
  until:       number,   // Unix timestamp (release time for hospital/jail)
  rank:        string,
  title:       string,
  lastAction:  string,
  life:        { current: number, maximum: number },
  revivable:   boolean,
}
```

## extractLocation Logic

Used to derive a human-readable location string from a status object for the Location filter:

```js
function extractLocation(status) {
  if (!status || status.state !== 'Traveling') return 'Torn City';
  const desc = (status.description ?? '').trim();
  if (desc.startsWith('Traveling to ')) return desc.slice(13).trim();  // outbound
  if (desc.startsWith('Returning to ')) return 'Torn City';            // inbound
  if (desc.startsWith('In '))           return desc.slice(3).trim();   // at destination
  return 'Traveling';  // fallback for unrecognised description
}
```

Non-traveling targets (Okay, Hospital, Jail, Federal) all map to `'Torn City'`.

## Status and Location Filter Selects

Both are gated on the same condition as Check Status but checked on every `applyFiltersAndRender`:

- `updateStatusFilter(visibleCount)`: enables `#filter-status` iff `statusMap` is non-empty and `visibleCount <= 100`.
- `updateLocationOptions(visibleCount)`: same gate, plus rebuilds options from `statusMap` values using `extractLocation`. "Torn City" is always listed first if present; other locations are sorted alphabetically. Restores prior selection if the value still exists.

Both are reset to disabled / `'all'` on `loadBounties`, `clearKeyBtn`, and `resetFiltersBtn`.

## Lifetime

`statusMap` is cleared to `{}` at the start of every `loadBounties()` call. It is additive across multiple Re-check calls within the same bounty set (new results overwrite old ones for the same ID).
