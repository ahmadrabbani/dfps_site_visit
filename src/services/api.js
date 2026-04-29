const BASE_URL = 'http://103.8.115.199:91/dfps-site/public/index.php';

export async function login(username, password) {
  const url = BASE_URL + '?route=auth/login';
  const body = JSON.stringify({username, password});
  if (__DEV__) {
    console.log('[login] POST', url, body);
  } else {
    globalThis.lastLoginRequest = {url, body};
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
