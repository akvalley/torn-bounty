const KEY_NAME = 'torn_api_key';

export function saveApiKey(key) {
  localStorage.setItem(KEY_NAME, key.trim());
}

export function loadApiKey() {
  return localStorage.getItem(KEY_NAME) ?? '';
}

export function clearApiKey() {
  localStorage.removeItem(KEY_NAME);
}

export function hasApiKey() {
  return loadApiKey().length > 0;
}

// ── Filters ───────────────────────────────────────────────

const FILTERS_KEY = 'torn_filters';

export function saveFilters(f) {
  try { localStorage.setItem(FILTERS_KEY, JSON.stringify(f)); } catch {}
}

export function loadFilters() {
  try { return JSON.parse(localStorage.getItem(FILTERS_KEY)); } catch { return null; }
}

// ── My level ──────────────────────────────────────────────

const MY_LEVEL_KEY = 'torn_my_level';

export function saveMyLevel(n) {
  localStorage.setItem(MY_LEVEL_KEY, String(n));
}

export function loadMyLevel() {
  return Number(localStorage.getItem(MY_LEVEL_KEY)) || 0;
}

// ── Auto-refresh ──────────────────────────────────────────

const AUTO_REFRESH_KEY = 'torn_auto_refresh';

export function saveAutoRefresh(secs) {
  localStorage.setItem(AUTO_REFRESH_KEY, String(secs));
}

export function loadAutoRefresh() {
  return Number(localStorage.getItem(AUTO_REFRESH_KEY)) || 0;
}
