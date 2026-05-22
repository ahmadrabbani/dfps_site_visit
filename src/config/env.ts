import Config from 'react-native-config';

/** Raw value from env (may be empty). */
export const API_BASE_URL_RAW = Config.API_BASE_URL ?? '';

/** Survey CC violation list endpoint (no query string). */
export const VIOLATION_LIST_URL_RAW = Config.VIOLATION_LIST_URL ?? '';

/** CC survey submit endpoint (forward_cc_survey.php). */
export const CC_SURVEY_URL_RAW = Config.CC_SURVEY_URL ?? '';

/** cc_application_list.php (no query string). */
export const CC_APPLICATION_LIST_URL_RAW = Config.CC_APPLICATION_LIST_URL ?? '';

/** Legacy tbllogin script (full URL to login handler PHP). */
export const LOGIN_URL_RAW = Config.LOGIN_URL ?? '';

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

const DEFAULT_VIOLATION_LIST_URL =
  'http://103.8.115.199:91/test/survey/cc/cc_violation_list.php';

/**
 * Base URL for cc_violation_list.php (no trailing slash, no query).
 * Falls back to the survey server when VIOLATION_LIST_URL is unset.
 */
export function getViolationListUrl(): string {
  const trimmed = (VIOLATION_LIST_URL_RAW || '').trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  return DEFAULT_VIOLATION_LIST_URL;
}

const DEFAULT_CC_SURVEY_URL =
  'http://103.8.115.199:91/test/survey/cc/forward_cc_survey.php';

/** URL for forward_cc_survey.php (no trailing slash). */
export function getCcSurveyUrl(): string {
  const trimmed = (CC_SURVEY_URL_RAW || '').trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  return DEFAULT_CC_SURVEY_URL;
}

/**
 * Housing portal CC survey save (conf_add_cc_form.php).
 * Same handler as the web portal form — saves cc_visit, uploads images, forwards to forward_cc_survey.php.
 */
export function getCcPortalSubmitUrl(): string {
  const loginUrl = getLoginUrl();
  const base = loginUrl.replace(/\/login\.php$/i, '');
  return `${base}/conf_add_cc_form.php`;
}

const DEFAULT_CC_APPLICATION_LIST_URL =
  'http://103.8.115.199:91/test/survey/cc/cc_application_list.php';

/** URL for cc_application_list.php (no trailing slash). */
export function getCcApplicationListUrl(): string {
  const trimmed = (CC_APPLICATION_LIST_URL_RAW || '').trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  return DEFAULT_CC_APPLICATION_LIST_URL;
}

const DEFAULT_LOGIN_URL =
  'http://103.8.115.199:91/housingSurveyCommercial/login.php';

/**
 * Housing portal login (`housingportal/login.php`).
 * POST: username, password (plain). Server double-base64-encodes password.
 * Success: ["1","Success!","Login Successfully","success","index_admin.php?..."]
 * Optional mobile extras (if you add in PHP): [5]=log_id, [6]=log_name
 */
export function getLoginUrl(): string {
  const trimmed = (LOGIN_URL_RAW || '').trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  return DEFAULT_LOGIN_URL;
}

/**
 * Fake API disabled — always uses live endpoints.
 * To re-enable mock mode, uncomment below and set USE_FAKE_API=true in `.env`.
 */
export const USE_FAKE_API = false;

// export const USE_FAKE_API =
//   typeof __DEV__ !== 'undefined' &&
//   __DEV__ &&
//   String(Config.USE_FAKE_API ?? '').toLowerCase().trim() === 'true';
