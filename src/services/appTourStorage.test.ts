import AsyncStorage from '@react-native-async-storage/async-storage';
import {hasCompletedAppTour, setAppTourCompleted, clearAppTourCompleted} from './appTourStorage';

describe('appTourStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('tracks completion per username', async () => {
    expect(await hasCompletedAppTour('officer.a')).toBe(false);
    await setAppTourCompleted('officer.a');
    expect(await hasCompletedAppTour('officer.a')).toBe(true);
    expect(await hasCompletedAppTour('officer.b')).toBe(false);
  });

  test('clear resets completion', async () => {
    await setAppTourCompleted('officer.a');
    await clearAppTourCompleted('officer.a');
    expect(await hasCompletedAppTour('officer.a')).toBe(false);
  });
});
