const BASE_URL = 'https://api.torn.com';
const PAGE_SIZE = 100; // Torn API v2 returns up to 100 bounties per request

/**
 * Fetch a single page of bounties from the Torn API v2.
 * @param {string} apiKey
 * @param {number} offset
 * @returns {Promise<Array>} Normalised bounty objects for this page
 */
async function fetchBountyPage(apiKey, offset = 0) {
  const url = `${BASE_URL}/v2/torn/bounties?offset=${offset}&key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new TornApiError(data.error.code, data.error.error);
  }

  return normaliseBounties(data.bounties ?? []);
}

/**
 * Fetch ALL bounties by paging through the API until a short page signals the end.
 * @param {string} apiKey
 * @param {(count: number) => void} [onProgress] Called after each page with running total
 * @returns {Promise<Array>} All normalised bounty objects
 */
export async function fetchAllBounties(apiKey, onProgress) {
  let all = [];
  let offset = 0;

  while (true) {
    const page = await fetchBountyPage(apiKey, offset);
    all = all.concat(page);
    onProgress?.(all.length);

    // A page shorter than PAGE_SIZE means we've reached the last page
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

/**
 * Normalise the Torn API v2 bounty array.
 * v2 shape: [{
 *   target_id, target_name, target_level,
 *   lister_id, lister_name, is_anonymous,
 *   reward, reason, quantity, valid_until
 * }]
 */
function normaliseBounties(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(b => {
    const reward   = b.reward   ?? 0;
    const quantity = b.quantity ?? 1;
    return {
      id:         b.target_id    ?? 0,
      name:       b.target_name  ?? 'Unknown',
      level:      b.target_level ?? 0,
      reward,
      quantity,
      totalValue: reward * quantity,
      reason:     b.reason       ?? '',
      listerName: b.is_anonymous ? null : (b.lister_name ?? null),
      validUntil: b.valid_until  ?? 0,
    };
  });
}


/**
 * Fetch the live status of a single Torn user (basic selection).
 * @param {string} apiKey
 * @param {number} userId
 * @returns {Promise<{state:string, description:string, until:number}>}
 */
async function fetchUserStatus(apiKey, userId) {
  const url = `${BASE_URL}/v2/user/${userId}?selections=profile&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new TornApiError(data.error.code, data.error.error);
  const p = data?.profile ?? {};
  const s = p.status ?? {};
  const l = p.life   ?? {};
  return {
    state:       s.state                  ?? 'Unknown',
    description: s.description            ?? '',
    until:       s.until                  ?? 0,
    rank:        p.rank                   ?? '',
    title:       p.title                  ?? '',
    lastAction:  p.last_action?.relative  ?? '',
    life:        { current: l.current ?? 0, maximum: l.maximum ?? 0 },
    revivable:   p.revivable              ?? false,
  };
}

/**
 * Fetch statuses for multiple users in parallel.
 * Uses Promise.allSettled so individual failures don't abort the batch.
 * @param {string}   apiKey
 * @param {number[]} ids
 * @returns {Promise<Object>} Map of { [id]: {state, description, until} }
 */
export async function fetchStatusBatch(apiKey, ids) {
  const results = await Promise.allSettled(
    ids.map(id => fetchUserStatus(apiKey, id).then(status => ({ id, status })))
  );
  return results.reduce((map, r) => {
    if (r.status === 'fulfilled') map[r.value.id] = r.value.status;
    return map;
  }, {});
}


// ── FFScouter API ──────────────────────────────────────────

const FF_BASE          = 'https://ffscouter.com';
const FF_SIGNUP_SOURCE = 'tornbountyhunter';

export async function ffscouterRegister(apiKey) {
  const res = await fetch(`${FF_BASE}/api/v1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: apiKey,
      agree_to_data_policy: true,
      signup_source: FF_SIGNUP_SOURCE,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`FFScouter: ${data.error?.message ?? data.error}`);
  return data;
}

export async function ffscouterCheckKey(apiKey) {
  const res = await fetch(`${FF_BASE}/api/v1/check-key?key=${encodeURIComponent(apiKey)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Fetch fair fight values and stat estimates for a batch of player IDs.
 * @param {string}   apiKey
 * @param {number[]} ids
 * @returns {Promise<Object>} Map of { [playerId]: {fairFight, bsEstimate, lastUpdated} }
 */
export async function fetchFairFightBatch(apiKey, ids) {
  const res = await fetch(
    `${FF_BASE}/api/v1/get-stats?key=${encodeURIComponent(apiKey)}&targets=${ids.join(',')}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.reduce((map, p) => {
    map[p.player_id] = {
      fairFight:   p.fair_fight,
      bsEstimate:  p.bs_estimate_human,
      lastUpdated: p.last_updated,
    };
    return map;
  }, {});
}


export class TornApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'TornApiError';
  }
}

/** Human-readable messages for common Torn API error codes */
export function tornErrorMessage(err) {
  if (!(err instanceof TornApiError)) return err.message;
  const messages = {
    1:  'Key not provided.',
    2:  'Incorrect API key.',
    5:  'Too many requests — slow down.',
    6:  'Access level too low for this selection.',
    13: 'Selection is not valid.',
  };
  return messages[err.code] ?? `API error ${err.code}: ${err.message}`;
}
