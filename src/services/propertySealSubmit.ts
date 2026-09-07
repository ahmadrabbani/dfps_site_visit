import {getPropertySealSurveyUrl} from '../config/env';
import type {PropertySealVisitBase} from './propertySealStorage';

type RNFormFile = {uri: string; type: string; name: string};

function imageFilePart(uri: string, name: string): RNFormFile {
  return {
    uri,
    type: 'image/jpeg',
    name,
  };
}

function parsePortalArrayResponse(text: string): {ok: boolean; message: string} {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length >= 3) {
      const status = String(parsed[0]);
      const message = String(parsed[2] || parsed[1] || '');
      // Common portal shapes: ["0","success",msg] or ["1","err",msg]
      const ok = status === '0' || String(parsed[1]).toLowerCase() === 'success';
      return {ok, message};
    }
  } catch {
    // fall through
  }
  if (/success/i.test(text) && !/err/i.test(text)) {
    return {ok: true, message: text.slice(0, 200)};
  }
  return {ok: false, message: text.slice(0, 240) || 'Upload failed'};
}

/** Multipart body for Property Seal / Deseal (portal-style fields). */
export function buildPropertySealFormData(visit: PropertySealVisitBase): FormData {
  const form = new FormData();
  form.append('kind', visit.kind);
  form.append('scheme_id', visit.scheme || '');
  form.append('phase_id', visit.phase || '');
  form.append('block_id', visit.block || '');
  form.append('plot_no', visit.plot || '');
  form.append('action_type', visit.activityValue || '');
  form.append('action_label', visit.activityLabel || '');
  form.append('site_position', visit.finalRemarks || '');
  form.append('reason_desealing', visit.kind === 'deseal' ? visit.finalRemarks || '' : '');
  form.append('user_lat', visit.lat != null ? String(visit.lat) : '');
  form.append('user_lng', visit.lng != null ? String(visit.lng) : '');
  form.append('property_lat', visit.lat != null ? String(visit.lat) : '');
  form.append('property_lng', visit.lng != null ? String(visit.lng) : '');
  form.append('officer_id', String(visit.officerId ?? ''));
  form.append('officer_name', visit.officerName || '');

  visit.photoUris.forEach((uri, index) => {
    if (!uri) {
      return;
    }
    const field = index === 0 ? 'imgInp' : `imgInp${index}`;
    form.append(field, imageFilePart(uri, `property_seal_${index + 1}.jpg`) as unknown as Blob);
  });

  return form;
}

export async function pushPropertySealVisit(
  visit: PropertySealVisitBase,
): Promise<{serverMessage?: string}> {
  const url = getPropertySealSurveyUrl();
  if (!url) {
    throw new Error(
      'Property Seal server URL is not configured yet. Visit stays on this device until PROPERTY_SEAL_SURVEY_URL is set.',
    );
  }

  const res = await fetch(url, {
    method: 'POST',
    body: buildPropertySealFormData(visit),
    headers: visit.authToken ? {Authorization: `Bearer ${visit.authToken}`} : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Property Seal upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const parsed = parsePortalArrayResponse(text);
  if (!parsed.ok) {
    throw new Error(parsed.message || 'Property Seal upload rejected by server');
  }
  return {serverMessage: parsed.message};
}
