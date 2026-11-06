---
type: rendering
title: Bounty Card Rendering
description: Structure of the bounty card HTML template, all visual elements (status badges, profile row, expiry and fair-fight highlights, quantity badge), escHtml XSS safety, and the formatMoney/timeUntil formatting helpers.
tags: [rendering, ui, card, status-badge, eschtml, formatting]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-06T04:41:53.634Z
sources:
  - id: openwiki-source-9d69c1e449544a6ab15c4d3c
    resource: repo://js/ui.js
generated: { by: "claude-code", at: "2026-11-06T04:41:53.634Z" }
---

# Bounty Card Rendering

`renderBounties(bounties, total, myLevel, statusMap, ffMap)` in `js/ui.js` replaces `#bounty-list` innerHTML with one `<article>` per bounty, produced by `cardHtml(b, myLevel, status, ff)`.

## Card Structure

```
<article class="bounty-card [expiring-soon] [fair-fight]">
  <div class="card-header">
    player name + profile link + ×N quantity badge
    reward block (per-listing + total if qty > 1)
  </div>
  <div class="card-meta">
    Level N · Listed by / Anonymous · Expires ... · [status badge]
  </div>
  [<div class="card-profile-row">rank · lastAction · life% · revivable · FF badge · stat estimate</div>]
  [<div class="card-reason">...</div>]
  <a href="bounties.php?userID=..."><button class="hunt-btn">Hunt</button></a>
</article>
```

## Article CSS Classes

| Class | Condition |
|-------|-----------|
| `expiring-soon` | `validUntil > 0 && secsLeft < 3600` (under 60 minutes) |
| `fair-fight` | `myLevel > 0 && Math.abs(b.level - myLevel) <= 10` |

## Quantity Badge

`×N` badge (`<span class="qty-badge">`) shown only when `b.quantity > 1`. Total payout line (`= $X total`) shown in the reward block under the same condition.

## Status Badge (`statusBadgeHtml`)

Renders a `<span class="status-badge status-<cls>">` in `card-meta` when status data exists.

| State | Icon | CSS class | Label |
|-------|------|-----------|-------|
| Okay | ● | `ok` | Okay |
| Hospital | ✚ | `hospital` | Hosp · `timeUntil(until)` |
| Traveling | ✈ | `traveling` | Traveling |
| Jail | ⚑ | `jail` | Jail · `timeUntil(until)` |
| Federal | ⊘ | `federal` | Federal |
| _(other)_ | ? | `unknown` | raw state string |

The `title` attribute carries the full status description (tooltip on hover).

## Profile Row (`profileRowHtml`)

Rendered only when status or FF data is present. Fields added in order if present:

1. **⚔ Rank · Title** — `status.rank` and optionally `status.title` (italic).
2. **⏱ Last active** — `status.lastAction` (relative string from API).
3. **♥ Life %** — `Math.round(current/maximum * 100)%`, CSS class `life-high` (> 66%), `life-mid` (> 33%), `life-low` (≤ 33%).
4. **⚕ Revivable** — only when `status.revivable && status.state === 'Hospital'`.
5. **FF badge** — `FF N×` with `ff-high` (≥ 2), `ff-mid` (≥ 1), `ff-low` (< 1), `ff-unknown` (null).
6. **⚡ stat estimate** — `ff.bsEstimate` string when present.

## Expiry Text

`expiresIn = timeUntil(b.validUntil)` shown in `card-meta`. When `expiringSoon`, the `<span>` gets `class="expires-soon-text"`.

## Security: escHtml

All user-derived or API-derived string values rendered into HTML go through `escHtml(str)`, which escapes `& < > "`. This applies to: `b.name`, `b.listerName`, `b.reason`, `status.rank`, `status.title`, `status.lastAction`, `status.description` (tooltip), `ff.bsEstimate`, and all profile-row strings.

## Formatting Helpers

**`formatMoney(n)`** — `$NM` (≥ 1 000 000), `$NK` (≥ 1 000), `$N` otherwise.

**`timeUntil(unixSec)`** — `'soon'` (past), `'in Nm'` (< 1h), `'in Nh'` (< 1d), `'in Nd'` otherwise. Returns `''` for falsy input.

## Hunt Link

Each card links to `https://www.torn.com/bounties.php?userID=<id>` (opens in new tab). The player name links to `https://www.torn.com/profiles.php?XID=<id>`.
