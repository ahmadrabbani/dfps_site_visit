import type {PendingVisitBase, SiteVisitViolation} from './storage';

export type PortalCcSubmitJson = [string, string, string, ...string[]];

function scopeToPlotCategory(scope?: string): 'Commercial' | 'Residential' {
  return scope?.toLowerCase() === 'commercial' ? 'Commercial' : 'Residential';
}

function isViolationVisit(visit: PendingVisitBase): boolean {
  return visit.isViolation === true || (visit.isViolation !== false && visit.violations.length > 0);
}

/** Text fields for housingportal/conf_add_cc_form.php (same as web PerformSurvey form). */
export function buildPortalCcSurveyTextFields(visit: PendingVisitBase): Record<string, string> {
  const isViolation = isViolationVisit(visit);
  const fields: Record<string, string> = {
    caseId: String(visit.caseId ?? visit.siteId ?? ''),
    case_number: visit.caseNumber || String(visit.caseId ?? ''),
    plot_category: scopeToPlotCategory(visit.scope),
    is_violation: isViolation ? '1' : '0',
    no_of_floors: visit.noOfFloors != null && visit.noOfFloors !== '' ? String(visit.noOfFloors) : '',
    user_lat: String(visit.startLat),
    user_lng: String(visit.startLon),
  };

  if (isViolation) {
    fields.site_position = visit.remarks || '';
  } else {
    fields.no_violation_remarks = visit.remarks || '';
  }

  return fields;
}

type RNFormFile = {uri: string; type: string; name: string};

function imageFilePart(uri: string, name: string): RNFormFile {
  return {
    uri,
    type: 'image/jpeg',
    name,
  };
}

/** Multipart body matching housingportal add_completion_certificate_survey.php submit. */
export function buildPortalCcSurveyFormData(visit: PendingVisitBase): FormData {
  const formData = new FormData();
  const textFields = buildPortalCcSurveyTextFields(visit);

  Object.entries(textFields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  if (visit.mainImageUri) {
    formData.append('imgInp', imageFilePart(visit.mainImageUri, `main_${Date.now()}.jpg`));
  }

  if (isViolationVisit(visit)) {
    visit.violations.forEach((v: SiteVisitViolation, index: number) => {
      formData.append('violation_type_id[]', String(v.violationTypeId ?? ''));
      formData.append('width[]', v.width != null ? String(v.width) : '');
      formData.append('length[]', v.length != null ? String(v.length) : '');
      formData.append('floor[]', v.floorLabel || '');
      formData.append('unit[]', v.unit || 'sqft');
      formData.append('remarks[]', v.notes || '');
      if (v.photoUri) {
        formData.append('violation_img[]', imageFilePart(v.photoUri, `violation_${index}_${Date.now()}.jpg`));
      }
    });
  }

  return formData;
}

/** Parses conf_add_cc_form.php JSON array response. */
export function parsePortalCcSubmitResponse(payload: unknown): {
  ok: boolean;
  serverMessage: string;
} {
  if (!Array.isArray(payload) || payload.length < 3) {
    throw new Error('Submit failed: unexpected server response');
  }

  const status = String(payload[0] ?? '');
  const message = String(payload[2] ?? payload[1] ?? 'Submit failed');

  if (status !== '1') {
    throw new Error(message);
  }

  return {ok: true, serverMessage: message};
}

export function extractSessionCookie(headers: {get(name: string): string | null}): string | null {
  const raw = headers.get('set-cookie');
  if (!raw) {
    return null;
  }
  const match = raw.match(/PHPSESSID=([^;,\s]+)/i);
  return match ? `PHPSESSID=${match[1]}` : null;
}
