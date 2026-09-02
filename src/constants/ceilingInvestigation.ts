/**
 * Enforcement activity options from housing portal `tbl_survey.action_type`
 * (`SurveyTypeAttachment` / `getActionHtml` in housingportal).
 */
export const CEILING_ACTIVITIES = [
  {value: '1', label: 'FIR'},
  {value: '2', label: 'Demolition'},
  {value: '3', label: 'Letters for services disconnection'},
  {value: '4', label: 'Sealed / demolished'},
  {value: '5', label: 'De-sealing'},
  {value: '6', label: 'Stay order from civil court'},
  {value: '7', label: 'Stay order from high court'},
  {value: '8', label: 'LDA response to stay / present status'},
  {value: '9', label: 'Notice 40 (I)'},
  {value: '10', label: 'Notice 40 (II)'},
] as const;

export type CeilingActivityValue = (typeof CEILING_ACTIVITIES)[number]['value'];

export const PROPERTY_SEAL_TITLE = 'Property Seal';

export const CEILING_MAX_PHOTOS = 8;
