import { saveApiKey, loadApiKey, clearApiKey, hasApiKey } from './storage.js';
import { fetchBounties, checkCors, tornErrorMessage } from './api.js';
import { setStatus, setCorsBadge, showLoading, showError, showPlaceholder, renderBounties } from './ui.js';

// ── Element refs ─────────────────────────────────────────
const keyInput    = document.getElementById('api-key-input');
const saveKeyBtn  = document.getElementById('save-key-btn');
const clearKeyBtn = document.getElementById('clear-key-btn');
const refreshBtn  = document.getElementById('refresh-btn');

const filterLevelMin  = document.getElementById('filter-level-min');
const filterLevelMax  = document.getElementById('filter-level-max');
const filterBountyMin = document.getElementById('filter-bounty-min');
const sortSelect      = document.getElementById('sort-select');

// ── App state ─────────────────────────────────────────────
let allBounties   = [];
let corsChecked   = false;

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
[filterLevelMin, filterLevelMax, filterBountyMin, sortSelect].forEach(el => {
  el.addEventListener('input', applyFiltersAndRender);
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

  setStatus('Loading…', '');
  showLoading();
  refreshBtn.disabled = true;

  try {
    allBounties = await fetchBounties(key);
    const timestamp = new Date().toLocaleTimeString();
    setStatus(`Updated at ${timestamp}`, 'ok');
    applyFiltersAndRender();

    // Run CORS check once after first successful fetch
    if (!corsChecked) {
      corsChecked = true;
      checkCors(key).then(setCorsBadge);
    }
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
  const levelMin  = Number(filterLevelMin.value)  || 1;
  const levelMax  = Number(filterLevelMax.value)  || 100;
  const bountyMin = Number(filterBountyMin.value) || 0;

  let filtered = allBounties.filter(b =>
    b.level  >= levelMin &&
    b.level  <= levelMax &&
    b.reward >= bountyMin
  );

  filtered = sortBounties(filtered, sortSelect.value);
  renderBounties(filtered, allBounties.length);
}

function sortBounties(arr, mode) {
  return [...arr].sort((a, b) => {
    switch (mode) {
      case 'reward-desc': return b.reward - a.reward;
      case 'reward-asc':  return a.reward - b.reward;
      case 'level-asc':   return a.level  - b.level;
      case 'level-desc':  return b.level  - a.level;
      default:            return 0;
    }
  });
}

function setReady(ready) {
  refreshBtn.disabled = !ready;
}
