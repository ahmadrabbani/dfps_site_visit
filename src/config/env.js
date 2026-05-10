import Config from 'react-native-config';

/**
 * Fallback when `.env` has no `API_BASE_URL` (same as previous hardcoded value).
 * Set `API_BASE_URL` in `.env` to your real front-controller URL when you have it.
 */
const LEGACY_DEFAULT_BASE_URL =
  'http://103.8.115.199:91/dfps-site/public/index.php';

/** Raw value from env (may be empty). */
export const API_BASE_URL_RAW = Config.API_BASE_URL ?? '';

/**
 * Base URL for the PHP app (no trailing slash), e.g.
 * `https://example.com/dfps-site/public/index.php`
 */
export function getApiBaseUrl() {
  const trimmed = (API_BASE_URL_RAW || '').trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  return LEGACY_DEFAULT_BASE_URL;
}

/**
 * Dev-only mock API (no network). Enable in `.env`:
 *   USE_FAKE_API=true
 * Rebuild native app after changing `.env` (Android).
 */
export const USE_FAKE_API =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  String(Config.USE_FAKE_API ?? '')
    .toLowerCase()
    .trim() === 'true';
