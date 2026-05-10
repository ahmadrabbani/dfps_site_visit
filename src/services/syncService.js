import {Alert, Platform, ToastAndroid} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {getPendingVisits, markVisitUploaded} from './storage';
import {pushSiteVisit} from './api';

let unsubscribe = null;

function notifySyncSuccess(count) {
  const msg =
    count === 1
      ? 'Your site visit was received by the server.'
      : `${count} site visits were received by the server.`;
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.LONG);
  } else {
    Alert.alert('Sync complete', msg);
  }
}

function notifySyncPartial(successCount, failCount) {
  Alert.alert(
    'Sync finished',
    `${successCount} visit(s) received by the server.\n${failCount} could not be sent and will retry when you are online.`,
  );
}

function notifySyncAllFailed(failCount) {
  Alert.alert(
    'Upload not completed',
    `${failCount} visit(s) could not be sent. They stay on this device and will retry automatically.`,
  );
}

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
  if (!visits.length) {
    return {uploaded: 0, failed: 0};
  }

  let uploaded = 0;
  let failed = 0;

  for (const v of visits) {
    try {
      await pushSiteVisit(v);
      await markVisitUploaded(v.localId);
      uploaded += 1;
    } catch (e) {
      failed += 1;
      console.warn('Failed to upload visit', v.localId, e.message);
    }
  }

  if (uploaded > 0 && failed === 0) {
    notifySyncSuccess(uploaded);
  } else if (uploaded > 0 && failed > 0) {
    notifySyncPartial(uploaded, failed);
  } else if (uploaded === 0 && failed > 0) {
    notifySyncAllFailed(failed);
  }

  return {uploaded, failed};
}
