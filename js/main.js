import { saveApiKey, loadApiKey, clearApiKey,
         saveFilters, loadFilters,
         saveMyLevel, loadMyLevel,
         saveAutoRefresh, loadAutoRefresh } from './storage.js';
import { fetchAllBounties, tornErrorMessage } from './api.js';
import { setStatus, showLoading, showError, showPlaceholder, renderBounties } from './ui.js';

// ── Element refs ─────────────────────────────────────────
const keyInput    = document.getElementById('api-key-input');
const saveKeyBtn  = document.getElementById('save-key-btn');
const clearKeyBtn = document.getElementById('clear-key-btn');
const refreshBtn  = document.getElementById('refresh-btn');

const filterName      = document.getElementById('filter-name');
const filterAnonymous = document.getElementById('filter-anonymous');
const filterHasReason = document.getElementById('filter-has-reason');
const filterLevelMin  = document.getElementById('filter-level-min');
const filterLevelMax  = document.getElementById('filter-level-max');
const filterQtyMin    = document.getElementById('filter-qty-min');
const filterBountyMin = document.getElementById('filter-bounty-min');
const filterTotalMin  = document.getElementById('filter-total-min');
const sortSelect      = document.getElementById('sort-select');
const filterToggleBtn = document.getElementById('filter-toggle');
const filtersEl       = document.getElementById('filters');

const resetFiltersBtn   = document.getElementById('reset-filters-btn');
const myLevelInput      = document.getElementById('my-level');
const autoRefreshSelect = document.getElementById('auto-refresh-select');
const countdownDisplay  = document.getElementById('countdown-display');

// ── App state ─────────────────────────────────────────────
let allBounties         = [];
let refreshTimeoutId    = null;
let countdownIntervalId = null;

// ── Init ──────────────────────────────────────────────────
(function init() {
  // Restore persisted filter state
  const savedFilters = loadFilters();
  if (savedFilters) applyFilterValues(savedFilters);

  const savedLevel = loadMyLevel();
  if (savedLevel) myLevelInput.value = savedLevel;

  const savedInterval = loadAutoRefresh();
  if (savedInterval) autoRefreshSelect.value = String(savedInterval);

  updateFilterToggleBadge();

  const stored = loadApiKey();
  if (stored) {
    keyInput.value = '••••••••••••••••'; // mask stored key visually
    setReady(true);
    loadBounties();
  } else {
    showPlaceholder('Enter your API key above to load bounties.');
  }
})();

// ── Event listeners ───────────────────────────────────────
saveKeyBtn.addEventListener('click', () => {
  const val = keyInput.value.trim();
  if (!val || val === '••••••••••••••••') {
    setStatus('Please enter a valid API key.', 'error');
    return;
  }
  saveApiKey(val);
  keyInput.value = '••••••••••••••••';
  setStatus('API key saved.', 'ok');
  setReady(true);
  loadBounties();
});

clearKeyBtn.addEventListener('click', () => {
  clearApiKey();
  keyInput.value = '';
  allBounties = [];
  setReady(false);
  clearSchedule();
  countdownDisplay.textContent = '';
  setStatus('API key cleared.', '');
  showPlaceholder('Enter your API key above to load bounties.');
});

refreshBtn.addEventListener('click', loadBounties);

// Re-render on any filter or sort change
[
  filterName, filterAnonymous, filterHasReason,
  filterLevelMin, filterLevelMax, filterQtyMin,
  filterBountyMin, filterTotalMin, sortSelect,
  myLevelInput,
].forEach(el => el.addEventListener('input', applyFiltersAndRender));

// Toggle filter panel on mobile
filterToggleBtn.addEventListener('click', () => {
  filtersEl.classList.toggle('open');
  updateFilterToggleBadge();
});

// Reset all filters to defaults
resetFiltersBtn.addEventListener('click', () => {
  filterName.value      = '';
  filterAnonymous.value = 'all';
  filterHasReason.value = 'all';
  filterLevelMin.value  = '';
  filterLevelMax.value  = '';
  filterQtyMin.value    = '';
  filterBountyMin.value = '';
  filterTotalMin.value  = '';
  sortSelect.value      = 'reward-desc';
  saveFilters({});
  applyFiltersAndRender();
});

// Auto-refresh interval change
autoRefreshSelect.addEventListener('change', () => {
  saveAutoRefresh(autoRefreshSelect.value);
  if (allBounties.length > 0) scheduleNextRefresh();
  else { clearSchedule(); countdownDisplay.textContent = ''; }
});

// If the user clicks into the masked input, clear it so they can type
keyInput.addEventListener('focus', () => {
  if (keyInput.value === '••••••••••••••••') keyInput.value = '';
});

keyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveKeyBtn.click();
});

// ── Core functions ────────────────────────────────────────
async function loadBounties() {
  const key = loadApiKey();
  if (!key) {
    setStatus('No API key saved.', 'error');
    return;
  }

  clearSchedule();
  setStatus('Loading…', '');
  showLoading();
  refreshBtn.disabled = true;

  try {
    allBounties = await fetchAllBounties(key, (count) => {
      setStatus(`Loading… ${count} bounties so far`, '');
    });
    const timestamp = new Date().toLocaleTimeString();
    setStatus(`Updated at ${timestamp} · ${allBounties.length} total`, 'ok');
    applyFiltersAndRender();

  } catch (err) {
    const msg = tornErrorMessage(err);
    setStatus(msg, 'error');
    showError(msg);
    allBounties = [];
  } finally {
    refreshBtn.disabled = false;
    scheduleNextRefresh();
  }
}

function applyFiltersAndRender() {
  const nameQuery  = filterName.value.trim().toLowerCase();
  const anonymous  = filterAnonymous.value;   // 'all' | 'anonymous' | 'named'
  const hasReason  = filterHasReason.value;   // 'all' | 'yes' | 'no'
  const levelMin   = Number(filterLevelMin.value)  || 1;
  const levelMax   = Number(filterLevelMax.value)  || 100;
  const qtyMin     = Number(filterQtyMin.value)    || 1;
  const bountyMin  = Number(filterBountyMin.value) || 0;
  const totalMin   = Number(filterTotalMin.value)  || 0;
  const myLevel    = Number(myLevelInput.value)    || 0;

  // Persist current filter state
  saveFilters({
    name: filterName.value, anonymous, hasReason,
    levelMin: filterLevelMin.value, levelMax: filterLevelMax.value,
    qtyMin:   filterQtyMin.value,   bountyMin: filterBountyMin.value,
    totalMin: filterTotalMin.value, sort: sortSelect.value,
  });
  if (myLevel) saveMyLevel(myLevel);

  updateFilterToggleBadge();

  let filtered = allBounties.filter(b => {
    if (nameQuery && !b.name.toLowerCase().includes(nameQuery)) return false;
    if (anonymous === 'anonymous' && b.listerName !== null)     return false;
    if (anonymous === 'named'     && b.listerName === null)     return false;
    if (hasReason === 'yes'       && !b.reason)                 return false;
    if (hasReason === 'no'        && b.reason)                  return false;
    if (b.level      < levelMin)  return false;
    if (b.level      > levelMax)  return false;
    if (b.quantity   < qtyMin)    return false;
    if (b.reward     < bountyMin) return false;
    if (b.totalValue < totalMin)  return false;
    return true;
  });

  filtered = sortBounties(filtered, sortSelect.value);
  renderBounties(filtered, allBounties.length, myLevel);
}

function sortBounties(arr, mode) {
  return [...arr].sort((a, b) => {
    switch (mode) {
      case 'reward-desc': return b.reward      - a.reward;
      case 'reward-asc':  return a.reward      - b.reward;
      case 'total-desc':  return b.totalValue  - a.totalValue;
      case 'total-asc':   return a.totalValue  - b.totalValue;
      case 'level-asc':   return a.level       - b.level;
      case 'level-desc':  return b.level       - a.level;
      case 'qty-desc':    return b.quantity    - a.quantity;
      case 'qty-asc':     return a.quantity    - b.quantity;
      default:            return 0;
    }
  });
}

// ── Filter helpers ────────────────────────────────────────

function applyFilterValues(f) {
  if (f.name      != null) filterName.value      = f.name;
  if (f.anonymous != null) filterAnonymous.value = f.anonymous;
  if (f.hasReason != null) filterHasReason.value = f.hasReason;
  if (f.levelMin  != null) filterLevelMin.value  = f.levelMin;
  if (f.levelMax  != null) filterLevelMax.value  = f.levelMax;
  if (f.qtyMin    != null) filterQtyMin.value    = f.qtyMin;
  if (f.bountyMin != null) filterBountyMin.value = f.bountyMin;
  if (f.totalMin  != null) filterTotalMin.value  = f.totalMin;
  if (f.sort      != null) sortSelect.value      = f.sort;
}

function updateFilterToggleBadge() {
  const active = [
    filterName.value.trim()    !== '',
    filterAnonymous.value      !== 'all',
    filterHasReason.value      !== 'all',
    filterLevelMin.value !== '' && filterLevelMin.value !== '1',
    filterLevelMax.value !== '' && filterLevelMax.value !== '100',
    filterQtyMin.value   !== '' && filterQtyMin.value   !== '1',
    filterBountyMin.value !== '' && filterBountyMin.value !== '0',
    filterTotalMin.value  !== '' && filterTotalMin.value  !== '0',
    sortSelect.value       !== 'reward-desc',
  ].filter(Boolean).length;

  const isOpen = filtersEl.classList.contains('open');
  const arrow  = isOpen ? '▴' : '▾';
  filterToggleBtn.textContent = active > 0
    ? `Filters (${active}) ${arrow}`
    : `Filters ${arrow}`;
}

// ── Auto-refresh ──────────────────────────────────────────

function scheduleNextRefresh() {
  clearSchedule();
  const secs = Number(autoRefreshSelect.value);
  if (!secs) { countdownDisplay.textContent = ''; return; }

  const deadline = Date.now() + secs * 1000;

  countdownIntervalId = setInterval(() => {
    const remaining = Math.ceil((deadline - Date.now()) / 1000);
    if (remaining <= 0) {
      countdownDisplay.textContent = '';
      clearInterval(countdownIntervalId);
    } else {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      countdownDisplay.textContent = `↻ ${m}:${s.toString().padStart(2, '0')}`;
    }
  }, 500);

  refreshTimeoutId = setTimeout(() => {
    clearInterval(countdownIntervalId);
    countdownDisplay.textContent = '';
    loadBounties();
  }, secs * 1000);
}

function clearSchedule() {
  clearTimeout(refreshTimeoutId);
  clearInterval(countdownIntervalId);
  refreshTimeoutId    = null;
  countdownIntervalId = null;
}

function setReady(ready) {
  refreshBtn.disabled = !ready;
}
