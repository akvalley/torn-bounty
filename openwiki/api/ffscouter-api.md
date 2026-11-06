---
type: api-integration
title: FFScouter API Integration
description: Covers the three FFScouter endpoints used (register, check-key, get-stats), the registration flow with its fallback logic, the ffMap data shape, and how errors are surfaced.
tags: [ffscouter, fair-fight, api, registration]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-06T04:41:53.634Z
sources:
  - id: openwiki-source-e298bfc9d2710d6f76541ae6
    resource: repo://js/api.js
  - id: openwiki-source-6177b06be54e22dc8ce1bbda
    resource: repo://js/main.js
  - id: openwiki-source-2d4818a82a9917305ccf7ff8
    resource: repo://js/storage.js
generated: { by: "claude-code", at: "2026-11-06T04:41:53.634Z" }
---

# FFScouter API Integration

FFScouter (`https://ffscouter.com`) provides fair fight multipliers and battle-stat estimates for Torn City players. Three endpoints are used, all in `js/api.js`.

## Endpoints

### POST /api/v1/register

Registers the user's Torn API key with FFScouter and opts in to data sharing.

```
POST https://ffscouter.com/api/v1/register
Content-Type: application/json

{ "key": "<apiKey>", "agree_to_data_policy": true, "signup_source": "tornbountyhunter" }
```

`signup_source` is hardcoded to `"tornbountyhunter"`. On non-2xx HTTP status the function throws; on a JSON `error` field it also throws with the error message.

### GET /api/v1/check-key

Confirms whether a key is already registered. Used as a fallback when `register` fails (the key may already exist).

```
GET https://ffscouter.com/api/v1/check-key?key=<apiKey>
```

Returns `{ is_registered: boolean }`. Used only inside `runFfCheckWithRegistration` to verify registration succeeded via an alternate path.

### GET /api/v1/get-stats

Fetches fair fight values and stat estimates for a batch of player IDs in one request.

```
GET https://ffscouter.com/api/v1/get-stats?key=<apiKey>&targets=<id1>,<id2>,...
```

Returns an array of player objects. Each is normalised into the `ffMap`:

```js
// ffMap shape: { [playerId]: { fairFight, bsEstimate, lastUpdated } }
map[p.player_id] = {
  fairFight:   p.fair_fight,          // number | null
  bsEstimate:  p.bs_estimate_human,   // string, e.g. "2.99b"
  lastUpdated: p.last_updated,
};
```

## Registration Flow

The consent dialog (`#ff-consent-dialog`) gates first use. On "Register & Enable":

1. `ffscouterRegister(key)` is called.
2. If it throws (key may already be registered), `ffscouterCheckKey(key)` is called as fallback.
3. If `is_registered` is false after both attempts, the whole flow throws and shows "Registration failed".
4. On success, `saveFfscouterRegistered()` persists a `ffscouter_registered=1` flag in localStorage so the consent dialog is skipped on future uses.

Subsequent "Check FF" clicks go directly to `runFfCheck(key)` without re-registering.

## Error Handling

- Non-2xx HTTP: throws `Error("HTTP <status>")`.
- JSON `error` field: throws with `data.error.message ?? data.error`.
- No `TornApiError` is used for FFScouter — errors surface as plain `Error` instances and are caught in `runFfCheckWithRegistration` / `runFfCheck`, which set the `#ff-checked-time` span to `"Registration failed"` or `"FF check failed"` and re-enable the button.
- `fetchFairFightBatch` does **not** use `Promise.allSettled` — a single FFScouter call covers all IDs; if it fails the whole batch fails.
