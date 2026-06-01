import {Alert, InteractionManager, Platform} from 'react-native';
import {ensureLocationPermission, syncAndroidLocationAfterGrant} from './locationPermission';
import {markAndroidLocationPrepared} from './locationSession';

/**
 * Ask for location on Dashboard / drawer (before Site Visit opens).
 */
export async function prepareSiteVisitLocation(): Promise<boolean> {
  const granted = await ensureLocationPermission();
  if (!granted) {
    Alert.alert(
      'Location access needed',
      'Allow location when prompted so the site visit can record GPS coordinates. On Android you can choose Precise or Approximate.',
    );
    return false;
  }

  if (Platform.OS === 'android') {
    const synced = await syncAndroidLocationAfterGrant();
    if (!synced) {
      Alert.alert(
        'Location access needed',
        'Location permission was not detected. Tap Allow on the next prompt, or enable location for this app in Settings.',
      );
      return false;
    }
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    await new Promise<void>(resolve => {
      InteractionManager.runAfterInteractions(() => resolve());
    });
    markAndroidLocationPrepared();
  }

  return true;
}
