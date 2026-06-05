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

/** Shared secret for hourly survey API key (housingportal/add_completion_certificate_survey.php). */
export const CC_SURVEY_API_SECRET_RAW = Config.CC_SURVEY_API_SECRET ?? '';

/** Skip login screen and use BYPASS_LOGIN_USERNAME for CC list APIs (forms still hit real endpoints). */
export const BYPASS_LOGIN_RAW = Config.BYPASS_LOGIN ?? '';

/** Officer username for case list when BYPASS_LOGIN is true (default junaid.tp3). */
export const BYPASS_LOGIN_USERNAME_RAW = Config.BYPASS_LOGIN_USERNAME ?? '';

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

const DEFAULT_SURVEY_API_SECRET = 'my_ultra_secret_passphrase';

/** Hourly AES key secret — matches housing portal CC survey pages. */
export function getSurveyApiSecret(): string {
  const trimmed = (CC_SURVEY_API_SECRET_RAW || '').trim();
  return trimmed || DEFAULT_SURVEY_API_SECRET;
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

function envFlag(value: string): boolean {
  return String(value ?? '').toLowerCase().trim() === 'true';
}

/**
 * BYPASS_LOGIN=true — offline fallback for `BYPASS_LOGIN_USERNAME` when portal is unreachable.
 * Release builds can use bypass login if BYPASS_LOGIN is set to true in the configuration.
 */
export const BYPASS_LOGIN = envFlag(BYPASS_LOGIN_RAW);

const DEFAULT_BYPASS_USERNAME = 'junaid.tp3';

/** Username passed to cc_application_list.php when login is bypassed. */
export function getBypassLoginUsername(): string {
  const trimmed = (BYPASS_LOGIN_USERNAME_RAW || '').trim();
  return trimmed || DEFAULT_BYPASS_USERNAME;
}
