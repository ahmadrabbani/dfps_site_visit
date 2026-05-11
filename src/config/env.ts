import Config from 'react-native-config';

/** Raw value from env (may be empty). */
export const API_BASE_URL_RAW = Config.API_BASE_URL ?? '';

/**
 * Base URL for the PHP app (no trailing slash), e.g.
 * `https://example.com/dfps-site/public/index.php`
 */
export function getApiBaseUrl(): string {
  const trimmed = (API_BASE_URL_RAW || '').trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  throw new Error('API_BASE_URL is not set. Add API_BASE_URL in .env and rebuild the app.');
}

/**
 * Dev-only mock API (no network). Enable in `.env`:
 *   USE_FAKE_API=true
 * Rebuild native app after changing `.env` (Android).
 */
export const USE_FAKE_API =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  String(Config.USE_FAKE_API ?? '').toLowerCase().trim() === 'true';
