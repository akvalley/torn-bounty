const list     = document.getElementById('bounty-list');
const countEl  = document.getElementById('bounty-count');
const statusEl = document.getElementById('status-msg');

// ── Status bar ──────────────────────────────────────────

export function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = type; // '', 'ok', 'error'
}

// ── Bounty list ─────────────────────────────────────────

export function showLoading() {
  list.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div>Loading bounties…</div>
    </div>`;
  countEl.textContent = '';
}

export function showError(msg) {
  list.innerHTML = `<p class="placeholder">${escHtml(msg)}</p>`;
  countEl.textContent = '';
}

export function showPlaceholder(msg) {
  list.innerHTML = `<p class="placeholder">${escHtml(msg)}</p>`;
  countEl.textContent = '';
}

/**
 * Render bounty cards.
 * @param {Array}  bounties — already filtered & sorted
 * @param {number} total    — total before filtering (for count display)
 * @param {number} myLevel  — player's own level (0 = not set); enables fair-fight highlight
 */
export function renderBounties(bounties, total, myLevel = 0) {
  if (bounties.length === 0) {
    list.innerHTML = '<p class="placeholder">No bounties match the current filters.</p>';
    countEl.textContent = `0 of ${total} bounties`;
    return;
  }

  countEl.textContent = `${bounties.length} of ${total} ${total === 1 ? 'bounty' : 'bounties'}`;

  list.innerHTML = bounties.map(b => cardHtml(b, myLevel)).join('');
}

// ── Card template ────────────────────────────────────────

function cardHtml(b, myLevel = 0) {
  const profileUrl = `https://www.torn.com/profiles.php?XID=${b.id}`;
  const huntUrl    = `https://www.torn.com/bounties.php?userID=${b.id}`;
  const listedBy   = b.listerName ? `Listed by ${escHtml(b.listerName)}` : 'Anonymous';
  const qtyBadge   = b.quantity > 1 ? `<span class="qty-badge">×${b.quantity}</span>` : '';

  // Expiring soon: under 60 minutes remaining
  const now          = Math.floor(Date.now() / 1000);
  const secsLeft     = b.validUntil - now;
  const expiringSoon = b.validUntil > 0 && secsLeft > 0 && secsLeft < 3600;
  const expiresIn    = b.validUntil ? `Expires ${timeUntil(b.validUntil)}` : '';
  const expiryClass  = expiringSoon ? ' class="expires-soon-text"' : '';

  // Fair-fight: target within ±10 levels of the player's level
  const fairFight = myLevel > 0 && Math.abs(b.level - myLevel) <= 10;

  const cardClass = ['bounty-card',
    expiringSoon ? 'expiring-soon' : '',
    fairFight    ? 'fair-fight'    : '',
  ].filter(Boolean).join(' ');

  return `
    <article class="${cardClass}">
      <div class="card-header">
        <div class="player-name">
          <a href="${profileUrl}" target="_blank" rel="noopener">${escHtml(b.name)}</a>
          ${qtyBadge}
        </div>
        <div class="reward-block">
          <div class="reward">${formatMoney(b.reward)}</div>
          ${b.quantity > 1
            ? `<div class="total-value">= ${formatMoney(b.totalValue)} total</div>`
            : ''}
        </div>
      </div>
      <div class="card-meta">
        <span>Level ${b.level}</span>
        <span>${listedBy}</span>
        ${expiresIn ? `<span${expiryClass}>${expiresIn}</span>` : ''}
      </div>
      ${b.reason ? `<div class="card-reason">${escHtml(b.reason)}</div>` : ''}
      <a href="${huntUrl}" target="_blank" rel="noopener">
        <button class="hunt-btn">Hunt</button>
      </a>
    </article>`;
}

// ── Helpers ──────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
}

function timeUntil(unixSec) {
  if (!unixSec) return '';
  const diff = unixSec - Math.floor(Date.now() / 1000);
  if (diff <= 0)    return 'soon';
  if (diff < 3600)  return `in ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `in ${Math.floor(diff / 3600)}h`;
  return `in ${Math.floor(diff / 86400)}d`;
}
