import {toTitleCase} from './titleCase';

describe('toTitleCase', () => {
  it('capitalizes main words', () => {
    expect(toTitleCase('Application case')).toBe('Application Case');
    expect(toTitleCase('Plot category')).toBe('Plot Category');
  });

  it('keeps connectors lowercase in the middle', () => {
    expect(toTitleCase('Violation on site')).toBe('Violation on Site');
    expect(toTitleCase('Number of floors')).toBe('Number of Floors');
  });

  it('handles em dash phrases', () => {
    expect(toTitleCase('Yes — violation')).toBe('Yes — Violation');
  });
});
