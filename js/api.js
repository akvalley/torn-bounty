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
  return raw.map(b => ({
    id:          b.target_id   ?? 0,
    name:        b.target_name ?? 'Unknown',
    level:       b.target_level ?? 0,
    reward:      b.reward      ?? 0,
    quantity:    b.quantity    ?? 1,
    reason:      b.reason      ?? '',
    listerName:  b.is_anonymous ? null : (b.lister_name ?? null),
    validUntil:  b.valid_until  ?? 0,
  }));
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
