import {Linking, PermissionsAndroid, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

const FINE = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
const COARSE = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

const locationPrompt = {
  title: 'Location access',
  message: 'Site visit surveys need your GPS coordinates. Allow location while using the app.',
  buttonPositive: 'Allow',
  buttonNegative: 'Deny',
};

export async function hasLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return false;
  }
  if (Platform.OS !== 'android') {
    return true;
  }
  return (await PermissionsAndroid.check(FINE)) || (await PermissionsAndroid.check(COARSE));
}

/** Shows the system permission dialog only — do not call GPS in the same tick. */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }

  if (Platform.OS !== 'android') {
    return true;
  }

  if (await hasLocationPermission()) {
    return true;
  }

  const result = await PermissionsAndroid.request(FINE, locationPrompt);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function ensureLocationPermission(): Promise<boolean> {
  if (await hasLocationPermission()) {
    return true;
  }
  return requestLocationPermission();
}

export function openAppSettings(): void {
  void Linking.openSettings();
}

interface GeolocationError {
  code?: number;
  message?: string;
}

export function describeGpsError(error: GeolocationError): string {
  switch (error.code) {
    case 1:
      return 'Location permission denied. Allow location for this app, then retry.';
    case 2:
      return 'GPS signal unavailable. Move to an open area and retry.';
    case 3:
      return 'Location timed out. Ensure GPS is on and retry.';
    case 4:
      return 'Google Play services is missing or outdated. Update it and retry.';
    case 5:
      return 'Device location is off. Enable location (High accuracy) in phone settings, then retry.';
    default:
      return error.message || 'Could not read GPS location.';
  }
}

export function isPermissionDeniedError(error: GeolocationError): boolean {
  return error.code === 1;
}
