import AsyncStorage from '@react-native-async-storage/async-storage';
import {reportServiceError} from './errorReporting';

const PENDING_KEY = 'PENDING_PROPERTY_SEAL_VISITS';
const SUBMITTED_KEY = 'SUBMITTED_PROPERTY_SEAL_VISITS';
const LEGACY_PROPERTY_SEAL_KEY = 'PROPERTY_SEAL_VISITS';
const LEGACY_CEILING_KEY = 'CEILING_INVESTIGATION_VISITS';

export type PropertySealVisitKind = 'seal' | 'deseal';

export interface PropertySealVisitBase {
  localId: string;
  kind: PropertySealVisitKind;
  officerId: number | string;
  officerName: string;
  authToken?: string;
  scheme: string;
  phase: string;
  block: string;
  plot: string;
  activityValue: string;
  activityLabel: string;
  finalRemarks: string;
  photoUris: string[];
  lat: number | null;
  lng: number | null;
  /** Horizontal accuracy in meters when captured. */
  accuracyMeters?: number | null;
  savedAt: string;
}

export interface PropertySealPendingVisit extends PropertySealVisitBase {
  retryCount: number;
  nextRetryAt: number;
  paused: boolean;
  lastError: string;
}

export interface PropertySealSubmittedVisit extends PropertySealVisitBase {
  uploadedAt: string;
  serverMessage?: string;
}

export type PropertySealPendingPatch = Partial<
  Pick<PropertySealPendingVisit, 'retryCount' | 'nextRetryAt' | 'paused' | 'lastError'>
>;

function normalizePending(
  visit: PropertySealVisitBase & Partial<PropertySealPendingPatch>,
): PropertySealPendingVisit {
  return {
    ...visit,
    kind: visit.kind === 'deseal' ? 'deseal' : 'seal',
    retryCount: Number.isFinite(visit.retryCount) ? visit.retryCount! : 0,
    nextRetryAt: Number.isFinite(visit.nextRetryAt) ? visit.nextRetryAt! : 0,
    paused: Boolean(visit.paused),
    lastError: visit.lastError || '',
  };
}

async function readJsonArray(key: string): Promise<unknown[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return [];
  }
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

/** Migrate older local-only lists into the pending queue once. */
async function migrateLegacyIntoPending(): Promise<void> {
  const existing = await readJsonArray(PENDING_KEY);
  if (existing.length > 0) {
    return;
  }
  const submitted = await readJsonArray(SUBMITTED_KEY);
  if (submitted.length > 0) {
    return;
  }

  let legacy = await readJsonArray(LEGACY_PROPERTY_SEAL_KEY);
  if (legacy.length === 0) {
    legacy = await readJsonArray(LEGACY_CEILING_KEY);
  }
  if (legacy.length === 0) {
    return;
  }

  const pending = legacy.map((item: any) =>
    normalizePending({
      localId: String(item.localId || `ps-${Date.now()}`),
      kind: item.kind === 'deseal' ? 'deseal' : 'seal',
      officerId: item.officerId,
      officerName: item.officerName || '',
      scheme: item.scheme || '',
      phase: item.phase || '',
      block: item.block || '',
      plot: item.plot || '',
      activityValue: String(item.activityValue || ''),
      activityLabel: item.activityLabel || '',
      finalRemarks: item.finalRemarks || '',
      photoUris: Array.isArray(item.photoUris) ? item.photoUris : [],
      lat: item.lat ?? null,
      lng: item.lng ?? null,
      savedAt: item.savedAt || new Date().toISOString(),
    }),
  );
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export async function addPendingPropertySealVisit(visit: PropertySealVisitBase): Promise<void> {
  await migrateLegacyIntoPending();
  const current = await getPendingPropertySealVisits();
  current.unshift(
    normalizePending({
      ...visit,
      retryCount: 0,
      nextRetryAt: 0,
      paused: false,
      lastError: '',
    }),
  );
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(current));
}

/** @deprecated Prefer addPendingPropertySealVisit */
export async function addPropertySealVisit(visit: PropertySealVisitBase): Promise<void> {
  await addPendingPropertySealVisit(visit);
}

export async function getPendingPropertySealVisits(): Promise<PropertySealPendingVisit[]> {
  try {
    await migrateLegacyIntoPending();
    const rows = await readJsonArray(PENDING_KEY);
    return rows.map(item => normalizePending(item as PropertySealVisitBase & Partial<PropertySealPendingPatch>));
  } catch (e) {
    reportServiceError('propertySealStorage.getPendingPropertySealVisits', e);
    return [];
  }
}

/** All local Property Seal records (pending + submitted), newest first. */
export async function getPropertySealVisits(): Promise<PropertySealVisitBase[]> {
  const [pending, submitted] = await Promise.all([
    getPendingPropertySealVisits(),
    getSubmittedPropertySealVisits(),
  ]);
  return [...pending, ...submitted].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

export async function updatePendingPropertySealVisit(
  localId: string,
  patch: PropertySealPendingPatch,
): Promise<void> {
  const visits = await getPendingPropertySealVisits();
  const updated = visits.map(v => (v.localId === localId ? normalizePending({...v, ...patch}) : v));
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(updated));
}

export async function markPropertySealVisitUploaded(localId: string): Promise<void> {
  const visits = await getPendingPropertySealVisits();
  const remaining = visits.filter(v => v.localId !== localId);
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
}

export async function resetAllPendingPropertySealRetries(): Promise<void> {
  const visits = await getPendingPropertySealVisits();
  const updated = visits.map(v =>
    normalizePending({
      ...v,
      retryCount: 0,
      nextRetryAt: 0,
      paused: false,
      lastError: '',
    }),
  );
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(updated));
}

export async function addSubmittedPropertySealVisit(
  visit: PropertySealVisitBase,
  extras?: {serverMessage?: string},
): Promise<void> {
  const current = await getSubmittedPropertySealVisits();
  current.unshift({
    ...visit,
    kind: visit.kind === 'deseal' ? 'deseal' : 'seal',
    uploadedAt: new Date().toISOString(),
    serverMessage: extras?.serverMessage,
  });
  await AsyncStorage.setItem(SUBMITTED_KEY, JSON.stringify(current));
}

export async function getSubmittedPropertySealVisits(): Promise<PropertySealSubmittedVisit[]> {
  try {
    const rows = await readJsonArray(SUBMITTED_KEY);
    return rows as PropertySealSubmittedVisit[];
  } catch (e) {
    reportServiceError('propertySealStorage.getSubmittedPropertySealVisits', e);
    return [];
  }
}
