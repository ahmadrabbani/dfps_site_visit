import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addPendingVisit,
  clearPendingVisits,
  getPendingVisits,
  markVisitUploaded,
  type PendingVisitBase,
} from './storage';

function makeVisit(id: string): PendingVisitBase {
  return {
    localId: id,
    siteId: 1,
    officerId: 10,
    authToken: 'token',
    startTime: '2026-01-01T00:00:00.000Z',
    endTime: '2026-01-01T00:05:00.000Z',
    scope: 'residential',
    startLat: 31.5,
    startLon: 74.3,
    violations: [],
  };
}

describe('storage pending visits', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('adds a pending visit with default retry metadata', async () => {
    await addPendingVisit(makeVisit('v-1'));

    const visits = await getPendingVisits();
    expect(visits).toHaveLength(1);
    expect(visits[0].localId).toBe('v-1');
    expect(visits[0].retryCount).toBe(0);
    expect(visits[0].nextRetryAt).toBe(0);
    expect(visits[0].paused).toBe(false);
    expect(visits[0].lastError).toBe('');
  });

  test('marks uploaded visit by removing only that localId', async () => {
    await addPendingVisit(makeVisit('v-1'));
    await addPendingVisit(makeVisit('v-2'));

    await markVisitUploaded('v-1');
    const visits = await getPendingVisits();
    expect(visits).toHaveLength(1);
    expect(visits[0].localId).toBe('v-2');
  });

  test('clears all pending visits', async () => {
    await addPendingVisit(makeVisit('v-1'));
    await addPendingVisit(makeVisit('v-2'));

    await clearPendingVisits();
    const visits = await getPendingVisits();
    expect(visits).toEqual([]);
  });
});
