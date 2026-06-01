import {
  BYPASS_LOGIN,
  getBypassLoginUsername,
  getCcApplicationListUrl,
  getLoginUrl,
  getViolationListUrl,
} from '../config/env';
import {getPortalSessionCookie} from './authService';
import {buildForwardCcSurveyFormData} from './ccSurveySubmit';
import {extractSessionCookie, parsePortalCcSubmitResponse} from './portalCcSurvey';
import {generateSurveyApiKey} from './surveyApiKey';
import type {PendingVisitBase} from './storage';

// --- Fake API (disabled for live testing) ---
// const FAKE_USER = {
//   id: 999,
//   name: 'Demo Officer',
//   token: 'dev-fake-token',
// };

export interface SessionUser {
  id: number | string;
  /** Login username — used for cc_application_list.php ?u= base64 param. */
  username: string;
  name: string;
  token: string;
  /** PHP session cookie for conf_add_cc_form.php (portal submit). */
  portalCookie?: string | null;
  /** Dev bypass — no portal session; submit will fail until real login. */
  isBypassLogin?: boolean;
  /** Dev test sign-in (junaid.tp3 + any password) — no portal cookie; session is saved locally. */
  isDevTestLogin?: boolean;
}

/** Dev session for testing CC forms against real list/violation APIs without portal login. */
export function matchesDevTestLogin(username: string): boolean {
  if (!BYPASS_LOGIN) {
    return false;
  }
  const expected = getBypassLoginUsername().trim().toLowerCase();
  return username.trim().toLowerCase() === expected;
}

/** Test login for BYPASS_LOGIN_USERNAME — any password, no network. */
export function createDevTestLoginUser(username: string): SessionUser {
  const trimmed = username.trim();
  return {
    id: trimmed,
    username: trimmed,
    name: trimmed,
    token: `dev-${trimmed}`,
    portalCookie: null,
    isDevTestLogin: true,
  };
}

export function createBypassLoginUser(username: string): SessionUser {
  const trimmed = username.trim() || 'junaid.tp3';
  return {
    id: 'bypass',
    username: trimmed,
    name: `${trimmed} (login bypass)`,
    token: 'bypass',
    portalCookie: null,
    isBypassLogin: true,
  };
}

export interface PenaltyCategory {
  id: number;
  name: string;
  isFixedAmount: boolean;
  penaltyRate?: string | number;
  tokenFee?: string | number | null;
}

export interface PenaltyType {
  id: number;
  name: string;
  categories: PenaltyCategory[];
}

export interface CcCaseItem {
  id: string;
  owc: string;
  plot_category?: string;
  category?: string;
}

interface CcViolationListItem {
  vid: string;
  vtype: string;
}

export function scopeToSurveyCategory(scope: string): 'Commercial' | 'Residential' {
  return scope.toLowerCase() === 'commercial' ? 'Commercial' : 'Residential';
}

function scopeToViolationCategory(scope: string): 'Commercial' | 'Residential' {
  return scopeToSurveyCategory(scope);
}

function filterCasesForScope(items: CcCaseItem[], scope: string): CcCaseItem[] {
  const want = scopeToSurveyCategory(scope).toLowerCase();
  return items.filter(item => {
    const raw = String(item.plot_category ?? item.category ?? '').trim().toLowerCase();
    if (!raw) {
      return true;
    }
    return raw.includes(want);
  });
}

/** Maps cc_violation_list.php rows into the shape used by ViolationFormScreen. */
export function mapCcViolationList(items: CcViolationListItem[]): PenaltyType[] {
  return items
    .filter(item => item?.vid && item?.vtype)
    .map(item => {
      const id = parseInt(String(item.vid), 10);
      return {
        id: Number.isNaN(id) ? 0 : id,
        name: String(item.vtype).trim(),
        categories: [
          {
            id: Number.isNaN(id) ? 0 : id,
            name: 'General',
            isFixedAmount: true,
          },
        ],
      };
    })
    .filter(item => item.id > 0 && item.name.length > 0);
}

// /** Shape expected by `ViolationFormScreen` */
// function getFakePenaltyTypes(scope: string): PenaltyType[] {
//   const isCommercial = scope === 'commercial';
//   return [
//     {
//       id: 1,
//       name: isCommercial ? 'Demo commercial violation' : 'Demo residential violation',
//       categories: [
//         {id: 101, name: 'Ground floor', isFixedAmount: true},
//         {id: 102, name: 'Upper floor', isFixedAmount: false},
//       ],
//     },
//     {
//       id: 2,
//       name: 'Second demo type',
//       categories: [{id: 201, name: 'Category A', isFixedAmount: false}],
//     },
//   ];
// }

/** Legacy login JSON: ["1","Success!","Login Successfully","success","index_admin.php?..."] */
export type LegacyLoginJson = [string, string, string, string, ...string[]];

/** Parses housingportal/login.php JSON array into app session user. */
export function parseLegacyLoginResponse(payload: unknown, username: string): SessionUser {
  if (!Array.isArray(payload) || payload.length < 4) {
    throw new Error('Login failed: unexpected server response');
  }

  const status = String(payload[0] ?? '');
  const message = String(payload[2] ?? payload[1] ?? 'Login failed');

  if (status !== '1') {
    throw new Error(message);
  }

  const trimmedUsername = username.trim();
  const logIdRaw = payload[5];
  const logNameRaw = payload[6];
  const id =
    logIdRaw != null && String(logIdRaw).trim() !== ''
      ? logIdRaw
      : /^\d+$/.test(trimmedUsername)
        ? parseInt(trimmedUsername, 10)
        : trimmedUsername;
  const name =
    logNameRaw != null && String(logNameRaw).trim() !== '' ? String(logNameRaw) : trimmedUsername;

  return {
    id,
    username: trimmedUsername,
    name,
    token: String(id),
  };
}

export async function login(username: string, password: string): Promise<SessionUser> {
  const trimmed = username.trim();
  if (matchesDevTestLogin(trimmed)) {
    return createDevTestLoginUser(trimmed);
  }

  const url = getLoginUrl();
  const body = new URLSearchParams({
    username: trimmed,
    password,
  }).toString();

  if (__DEV__) {
    console.log('[login] POST', url);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body,
    });
  } catch {
    throw new Error(
      'Cannot reach the login server. Check Wi‑Fi or mobile data. For testing, sign in as junaid.tp3 with any password.',
    );
  }

  const text = await res.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Login failed: ${text || 'Invalid response'}`);
  }

  const user = parseLegacyLoginResponse(payload, username);
  const cookie = extractSessionCookie(res.headers);
  if (cookie) {
    user.portalCookie = cookie;
  }
  return user;
}

function encodeUserParam(name: string): string {
  const value = name.trim();
  if (!value) {
    return '';
  }
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(unescape(encodeURIComponent(value)));
  }
  return value;
}

interface SurveyApiErrorPayload {
  IS_ERR?: string | number;
  ERR?: string;
  error?: string;
}

function buildSurveyListUrl(
  baseUrl: string,
  params: Record<string, string>,
  options: {withHourlyKey?: boolean} = {},
): string {
  const queryParams: Record<string, string> = {...params};
  if (options.withHourlyKey) {
    try {
      queryParams.key = generateSurveyApiKey();
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(`Survey API key error: ${detail}`);
    }
  }
  return `${baseUrl}?${new URLSearchParams(queryParams).toString()}`;
}

async function fetchSurveyJson(url: string, label: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {Accept: 'application/json'},
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`${label}: ${detail}`);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${label}: HTTP ${res.status} ${text}`.trim());
  }
  return res.json() as Promise<unknown>;
}

async function fetchSurveyListWithKeyFallback(
  baseUrl: string,
  params: Record<string, string>,
  label: string,
): Promise<unknown> {
  const plainUrl = buildSurveyListUrl(baseUrl, params, {withHourlyKey: false});
  let payload = await fetchSurveyJson(plainUrl, label);
  const listError = parseSurveyListError(payload);
  if (listError === 'Invalid Access') {
    const signedUrl = buildSurveyListUrl(baseUrl, params, {withHourlyKey: true});
    payload = await fetchSurveyJson(signedUrl, label);
  }
  return payload;
}

function parseSurveyListError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const row = payload as SurveyApiErrorPayload;
  if (String(row.IS_ERR ?? '') === '1') {
    return row.ERR || 'Invalid Access';
  }
  if (typeof row.error === 'string' && row.error.trim()) {
    return row.error;
  }
  return null;
}

/**
 * Loads cases (cc_application_list.php).
 * Same as browser: ?u=base64(username) — no hourly key unless server returns Invalid Access.
 */
export async function fetchCaseList(
  officerName: string,
  scope: string = 'residential',
): Promise<CcCaseItem[]> {
  const baseUrl = getCcApplicationListUrl();
  const userParam = encodeUserParam(officerName);
  if (!userParam) {
    throw new Error('Officer username is required to load cases.');
  }

  const payload = (await fetchSurveyListWithKeyFallback(
    baseUrl,
    {u: userParam},
    'Case list',
  )) as CcCaseItem[] | SurveyApiErrorPayload;

  const listError = parseSurveyListError(payload);
  if (listError) {
    throw new Error(listError);
  }
  if (!Array.isArray(payload)) {
    throw new Error('Failed to load cases');
  }
  const rows = payload.filter(item => item?.id && item?.owc);
  const filtered = filterCasesForScope(rows, scope);
  return filtered.length > 0 ? filtered : rows;
}

export async function fetchViolationTypes(scope = 'residential'): Promise<PenaltyType[]> {
  // if (USE_FAKE_API) {
  //   await new Promise<void>(resolve => setTimeout(resolve, 220));
  //   return getFakePenaltyTypes(scope);
  // }

  const baseUrl = getViolationListUrl();
  const category = scopeToViolationCategory(scope);
  const payload = (await fetchSurveyListWithKeyFallback(
    baseUrl,
    {category},
    'Violation list',
  )) as CcViolationListItem[] | {data?: CcViolationListItem[]} | SurveyApiErrorPayload;
  const listError = parseSurveyListError(payload);
  if (listError) {
    throw new Error(listError);
  }
  const items = Array.isArray(payload) ? payload : 'data' in payload && Array.isArray(payload.data) ? payload.data : [];
  return mapCcViolationList(items);
}

export async function pushSiteVisit(visit: PendingVisitBase): Promise<{serverMessage?: string}> {
  const url = getCcSurveyUrl();
  const formData = buildForwardCcSurveyFormData(visit);
  const cookie = await getPortalSessionCookie();

  if (__DEV__) {
    console.log('[pushSiteVisit] POST', url);
  }

  const headers: Record<string, string> = {};
  if (cookie) {
    headers.Cookie = cookie;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Cannot reach survey API: ${detail}`);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${text || 'Server error'}`);
  }

  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Upload failed: ${text || 'Invalid response'}`);
  }

  return parsePortalCcSubmitResponse(payload);
}
