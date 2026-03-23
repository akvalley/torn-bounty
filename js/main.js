import { saveApiKey, loadApiKey, clearApiKey,
         saveFilters, loadFilters,
         saveMyLevel, loadMyLevel,
         saveAutoRefresh, loadAutoRefresh,
         saveFfscouterRegistered, loadFfscouterRegistered, clearFfscouterRegistered } from './storage.js';
import { fetchAllBounties, fetchStatusBatch, tornErrorMessage,
         ffscouterRegister, ffscouterCheckKey, fetchFairFightBatch } from './api.js';
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

const filterLocation    = document.getElementById('filter-location');
const resetFiltersBtn   = document.getElementById('reset-filters-btn');
const myLevelInput      = document.getElementById('my-level');
const autoRefreshSelect = document.getElementById('auto-refresh-select');
const countdownDisplay  = document.getElementById('countdown-display');
const helpBtn           = document.getElementById('help-btn');
const helpDialog        = document.getElementById('help-dialog');
const checkStatusBtn    = document.getElementById('check-status-btn');
const statusCheckedTime = document.getElementById('status-checked-time');
const checkFfBtn        = document.getElementById('check-ff-btn');
const ffCheckedTime     = document.getElementById('ff-checked-time');
const ffConsentDialog   = document.getElementById('ff-consent-dialog');
const ffConsentAgreeBtn = document.getElementById('ff-consent-agree-btn');
const ffConsentCancelBtn = document.getElementById('ff-consent-cancel-btn');

// ── App state ─────────────────────────────────────────────
let allBounties         = [];
let currentFiltered     = [];   // last rendered set; used for status batch IDs
let statusMap           = {};   // { [targetId]: {state, description, until, ...} }
let ffMap               = {};   // { [targetId]: {fairFight, bsEstimate, lastUpdated} }
let refreshTimeoutId    = null;
let countdownIntervalId = null;

const STATUS_CHECK_LIMIT = 100;

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
  allBounties    = [];
  currentFiltered = [];
  statusMap      = {};
  ffMap          = {};
  clearFfscouterRegistered();
  setReady(false);
  clearSchedule();
  countdownDisplay.textContent  = '';
  statusCheckedTime.textContent = '';
  checkStatusBtn.disabled = true;
  checkStatusBtn.textContent = 'Check Status';
  ffCheckedTime.textContent = '';
  checkFfBtn.disabled = true;
  checkFfBtn.textContent = 'Check FF';
  setStatus('API key cleared.', '');
  showPlaceholder('Enter your API key above to load bounties.');
});

refreshBtn.addEventListener('click', loadBounties);

// Re-render on any filter or sort change
[
  filterName, filterAnonymous, filterHasReason,
  filterLevelMin, filterLevelMax, filterQtyMin,
  filterBountyMin, filterTotalMin, sortSelect,
  myLevelInput, filterLocation,
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
  filterLocation.value  = 'all';
  saveFilters({});
  applyFiltersAndRender();
});

// Auto-refresh interval change
autoRefreshSelect.addEventListener('change', () => {
  saveAutoRefresh(autoRefreshSelect.value);
  if (allBounties.length > 0) scheduleNextRefresh();
  else { clearSchedule(); countdownDisplay.textContent = ''; }
});

// Help dialog
helpBtn.addEventListener('click', () => helpDialog.showModal());
document.getElementById('help-close-btn').addEventListener('click', () => helpDialog.close());
helpDialog.addEventListener('click', (e) => { if (e.target === helpDialog) helpDialog.close(); });

// Check Status
checkStatusBtn.addEventListener('click', async () => {
  const key = loadApiKey();
  if (!key || !currentFiltered.length) return;

  const ids = currentFiltered.map(b => b.id);

  checkStatusBtn.disabled = true;
  checkStatusBtn.textContent = 'Checking…';
  statusCheckedTime.textContent = '';

  try {
    const batch = await fetchStatusBatch(key, ids);
    Object.assign(statusMap, batch);
    updateLocationOptions();
    applyFiltersAndRender();
    statusCheckedTime.textContent = `as of ${new Date().toLocaleTimeString()}`;
    checkStatusBtn.textContent = '↻ Re-check';
  } catch (err) {
    statusCheckedTime.textContent = 'Status check failed';
    checkStatusBtn.textContent = 'Check Status';
  } finally {
    updateCheckStatusBtn(currentFiltered.length);
  }
});

// Check FF
checkFfBtn.addEventListener('click', async () => {
  const key = loadApiKey();
  if (!key || !currentFiltered.length) return;

  if (!loadFfscouterRegistered()) {
    ffConsentDialog.showModal();
    return;
  }

  await runFfCheck(key);
});

ffConsentAgreeBtn.addEventListener('click', async () => {
  ffConsentDialog.close();
  const key = loadApiKey();
  if (!key) return;
  await runFfCheckWithRegistration(key);
});

ffConsentCancelBtn.addEventListener('click', () => ffConsentDialog.close());
ffConsentDialog.addEventListener('click', (e) => { if (e.target === ffConsentDialog) ffConsentDialog.close(); });

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

  // Clear stale status + FF data from previous load
  statusMap = {};
  statusCheckedTime.textContent = '';
  checkStatusBtn.textContent = 'Check Status';
  ffMap = {};
  ffCheckedTime.textContent = '';
  checkFfBtn.textContent = 'Check FF';
  updateLocationOptions();

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

  const locFilter = filterLocation.value;

  // Persist current filter state
  saveFilters({
    name: filterName.value, anonymous, hasReason,
    levelMin: filterLevelMin.value, levelMax: filterLevelMax.value,
    qtyMin:   filterQtyMin.value,   bountyMin: filterBountyMin.value,
    totalMin: filterTotalMin.value, sort: sortSelect.value,
    location: locFilter,
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
    if (locFilter !== 'all' && statusMap[b.id]) {
      if (extractLocation(statusMap[b.id]) !== locFilter) return false;
    }
    return true;
  });

  filtered = sortBounties(filtered, sortSelect.value);
  currentFiltered = filtered;
  renderBounties(filtered, allBounties.length, myLevel, statusMap, ffMap);
  updateCheckStatusBtn(filtered.length);
  updateCheckFfBtn(filtered.length);
  updateLocationOptions(filtered.length);
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
  // location is dynamic — only restore if the option exists
  if (f.location  != null) filterLocation.value  = f.location;
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
    filterLocation.value   !== 'all',
  ].filter(Boolean).length;

  const isOpen = filtersEl.classList.contains('open');
  const arrow  = isOpen ? '▴' : '▾';
  filterToggleBtn.textContent = active > 0
    ? `Filters (${active}) ${arrow}`
    : `Filters ${arrow}`;
}

function extractLocation(status) {
  if (!status || status.state !== 'Traveling') return 'Torn City';
  const desc = (status.description ?? '').trim();
  if (desc.startsWith('Traveling to ')) return desc.slice(13).trim();
  if (desc.startsWith('Returning to ')) return 'Torn City';
  if (desc.startsWith('In '))           return desc.slice(3).trim();
  return 'Traveling'; // fallback for unrecognised description
}

function updateLocationOptions(visibleCount = currentFiltered.length) {
  const current  = filterLocation.value;
  const hasData  = Object.keys(statusMap).length > 0;
  const canUse   = hasData && visibleCount <= STATUS_CHECK_LIMIT;

  // Collect unique locations from current status data
  const locationSet = new Set();
  Object.values(statusMap).forEach(s => locationSet.add(extractLocation(s)));

  // Rebuild option list
  filterLocation.innerHTML = '';
  filterLocation.add(new Option('All locations', 'all'));
  if (locationSet.has('Torn City')) {
    filterLocation.add(new Option('Torn City', 'Torn City'));
    locationSet.delete('Torn City');
  }
  [...locationSet].sort().forEach(loc => filterLocation.add(new Option(loc, loc)));

  // Restore prior selection if it still exists in the new list
  if ([...filterLocation.options].some(o => o.value === current)) {
    filterLocation.value = current;
  }

  filterLocation.disabled = !canUse;
}

function updateCheckStatusBtn(visibleCount) {
  const hasKey   = !!loadApiKey();
  const canCheck = hasKey && visibleCount > 0 && visibleCount <= STATUS_CHECK_LIMIT;
  checkStatusBtn.disabled = !canCheck;
  if (!hasKey || visibleCount === 0) {
    checkStatusBtn.title = '';
  } else if (visibleCount > STATUS_CHECK_LIMIT) {
    checkStatusBtn.title = `Filter to ≤${STATUS_CHECK_LIMIT} bounties to enable status check`;
  } else {
    checkStatusBtn.title = 'Fetch live status for all visible targets';
  }
}

function updateCheckFfBtn(visibleCount) {
  const hasKey   = !!loadApiKey();
  const canCheck = hasKey && visibleCount > 0 && visibleCount <= STATUS_CHECK_LIMIT;
  checkFfBtn.disabled = !canCheck;
  if (!hasKey || visibleCount === 0) {
    checkFfBtn.title = '';
  } else if (visibleCount > STATUS_CHECK_LIMIT) {
    checkFfBtn.title = `Filter to ≤${STATUS_CHECK_LIMIT} bounties to enable FF check`;
  } else {
    checkFfBtn.title = 'Fetch fair fight values for all visible targets';
  }
}

async function runFfCheckWithRegistration(key) {
  checkFfBtn.disabled = true;
  checkFfBtn.textContent = 'Registering…';
  ffCheckedTime.textContent = '';
  try {
    try {
      await ffscouterRegister(key);
    } catch {
      // May already be registered — confirm with check-key
      const status = await ffscouterCheckKey(key);
      if (!status.is_registered) throw new Error('FFScouter registration failed.');
    }
    saveFfscouterRegistered();
    await runFfCheck(key);
  } catch (err) {
    ffCheckedTime.textContent = 'Registration failed';
    checkFfBtn.textContent = 'Check FF';
    updateCheckFfBtn(currentFiltered.length);
  }
}

async function runFfCheck(key) {
  const ids = currentFiltered.map(b => b.id);
  checkFfBtn.disabled = true;
  checkFfBtn.textContent = 'Checking…';
  ffCheckedTime.textContent = '';
  try {
    const batch = await fetchFairFightBatch(key, ids);
    Object.assign(ffMap, batch);
    applyFiltersAndRender();
    ffCheckedTime.textContent = `as of ${new Date().toLocaleTimeString()}`;
    checkFfBtn.textContent = '↻ Re-check FF';
  } catch (err) {
    ffCheckedTime.textContent = 'FF check failed';
    checkFfBtn.textContent = 'Check FF';
  } finally {
    updateCheckFfBtn(currentFiltered.length);
  }
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
