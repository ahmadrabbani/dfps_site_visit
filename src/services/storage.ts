import AsyncStorage from '@react-native-async-storage/async-storage';
import {reportServiceError} from './errorReporting';

const PENDING_VISITS_KEY = 'PENDING_SITE_VISITS';

export interface SiteVisitViolation {
  typeLabel?: string;
  type?: string;
  violationTypeId?: number | null;
  violationCategoryId?: number | null;
  categoryLabel?: string | null;
  floorLabel?: string | null;
  length?: number | null;
  width?: number | null;
  area?: number | null;
  notes?: string;
  photoBase64?: string | null;
}

export interface PendingVisitBase {
  localId: string;
  siteId: number;
  officerId: number | string;
  authToken: string;
  startTime: string;
  endTime: string;
  startLat: number;
  startLon: number;
  scope?: string;
  violations: SiteVisitViolation[];
}

export interface PendingVisit extends PendingVisitBase {
  retryCount: number;
  nextRetryAt: number;
  paused: boolean;
  lastError: string;
}

export type PendingVisitPatch = Partial<
  Pick<PendingVisit, 'retryCount' | 'nextRetryAt' | 'paused' | 'lastError'>
>;

function normalizePendingVisit(visit: PendingVisitBase & Partial<PendingVisitPatch>): PendingVisit {
  return {
    ...visit,
    retryCount: Number.isFinite(visit.retryCount) ? visit.retryCount! : 0,
    nextRetryAt: Number.isFinite(visit.nextRetryAt) ? visit.nextRetryAt! : 0,
    paused: Boolean(visit.paused),
    lastError: visit.lastError || '',
  };
}

export async function addPendingVisit(visit: PendingVisitBase): Promise<void> {
  const current = await getPendingVisits();
  current.push(
    normalizePendingVisit({
      ...visit,
      retryCount: 0,
      nextRetryAt: 0,
      paused: false,
      lastError: '',
    }),
  );
  await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(current));
}

export async function getPendingVisits(): Promise<PendingVisit[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_VISITS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item: PendingVisitBase & Partial<PendingVisitPatch>) => normalizePendingVisit(item));
  } catch (e) {
    reportServiceError('storage.getPendingVisits', e);
    return [];
  }
}

export async function clearPendingVisits(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_VISITS_KEY);
}

export async function markVisitUploaded(localId: string): Promise<void> {
  const visits = await getPendingVisits();
  const remaining = visits.filter(v => v.localId !== localId);
  await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(remaining));
}

export async function updatePendingVisit(localId: string, patch: PendingVisitPatch): Promise<void> {
  const visits = await getPendingVisits();
  const updated = visits.map(v =>
    v.localId === localId ? normalizePendingVisit({...v, ...patch}) : v,
  );
  await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(updated));
}

export async function resetAllPendingVisitRetries(): Promise<void> {
  const visits = await getPendingVisits();
  const reset = visits.map(v =>
    normalizePendingVisit({
      ...v,
      retryCount: 0,
      nextRetryAt: 0,
      paused: false,
      lastError: '',
    }),
  );
  await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(reset));
}
