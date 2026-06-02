import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'app_tour_completed:';

function tourKey(username: string): string {
  return `${KEY_PREFIX}${username.trim().toLowerCase()}`;
}

export async function hasCompletedAppTour(username: string): Promise<boolean> {
  if (!username.trim()) {
    return true;
  }
  const value = await AsyncStorage.getItem(tourKey(username));
  return value === '1';
}

export async function setAppTourCompleted(username: string): Promise<void> {
  if (!username.trim()) {
    return;
  }
  await AsyncStorage.setItem(tourKey(username), '1');
}

export async function clearAppTourCompleted(username: string): Promise<void> {
  if (!username.trim()) {
    return;
  }
  await AsyncStorage.removeItem(tourKey(username));
}
