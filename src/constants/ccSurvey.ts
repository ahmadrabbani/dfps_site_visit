/** Matches housingportal CC survey unit dropdown. */
export const CC_UNITS = [
  {label: 'Sq. Ft', value: 'sqft'},
  {label: 'Sq. m', value: 'sqm'},
] as const;

/** Floor options used in housingportal dynamic grid. */
export const CC_FLOOR_OPTIONS = [
  'B2',
  'B1',
  'GF',
  'FF',
  '1F',
  '2F',
  '3F',
  '4F',
  '5F',
  '6F',
  '7F',
  '8F',
  '9F',
  '10F',
] as const;

export const CC_MAX_FLOORS = 50;
