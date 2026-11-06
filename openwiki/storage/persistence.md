---
type: storage
title: Client-Side Persistence
description: All five localStorage keys managed by js/storage.js, what each stores, read/write patterns, and the security invariant that the Torn API key never leaves the client.
tags: [storage, localstorage, persistence, security, api-key]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-06T04:41:53.634Z
sources:
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-e298bfc9d2710d6f76541ae6
    resource: repo://js/api.js
  - id: openwiki-source-6177b06be54e22dc8ce1bbda
    resource: repo://js/main.js
  - id: openwiki-source-2d4818a82a9917305ccf7ff8
    resource: repo://js/storage.js
generated: { by: "claude-code", at: "2026-11-06T04:41:53.634Z" }
---

# Client-Side Persistence

All persistent state lives in `localStorage`. `js/storage.js` owns every key name and all read/write logic. No other module accesses `localStorage` directly.

## Keys

| Key | Type | Stored value |
|-----|------|--------------|
| `torn_api_key` | string | Raw Torn API key (trimmed). |
| `torn_filters` | JSON string | Serialised filter state object. |
| `torn_my_level` | string (number) | Player's own Torn level. |
| `torn_auto_refresh` | string (number) | Auto-refresh interval in seconds (0 = off). |
| `ffscouter_registered` | string | Literal `'1'` when FFScouter consent was given; absent otherwise. |

## API Key (`torn_api_key`)

```js
saveApiKey(key)   // localStorage.setItem('torn_api_key', key.trim())
loadApiKey()      // returns '' if absent
clearApiKey()     // localStorage.removeItem(...)
hasApiKey()       // loadApiKey().length > 0
```

**Security invariant**: the key is stored only in the user's own browser. It is passed as `?key=<apiKey>` only to `api.torn.com` and `ffscouter.com` — never to any server controlled by this application. The input field always displays `'••••••••••••••••'` after a save so the raw key is never visible in the UI.

## Filters (`torn_filters`)

```js
saveFilters(obj)  // JSON.stringify; swallows exceptions silently
loadFilters()     // JSON.parse; returns null on error or absence
```

The stored object mirrors the shape passed to `saveFilters` from `applyFiltersAndRender`:

```js
{
  name, anonymous, hasReason,
  levelMin, levelMax, qtyMin, bountyMin, totalMin,
  sort, statusFilter, location
}
```

Restored by `applyFilterValues(f)` on init. The `location` value is applied only if the option already exists in the dynamic dropdown (avoids selecting a stale country).

## My Level (`torn_my_level`)

```js
saveMyLevel(n)   // stores String(n)
loadMyLevel()    // returns Number(...) || 0
```

Saved when `myLevel > 0` inside `applyFiltersAndRender`. Used to highlight fair-fight targets (±10 levels).

## Auto-Refresh (`torn_auto_refresh`)

```js
saveAutoRefresh(secs)  // stores String(secs)
loadAutoRefresh()      // returns Number(...) || 0
```

Saved on dropdown change. Restored to the `#auto-refresh-select` element on init.

## FFScouter Registration (`ffscouter_registered`)

```js
saveFfscouterRegistered()    // setItem(..., '1')
loadFfscouterRegistered()    // returns getItem(...) === '1'
clearFfscouterRegistered()   // removeItem(...)
```

Set to `'1'` after the user clicks "Register & Enable" and FFScouter registration succeeds. Cleared when the API key is cleared (`clearKeyBtn`). Controls whether the consent dialog is shown on the next "Check FF" click.
