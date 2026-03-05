import { saveApiKey, loadApiKey, clearApiKey, hasApiKey } from './storage.js';
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

// ── App state ─────────────────────────────────────────────
let allBounties = [];

// ── Init ──────────────────────────────────────────────────
(function init() {
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
  setStatus('API key cleared.', '');
  showPlaceholder('Enter your API key above to load bounties.');
});

refreshBtn.addEventListener('click', loadBounties);

// Re-render on any filter or sort change
[
  filterName, filterAnonymous, filterHasReason,
  filterLevelMin, filterLevelMax, filterQtyMin,
  filterBountyMin, filterTotalMin, sortSelect,
].forEach(el => el.addEventListener('input', applyFiltersAndRender));

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
  renderBounties(filtered, allBounties.length);
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

function setReady(ready) {
  refreshBtn.disabled = !ready;
}
