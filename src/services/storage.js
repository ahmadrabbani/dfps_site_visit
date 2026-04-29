import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_VISITS_KEY = 'PENDING_SITE_VISITS';

export async function addPendingVisit(visit) {
  const current = await getPendingVisits();
  current.push(visit);
  await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(current));
}

export async function getPendingVisits() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_VISITS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load pending visits', e);
    return [];
  }
}

export async function clearPendingVisits() {
  await AsyncStorage.removeItem(PENDING_VISITS_KEY);
}

export async function markVisitUploaded(localId) {
  const visits = await getPendingVisits();
  const remaining = visits.filter(v => v.localId !== localId);
  await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(remaining));
}
