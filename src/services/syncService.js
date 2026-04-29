import NetInfo from '@react-native-community/netinfo';
import {getPendingVisits, markVisitUploaded} from './storage';
import {pushSiteVisit} from './api';

let unsubscribe = null;

export function startSyncWatcher() {
  if (unsubscribe) return;
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

export async function syncPending() {
  const visits = await getPendingVisits();
  for (const v of visits) {
    try {
      await pushSiteVisit(v);
      await markVisitUploaded(v.localId);
    } catch (e) {
      console.warn('Failed to upload visit', v.localId, e.message);
    }
  }
}
