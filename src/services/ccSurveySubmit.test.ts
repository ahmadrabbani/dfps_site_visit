import {buildForwardCcSurveyFields, formatForwardCcSurveyPreview} from './ccSurveySubmit';
import type {PendingVisitBase} from './storage';

const baseVisit: PendingVisitBase = {
  localId: 'local-1',
  siteId: 1,
  caseId: '2140892',
  caseNumber: 'CC2505202613466',
  officerId: 'junaid.tp3',
  visitByName: 'junaid.tp3',
  authToken: 'token',
  startTime: '2026-01-01T00:00:00.000Z',
  endTime: '2026-01-01T00:05:00.000Z',
  startLat: 31.52,
  startLon: 74.35,
  scope: 'commercial',
  isViolation: true,
  noOfFloors: 3,
  remarks: 'Site position note',
  violations: [
    {
      violationTypeId: 30,
      typeLabel: 'Change of Side Commercial',
      floorLabel: 'B2',
      unit: 'sqft',
      width: 10,
      length: 12,
      notes: 'Observed',
    },
  ],
};

describe('buildForwardCcSurveyFields', () => {
  it('maps visit to forward_cc_survey.php POST fields', () => {
    expect(buildForwardCcSurveyFields(baseVisit)).toMatchObject({
      case_id: '2140892',
      is_violation: '1',
      visit_by: 'junaid.tp3',
      visit_by_name: 'junaid.tp3',
      plot_category: 'Commercial',
      no_of_floors: '3',
      lat: '31.52',
      lng: '74.35',
    });
    expect(buildForwardCcSurveyFields(baseVisit).remarks).toContain('Site position note');
    expect(buildForwardCcSurveyFields(baseVisit).remarks).toContain('Change of Side Commercial');
  });

  it('maps no-violation visit', () => {
    expect(
      buildForwardCcSurveyFields({
        ...baseVisit,
        isViolation: false,
        violations: [],
        remarks: 'All clear',
      }),
    ).toMatchObject({
      case_id: '2140892',
      is_violation: '0',
      remarks: 'All clear',
    });
  });
});

describe('formatForwardCcSurveyPreview', () => {
  it('lists all API fields for display', () => {
    const lines = formatForwardCcSurveyPreview(baseVisit);
    expect(lines.some(l => l.startsWith('case_id:'))).toBe(true);
    expect(lines.some(l => l.startsWith('plot_category: Commercial'))).toBe(true);
  });
});
