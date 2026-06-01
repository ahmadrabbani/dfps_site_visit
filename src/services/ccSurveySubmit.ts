import type {PendingVisitBase, SiteVisitViolation} from './storage';

export type ForwardCcSurveyFields = {
  case_id: string;
  is_violation: string;
  visit_by: string;
  visit_by_name: string;
  remarks: string;
  lat: string;
  lng: string;
  no_of_floors: string;
  plot_category: string;
  main_image: string;
};

function scopeToPlotCategory(scope?: string): 'Commercial' | 'Residential' {
  return scope?.toLowerCase() === 'commercial' ? 'Commercial' : 'Residential';
}

export function isViolationVisit(visit: PendingVisitBase): boolean {
  return visit.isViolation === true || (visit.isViolation !== false && visit.violations.length > 0);
}

function buildSurveyRemarks(visit: PendingVisitBase): string {
  if (!isViolationVisit(visit)) {
    return visit.remarks?.trim() || '';
  }
  const lines: string[] = [];
  if (visit.remarks?.trim()) {
    lines.push(visit.remarks.trim());
  }
  visit.violations.forEach((v: SiteVisitViolation, index: number) => {
    const parts = [
      `V${index + 1}: ${v.typeLabel || 'Violation'}`,
      v.floorLabel ? `floor ${v.floorLabel}` : '',
      v.width != null && v.length != null ? `${v.width}x${v.length} ${v.unit || 'sqft'}` : '',
      v.notes?.trim() || '',
    ].filter(Boolean);
    lines.push(parts.join(' '));
  });
  return lines.join(' | ');
}

/**
 * POST body for forward_cc_survey.php (Basit survey API).
 * @see http://103.8.115.199:91/test/survey/cc/forward_cc_survey.php
 */
export function buildForwardCcSurveyFields(visit: PendingVisitBase): ForwardCcSurveyFields {
  const isViolation = isViolationVisit(visit);
  return {
    case_id: String(visit.caseId ?? visit.siteId ?? ''),
    is_violation: isViolation ? '1' : '0',
    visit_by: String(visit.officerId ?? ''),
    visit_by_name: visit.visitByName?.trim() || '',
    remarks: buildSurveyRemarks(visit),
    lat: String(visit.startLat),
    lng: String(visit.startLon),
    no_of_floors:
      visit.noOfFloors != null && visit.noOfFloors !== '' ? String(visit.noOfFloors) : '',
    plot_category: scopeToPlotCategory(visit.scope),
    main_image: visit.mainImageUri ? '(image file attached)' : '',
  };
}

type RNFormFile = {uri: string; type: string; name: string};

function imageFilePart(uri: string, name: string): RNFormFile {
  return {uri, type: 'image/jpeg', name};
}

/** Multipart POST matching forward_cc_survey.php field names. */
export function buildForwardCcSurveyFormData(visit: PendingVisitBase): FormData {
  const formData = new FormData();
  const fields = buildForwardCcSurveyFields(visit);

  formData.append('case_id', fields.case_id);
  formData.append('is_violation', fields.is_violation);
  formData.append('visit_by', fields.visit_by);
  formData.append('visit_by_name', fields.visit_by_name);
  formData.append('remarks', fields.remarks);
  formData.append('lat', fields.lat);
  formData.append('lng', fields.lng);
  formData.append('no_of_floors', fields.no_of_floors);
  formData.append('plot_category', fields.plot_category);

  if (visit.mainImageUri) {
    formData.append('main_image', imageFilePart(visit.mainImageUri, `main_${Date.now()}.jpg`));
  } else {
    formData.append('main_image', '');
  }

  return formData;
}

/** Human-readable lines for My Submissions / summary screens. */
export function formatForwardCcSurveyPreview(visit: PendingVisitBase): string[] {
  const fields = buildForwardCcSurveyFields(visit);
  return [
    `case_id: ${fields.case_id}`,
    `is_violation: ${fields.is_violation}`,
    `visit_by: ${fields.visit_by}`,
    `visit_by_name: ${fields.visit_by_name}`,
    `plot_category: ${fields.plot_category}`,
    `no_of_floors: ${fields.no_of_floors}`,
    `lat: ${fields.lat}`,
    `lng: ${fields.lng}`,
    `remarks: ${fields.remarks || '(empty)'}`,
    `main_image: ${fields.main_image || '(none)'}`,
  ];
}
