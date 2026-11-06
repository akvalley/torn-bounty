---
type: feature
title: Auto-Refresh Scheduling
description: Interval options (Off / 2m / 5m / 10m), the setTimeout + setInterval countdown pair, clearSchedule lifecycle, and how stale enrichment data is cleared on each new load.
tags: [auto-refresh, scheduling, countdown, timer]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-06T04:41:53.634Z
sources:
  - id: openwiki-source-6177b06be54e22dc8ce1bbda
    resource: repo://js/main.js
generated: { by: "claude-code", at: "2026-11-06T04:41:53.634Z" }
---

# Auto-Refresh Scheduling

The `#auto-refresh-select` dropdown offers four options persisted in localStorage:

| Label | Seconds |
|-------|---------|
| Auto: Off | 0 (disabled) |
| Auto: 2m | 120 |
| Auto: 5m | 300 |
| Auto: 10m | 600 |

## Timer Pair

`scheduleNextRefresh()` creates two timers simultaneously:

**`refreshTimeoutId`** (`setTimeout`) — fires after the full interval and calls `loadBounties()`. It also clears the countdown interval before calling.

**`countdownIntervalId`** (`setInterval`, 500 ms) — computes `Math.ceil((deadline - Date.now()) / 1000)` each tick and writes `↻ M:SS` to `#countdown-display`. Clears itself when `remaining <= 0`.

```js
const deadline = Date.now() + secs * 1000;
// countdown ticks every 500 ms, timeout fires at deadline
```

If `secs === 0` (Off), the function clears any existing schedule and sets the countdown display to `''`.

## clearSchedule

`clearSchedule()` calls `clearTimeout(refreshTimeoutId)` and `clearInterval(countdownIntervalId)`, then nulls both IDs. It is called:

- At the start of every `loadBounties()` to prevent overlapping refreshes.
- When `clearKeyBtn` is clicked.
- When the interval is changed to 0 (Off).

## Stale-Data Clearing on Load

Every `loadBounties()` call begins by resetting `statusMap`, `ffMap`, and their associated UI state (checked-time spans, button labels, filter values) before the fetch starts. This ensures enrichment data from a previous bounty set is never shown against a new one, regardless of whether the refresh was manual or automatic.

## Interaction with Manual Refresh

Clicking `#refresh-btn` calls `loadBounties()` directly, which calls `clearSchedule()` at its start. After the fetch completes, `scheduleNextRefresh()` is called in `finally`, restarting the countdown with whatever interval is currently selected.
