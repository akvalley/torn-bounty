---
type: feature
title: Filter Pipeline
description: All 11 filter dimensions, 8 sort modes, the applyFiltersAndRender flow, auto-disable rules for the two status-gated filters (Status + Location), filter persistence, and the mobile badge count.
tags: [filters, sort, pipeline, status-gated, persistence]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-06T04:41:53.634Z
sources:
  - id: openwiki-source-6177b06be54e22dc8ce1bbda
    resource: repo://js/main.js
generated: { by: "claude-code", at: "2026-11-06T04:41:53.634Z" }
---

# Filter Pipeline

`applyFiltersAndRender()` in `js/main.js` is called on every filter/sort input event and after every bounty or enrichment data load.

## Filter Dimensions (11)

| Control | ID | Type | Filters on |
|---------|----|------|------------|
| Name search | `#filter-name` | text | `b.name.toLowerCase().includes(query)` |
| Anonymous | `#filter-anonymous` | select | `b.listerName === null` (anonymous) or `!== null` (named) |
| Has reason | `#filter-has-reason` | select | presence of `b.reason` |
| Min level | `#filter-level-min` | number | `b.level >= levelMin` (default 1) |
| Max level | `#filter-level-max` | number | `b.level <= levelMax` (default 100) |
| Min quantity | `#filter-qty-min` | number | `b.quantity >= qtyMin` (default 1) |
| Min reward | `#filter-bounty-min` | number | `b.reward >= bountyMin` (default 0) |
| Min total value | `#filter-total-min` | number | `b.totalValue >= totalMin` (default 0) |
| Status _(gated)_ | `#filter-status` | select | `statusMap[b.id].state === selected` |
| Location _(gated)_ | `#filter-location` | select | `extractLocation(statusMap[b.id]) === selected` |
| _(implicit)_ | `#my-level` | number | Fair-fight highlight only; not a filter |

The Status and Location filters only exclude a bounty when `statusMap[b.id]` exists for that target. Targets without status data pass the filter regardless of the selected value.

## Sort Modes (8)

`#sort-select` options: `reward-desc` (default), `reward-asc`, `total-desc`, `total-asc`, `level-asc`, `level-desc`, `qty-desc`, `qty-asc`. Sorting is non-mutating (`[...arr].sort(...)`).

## applyFiltersAndRender Flow

1. Read all 11 control values.
2. Call `saveFilters({...})` to persist the current state.
3. Call `updateFilterToggleBadge()`.
4. `.filter()` over `allBounties` applying each dimension in order.
5. `sortBounties(filtered, sortMode)`.
6. Write result to `currentFiltered`.
7. `renderBounties(filtered, allBounties.length, myLevel, statusMap, ffMap)`.
8. `updateCheckStatusBtn(filtered.length)`.
9. `updateCheckFfBtn(filtered.length)`.
10. `updateStatusFilter(filtered.length)`.
11. `updateLocationOptions(filtered.length)`.

## Status-Gated Filters (auto-disable)

Both `#filter-status` and `#filter-location` are disabled by default and unlock only when:
- `Object.keys(statusMap).length > 0` (Check Status has been run), **and**
- `visibleCount <= STATUS_CHECK_LIMIT` (100).

If filters are relaxed so the visible count rises above 100, both selects are re-disabled automatically on the next `applyFiltersAndRender` call.

`updateStatusFilter(visibleCount)` — simple enable/disable with no option rebuilding.  
`updateLocationOptions(visibleCount)` — additionally rebuilds the country option list from current `statusMap` data.

## Filter Persistence

`saveFilters(obj)` serialises the current filter state to `localStorage` key `torn_filters` on every render. `loadFilters()` returns the parsed object on init; `applyFilterValues(f)` restores each field. The Location filter is dynamic (options depend on live status data), so it is restored only if the saved value matches an existing option.

Resetting via `#reset-filters-btn` clears all controls to defaults, calls `saveFilters({})`, and re-renders.

## Mobile Badge

`updateFilterToggleBadge()` counts active non-default filter values across all 11 dimensions (including Status and Location). The `#filter-toggle` button shows `Filters (N) ▾` when `N > 0`, otherwise `Filters ▾`. The panel toggles open/closed via CSS class `open`.
