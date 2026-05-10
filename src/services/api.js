import {getApiBaseUrl, USE_FAKE_API} from '../config/env';

const FAKE_USER = {
  id: 999,
  name: 'Demo Officer',
  token: 'dev-fake-token',
};

/** Shape expected by `ViolationFormScreen`: id, name, categories[{ id, name, isFixedAmount }] */
function getFakePenaltyTypes(scope) {
  const isCommercial = scope === 'commercial';
  return [
    {
      id: 1,
      name: isCommercial ? 'Demo commercial violation' : 'Demo residential violation',
      categories: [
        {id: 101, name: 'Ground floor', isFixedAmount: true},
        {id: 102, name: 'Upper floor', isFixedAmount: false},
      ],
    },
    {
      id: 2,
      name: 'Second demo type',
      categories: [{id: 201, name: 'Category A', isFixedAmount: false}],
    },
  ];
}

export async function login(username, password) {
  if (USE_FAKE_API) {
    if (__DEV__) {
      console.log('[login] USE_FAKE_API: skipping network (username length:', String(username || '').length, ')');
    }
    await new Promise(r => setTimeout(r, 320));
    return {...FAKE_USER};
  }

  const BASE_URL = getApiBaseUrl();
  const url = BASE_URL + '?route=auth/login';
  const body = JSON.stringify({username, password});
  if (__DEV__) {
    console.log('[login] POST', url);
  } else if (typeof global !== 'undefined') {
    global.lastLoginRequest = {url};
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  });

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error('Login failed: ' + text);
  }

  if (!res.ok) {
    const message = payload?.message ? String(payload.message) : text || 'Unknown error';
    throw new Error('Login failed: ' + message);
  }

  const data = payload?.data || {};
  if (!data.user || !data.token) {
    throw new Error('Login failed: malformed response');
  }

  return {...data.user, token: data.token};
}

export async function fetchViolationTypes(scope = 'residential') {
  if (USE_FAKE_API) {
    await new Promise(r => setTimeout(r, 220));
    return getFakePenaltyTypes(scope);
  }

  const BASE_URL = getApiBaseUrl();
  const url = `${BASE_URL}?route=penalties/index&scope=${encodeURIComponent(scope)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Failed to load penalties: ' + text);
  }
  const payload = await res.json();
  return payload.data || [];
}

export async function pushSiteVisit(visit) {
  if (USE_FAKE_API) {
    await new Promise(r => setTimeout(r, 260));
    return {ok: true, fake: true, localId: visit.localId};
  }

  const BASE_URL = getApiBaseUrl();
  const payload = {
    authToken: visit.authToken || 'demo-token',
    siteVisit: {
      siteId: visit.siteId,
      officerId: visit.officerId,
      startTime: visit.startTime,
      endTime: visit.endTime,
      scope: visit.scope || 'residential',
      startCoordinates: {
        lat: visit.startLat,
        lon: visit.startLon,
      },
      violations: visit.violations.map(v => ({
        type: v.typeLabel || v.type,
        violationTypeId: v.violationTypeId || null,
        violationCategoryId: v.violationCategoryId || null,
        categoryLabel: v.categoryLabel || null,
        floorLabel: v.floorLabel || null,
        length: v.length,
        width: v.width,
        area: v.area,
        notes: v.notes,
        photo: v.photoBase64 || null,
      })),
    },
  };

  const res = await fetch(BASE_URL + '?route=sitevisit/store', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Upload failed: ' + text);
  }

  return res.json();
}
