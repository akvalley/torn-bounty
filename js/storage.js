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
