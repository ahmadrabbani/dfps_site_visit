import NetInfo from '@react-native-community/netinfo';
import {notifyError, notifySuccess, notifyWarning} from '../utils/notify';
import {
  getPendingVisits,
  markVisitUploaded,
  resetAllPendingVisitRetries,
  updatePendingVisit,
  addSubmittedVisit,
} from './storage';
import {pushSiteVisit} from './api';
import {
  addSubmittedPropertySealVisit,
  getPendingPropertySealVisits,
  markPropertySealVisitUploaded,
  resetAllPendingPropertySealRetries,
  updatePendingPropertySealVisit,
} from './propertySealStorage';
import {pushPropertySealVisit} from './propertySealSubmit';
import {reportServiceError} from './errorReporting';
import {invalidateVisitCaches} from '../queries/invalidateVisitCaches';
import {appQueryClient} from '../queries/queryClient';

let unsubscribe: (() => void) | null = null;
const MAX_RETRIES = 6;
const BASE_RETRY_DELAY_MS = 60 * 1000;
const MAX_RETRY_DELAY_MS = 30 * 60 * 1000;

function notifySyncSuccess(count: number) {
  const msg =
    count === 1
      ? 'Your visit was received by the server.'
      : `${count} visits were received by the server.`;
  notifySuccess(msg);
}

function notifySyncPartial(successCount: number, failCount: number) {
  notifyWarning(
    `${successCount} visit(s) received. ${failCount} could not be sent and will retry when online.`,
  );
}

function notifySyncAllFailed(failCount: number) {
  notifyError(
    `${failCount} visit(s) could not be sent. They remain on this device and will retry automatically.`,
  );
}

function computeRetryDelayMs(retryCount: number) {
  return Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, Math.max(0, retryCount - 1)), MAX_RETRY_DELAY_MS);
}

function isPermanentSyncError(error: unknown) {
  const msg = String((error as {message?: string})?.message || '');
  return /\b(400|401|403|404|409|410|422)\b/.test(msg) || /not configured/i.test(msg);
}

export function startSyncWatcher() {
  if (unsubscribe) {
    return;
  }
  unsubscribe = NetInfo.addEventListener(async state => {
    const online = !!state.isConnected;
    if (online) {
      await syncPending();
    }
  });
}

export function stopSyncWatcher() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export interface SyncPendingResult {
  uploaded: number;
  failed: number;
  deferred: number;
  paused: number;
}

export interface SyncPendingOptions {
  /** Skip success/partial/fail toasts (e.g. submit mutation shows its own). */
  skipNotifications?: boolean;
}

function emptyResult(): SyncPendingResult {
  return {uploaded: 0, failed: 0, deferred: 0, paused: 0};
}

function mergeResults(a: SyncPendingResult, b: SyncPendingResult): SyncPendingResult {
  return {
    uploaded: a.uploaded + b.uploaded,
    failed: a.failed + b.failed,
    deferred: a.deferred + b.deferred,
    paused: a.paused + b.paused,
  };
}

async function syncPendingSiteVisits(): Promise<SyncPendingResult> {
  const visits = await getPendingVisits();
  if (!visits.length) {
    return emptyResult();
  }

  let uploaded = 0;
  let failed = 0;
  let deferred = 0;
  let paused = 0;
  const now = Date.now();

  for (const v of visits) {
    if (v.paused) {
      paused += 1;
      continue;
    }
    if (v.nextRetryAt && v.nextRetryAt > now) {
      deferred += 1;
      continue;
    }

    try {
      const result = (await pushSiteVisit(v)) as {serverMessage?: string};
      await addSubmittedVisit(v, {serverMessage: result.serverMessage});
      await markVisitUploaded(v.localId);
      uploaded += 1;
    } catch (e) {
      failed += 1;
      reportServiceError('syncService.syncPending.upload', e, {localId: v.localId});
      const permanent = isPermanentSyncError(e);
      const nextRetryCount = (v.retryCount || 0) + 1;
      const shouldPause = permanent || nextRetryCount >= MAX_RETRIES;
      const nextRetryAt = shouldPause ? 0 : now + computeRetryDelayMs(nextRetryCount);

      await updatePendingVisit(v.localId, {
        retryCount: nextRetryCount,
        nextRetryAt,
        paused: shouldPause,
        lastError: String((e as {message?: string})?.message || 'Upload failed'),
      });
    }
  }

  return {uploaded, failed, deferred, paused};
}

async function syncPendingPropertySealVisits(): Promise<SyncPendingResult> {
  const visits = await getPendingPropertySealVisits();
  if (!visits.length) {
    return emptyResult();
  }

  let uploaded = 0;
  let failed = 0;
  let deferred = 0;
  let paused = 0;
  const now = Date.now();

  for (const v of visits) {
    if (v.paused) {
      paused += 1;
      continue;
    }
    if (v.nextRetryAt && v.nextRetryAt > now) {
      deferred += 1;
      continue;
    }

    try {
      const result = await pushPropertySealVisit(v);
      await addSubmittedPropertySealVisit(v, {serverMessage: result.serverMessage});
      await markPropertySealVisitUploaded(v.localId);
      uploaded += 1;
    } catch (e) {
      failed += 1;
      reportServiceError('syncService.syncPending.propertySeal', e, {localId: v.localId});
      const permanent = isPermanentSyncError(e);
      const nextRetryCount = (v.retryCount || 0) + 1;
      const shouldPause = permanent || nextRetryCount >= MAX_RETRIES;
      const nextRetryAt = shouldPause ? 0 : now + computeRetryDelayMs(nextRetryCount);

      await updatePendingPropertySealVisit(v.localId, {
        retryCount: nextRetryCount,
        nextRetryAt,
        paused: shouldPause,
        lastError: String((e as {message?: string})?.message || 'Upload failed'),
      });
    }
  }

  return {uploaded, failed, deferred, paused};
}

export async function syncPending(options?: SyncPendingOptions): Promise<SyncPendingResult> {
  const site = await syncPendingSiteVisits();
  const seal = await syncPendingPropertySealVisits();
  const result = mergeResults(site, seal);

  if (!options?.skipNotifications) {
    if (result.uploaded > 0 && result.failed === 0) {
      notifySyncSuccess(result.uploaded);
    } else if (result.uploaded > 0 && result.failed > 0) {
      notifySyncPartial(result.uploaded, result.failed);
    } else if (result.uploaded === 0 && result.failed > 0) {
      notifySyncAllFailed(result.failed);
    }
  }

  if (result.uploaded > 0 || result.failed > 0) {
    invalidateVisitCaches(appQueryClient, {serverPushSucceeded: result.uploaded > 0});
  }

  return result;
}

export async function retryFailedNow(): Promise<SyncPendingResult> {
  await Promise.all([resetAllPendingVisitRetries(), resetAllPendingPropertySealRetries()]);
  return syncPending();
}

/** Push one saved CC site visit immediately (e.g. from My Submissions). */
export async function syncVisitById(localId: string): Promise<SyncPendingResult> {
  const visits = await getPendingVisits();
  const visit = visits.find(v => v.localId === localId);
  if (!visit) {
    return emptyResult();
  }

  if (visit.paused) {
    await updatePendingVisit(localId, {paused: false, retryCount: 0, nextRetryAt: 0, lastError: ''});
  }

  const now = Date.now();
  try {
    const result = await pushSiteVisit(visit);
    await addSubmittedVisit(visit, {serverMessage: result.serverMessage});
    await markVisitUploaded(localId);
    notifySyncSuccess(1);
    invalidateVisitCaches(appQueryClient, {serverPushSucceeded: true});
    return {uploaded: 1, failed: 0, deferred: 0, paused: 0};
  } catch (e) {
    reportServiceError('syncService.syncVisitById', e, {localId});
    const permanent = isPermanentSyncError(e);
    const nextRetryCount = (visit.retryCount || 0) + 1;
    const shouldPause = permanent || nextRetryCount >= MAX_RETRIES;
    await updatePendingVisit(localId, {
      retryCount: nextRetryCount,
      nextRetryAt: shouldPause ? 0 : now + computeRetryDelayMs(nextRetryCount),
      paused: shouldPause,
      lastError: String((e as {message?: string})?.message || 'Upload failed'),
    });
    notifySyncAllFailed(1);
    invalidateVisitCaches(appQueryClient, {serverPushSucceeded: false});
    return {uploaded: 0, failed: 1, deferred: 0, paused: shouldPause ? 1 : 0};
  }
}

/** Push one Property Seal / Deseal visit immediately. */
export async function syncPropertySealVisitById(localId: string): Promise<SyncPendingResult> {
  const visits = await getPendingPropertySealVisits();
  const visit = visits.find(v => v.localId === localId);
  if (!visit) {
    return emptyResult();
  }

  if (visit.paused) {
    await updatePendingPropertySealVisit(localId, {
      paused: false,
      retryCount: 0,
      nextRetryAt: 0,
      lastError: '',
    });
  }

  const now = Date.now();
  try {
    const result = await pushPropertySealVisit(visit);
    await addSubmittedPropertySealVisit(visit, {serverMessage: result.serverMessage});
    await markPropertySealVisitUploaded(localId);
    notifySyncSuccess(1);
    invalidateVisitCaches(appQueryClient, {serverPushSucceeded: true});
    return {uploaded: 1, failed: 0, deferred: 0, paused: 0};
  } catch (e) {
    reportServiceError('syncService.syncPropertySealVisitById', e, {localId});
    const permanent = isPermanentSyncError(e);
    const nextRetryCount = (visit.retryCount || 0) + 1;
    const shouldPause = permanent || nextRetryCount >= MAX_RETRIES;
    await updatePendingPropertySealVisit(localId, {
      retryCount: nextRetryCount,
      nextRetryAt: shouldPause ? 0 : now + computeRetryDelayMs(nextRetryCount),
      paused: shouldPause,
      lastError: String((e as {message?: string})?.message || 'Upload failed'),
    });
    notifySyncAllFailed(1);
    invalidateVisitCaches(appQueryClient, {serverPushSucceeded: false});
    return {uploaded: 0, failed: 1, deferred: 0, paused: shouldPause ? 1 : 0};
  }
}
