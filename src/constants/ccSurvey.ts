/** Matches housingportal CC survey unit dropdown. */
export const CC_UNITS = [
  {label: 'Sq. Ft', value: 'sqft'},
  {label: 'Sq. m', value: 'sqm'},
] as const;

/** Floor options — B2/B1/GF + 1F–30F (same as portal dynamic grid). */
function buildCcFloorOptions(): string[] {
  const floors = ['B2', 'B1', 'GF'];
  for (let i = 1; i <= 30; i += 1) {
    floors.push(`${i}F`);
  }
  return floors;
}

export const CC_FLOOR_OPTIONS = buildCcFloorOptions();

export const CC_MAX_FLOORS = 50;

/** Portal violation row remarks maxlength. */
export const CC_VIOLATION_REMARKS_MAX = 50;
