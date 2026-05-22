import {getCcApplicationListUrl, getCcPortalSubmitUrl, getLoginUrl, getViolationListUrl} from '../config/env';
import {getPortalSessionCookie} from './authService';
import {
  buildPortalCcSurveyFormData,
  extractSessionCookie,
  parsePortalCcSubmitResponse,
} from './portalCcSurvey';
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
}

interface CcViolationListItem {
  vid: string;
  vtype: string;
}

function scopeToViolationCategory(scope: string): 'Commercial' | 'Residential' {
  return scope.toLowerCase() === 'commercial' ? 'Commercial' : 'Residential';
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
  // if (USE_FAKE_API) { ... }

  const url = getLoginUrl();
  const body = new URLSearchParams({
    username: username.trim(),
    password,
  }).toString();

  if (__DEV__) {
    console.log('[login] POST', url);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });

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

/** Loads cases for CC survey (cc_application_list.php). */
export async function fetchCaseList(officerName: string): Promise<CcCaseItem[]> {
  const baseUrl = getCcApplicationListUrl();
  const userParam = encodeUserParam(officerName);
  const url = userParam
    ? `${baseUrl}?u=${encodeURIComponent(userParam)}`
    : baseUrl;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load cases: ${text}`);
  }

  const payload = (await res.json()) as CcCaseItem[] | {error?: string};
  if (!Array.isArray(payload)) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load cases');
  }
  return payload.filter(item => item?.id && item?.owc);
}

export async function fetchViolationTypes(scope = 'residential'): Promise<PenaltyType[]> {
  // if (USE_FAKE_API) {
  //   await new Promise<void>(resolve => setTimeout(resolve, 220));
  //   return getFakePenaltyTypes(scope);
  // }

  const baseUrl = getViolationListUrl();
  const category = scopeToViolationCategory(scope);
  const url = `${baseUrl}?category=${encodeURIComponent(category)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load violations: ${text}`);
  }

  const payload = (await res.json()) as CcViolationListItem[] | {data?: CcViolationListItem[]};
  const items = Array.isArray(payload) ? payload : payload.data || [];
  return mapCcViolationList(items);
}

export async function pushSiteVisit(visit: PendingVisitBase): Promise<unknown> {
  const cookie = await getPortalSessionCookie();
  if (!cookie) {
    throw new Error('Session expired. Please sign in again to submit surveys.');
  }

  const url = getCcPortalSubmitUrl();
  const formData = buildPortalCcSurveyFormData(visit);

  if (__DEV__) {
    console.log('[pushSiteVisit] POST portal', url);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {Cookie: cookie},
    body: formData,
  });

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
