# Files

- [FFScouter API Integration](ffscouter-api.md) - Covers the three FFScouter endpoints used (register, check-key, get-stats), the registration flow with its fallback logic, the ffMap data shape, and how errors are surfaced.
- [Torn API Integration](torn-api.md) - Covers bounty pagination over /v2/torn/bounties, parallel per-player status fetches via /v2/user/:id, normalisation of raw API shapes into internal objects, and TornApiError handling with human-readable messages.
