---
type: api-integration
title: Torn API Integration
description: Covers bounty pagination over /v2/torn/bounties, parallel per-player status fetches via /v2/user/:id, normalisation of raw API shapes into internal objects, and TornApiError handling with human-readable messages.
tags: [torn-api, bounties, status, pagination, error-handling]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-06T04:41:53.634Z
sources:
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-e298bfc9d2710d6f76541ae6
    resource: repo://js/api.js
generated: { by: "claude-code", at: "2026-11-06T04:41:53.634Z" }
---

# Torn API Integration

All Torn City API calls originate exclusively from `js/api.js`. No other module makes `fetch` calls to `api.torn.com`.

Base URL: `https://api.torn.com`. Auth: `?key=<apiKey>` query parameter on every request.

## Bounty Pagination

`fetchAllBounties(apiKey, onProgress?)` pages through `/v2/torn/bounties` until a short page signals the end.

- Page size: 100 (Torn API v2 maximum).
- Offset increments by 100 per page.
- Termination: a page with `length < PAGE_SIZE` ends the loop.
- `onProgress(count)` is called after each page with the running total (used to update the status bar in `main.js`).

The internal `fetchBountyPage(apiKey, offset)` does the single-page fetch; it throws `TornApiError` on a JSON `error` field or a plain `Error` on a non-2xx HTTP status.

### Normalised bounty shape

Raw v2 field names are mapped to shorter camelCase keys:

| Raw field       | Normalised key | Notes                                        |
|-----------------|----------------|----------------------------------------------|
| `target_id`     | `id`           |                                              |
| `target_name`   | `name`         | default `'Unknown'`                          |
| `target_level`  | `level`        |                                              |
| `reward`        | `reward`       |                                              |
| `quantity`      | `quantity`     | default `1`                                  |
| _(computed)_    | `totalValue`   | `reward * quantity`                          |
| `reason`        | `reason`       | default `''`                                 |
| `is_anonymous`  | `listerName`   | `null` when anonymous, name string otherwise |
| `valid_until`   | `validUntil`   | Unix timestamp                               |

## Player Status Fetches

`fetchStatusBatch(apiKey, ids)` fetches live profiles for multiple players in parallel.

- Calls `GET /v2/user/:id?selections=profile` for each ID.
- Uses `Promise.allSettled` so individual failures (rate-limit, private profile) don't abort the batch — failed IDs are simply absent from the returned map.
- Returns `{ [id]: statusObject }`.

### Normalised status shape

```js
{
  state:       string,   // 'Okay' | 'Hospital' | 'Traveling' | 'Jail' | 'Federal' | 'Unknown'
  description: string,   // e.g. "Traveling to Cayman Islands"
  until:       number,   // Unix timestamp (hospital/jail release time; 0 if N/A)
  rank:        string,   // e.g. "Reasonable"
  title:       string,   // honour title, e.g. "Slayer"
  lastAction:  string,   // relative string from API, e.g. "6 minutes ago"
  life:        { current: number, maximum: number },
  revivable:   boolean,
}
```

## Error Handling

`TornApiError` is a subclass of `Error` with an integer `code` property. It is thrown whenever the API JSON contains an `error` field.

`tornErrorMessage(err)` maps the most common codes to user-readable strings:

| Code | Message                                    |
|------|--------------------------------------------|
| 1    | Key not provided.                          |
| 2    | Incorrect API key.                         |
| 5    | Too many requests — slow down.             |
| 6    | Access level too low for this selection.   |
| 13   | Selection is not valid.                    |

Unknown codes fall back to `API error <code>: <message>`. Non-`TornApiError` instances return `err.message` unchanged.
