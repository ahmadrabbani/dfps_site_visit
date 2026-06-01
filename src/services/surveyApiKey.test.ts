import {CC_FLOOR_OPTIONS, CC_VIOLATION_REMARKS_MAX} from '../constants/ccSurvey';
import {formatKarachiHour, generateSurveyApiKey} from './surveyApiKey';

describe('formatKarachiHour', () => {
  it('uses Asia/Karachi timezone for hourly key payload', () => {
    const date = new Date('2026-05-22T15:30:00.000Z');
    expect(formatKarachiHour(date)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}$/);
  });
});

describe('generateSurveyApiKey', () => {
  it('returns base64 key matching portal shape', () => {
    const key = generateSurveyApiKey(new Date('2026-05-22T15:30:00.000Z'), 'my_ultra_secret_passphrase');
    expect(key.length).toBeGreaterThan(20);
    expect(key).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe('ccSurvey constants', () => {
  it('includes B2/B1/GF and 1F-30F floor options', () => {
    expect(CC_FLOOR_OPTIONS.slice(0, 3)).toEqual(['B2', 'B1', 'GF']);
    expect(CC_FLOOR_OPTIONS).toContain('30F');
    expect(CC_FLOOR_OPTIONS).toHaveLength(33);
  });

  it('matches portal violation remarks limit', () => {
    expect(CC_VIOLATION_REMARKS_MAX).toBe(50);
  });
});
