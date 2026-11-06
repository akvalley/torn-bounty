# Files

- [Auto-Refresh Scheduling](auto-refresh.md) - Interval options (Off / 2m / 5m / 10m), the setTimeout + setInterval countdown pair, clearSchedule lifecycle, and how stale enrichment data is cleared on each new load.
- [Fair Fight Enrichment](ff-enrichment.md) - Check FF button lifecycle, the FFScouter one-time consent dialog, registration/check-key fallback, ffMap population, and how FF multipliers and stat estimates are displayed on bounty cards.
- [Filter Pipeline](filter-pipeline.md) - All 11 filter dimensions, 8 sort modes, the applyFiltersAndRender flow, auto-disable rules for the two status-gated filters (Status + Location), filter persistence, and the mobile badge count.
- [Player Status Enrichment](status-enrichment.md) - Check Status button lifecycle, the 100-target gate, parallel fetches with Promise.allSettled, statusMap population, extractLocation logic for the Location filter, and how Status and Location filter selects are enabled or disabled.
