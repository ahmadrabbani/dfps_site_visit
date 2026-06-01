import { Linking, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

const FINE = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
const COARSE = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

const locationPrompt = {
  title: 'Location access',
  message:
    'Site Visit surveys need your GPS coordinates. Allow location while using the app.',
  buttonPositive: 'Allow',
  buttonNegative: 'Deny',
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Android: true if precise or approximate (coarse) location is allowed. */
export async function hasAndroidLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  return (
    (await PermissionsAndroid.check(FINE)) ||
    (await PermissionsAndroid.check(COARSE))
  );
}

export async function hasLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return hasAndroidLocationPermission();
  }
  if (Platform.OS === 'ios') {
    return false;
  }
  return true;
}

/** Wait for permission to register (no dialog). */
export async function waitForAndroidLocationPermission(
  maxWaitMs = 4000,
  intervalMs = 250,
): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return hasLocationPermission();
  }
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await hasAndroidLocationPermission()) {
      return true;
    }
    await delay(intervalMs);
  }
  return hasAndroidLocationPermission();
}

/**
 * Android 12+: one dialog; user may pick Approximate (coarse only).
 * Only call when the user explicitly taps Allow — never on screen mount.
 */
export async function requestAndroidLocationPermission(): Promise<boolean> {
  if (await hasAndroidLocationPermission()) {
    return true;
  }

  await PermissionsAndroid.request(FINE, locationPrompt);
  return waitForAndroidLocationPermission(3500);
}

/** After Dashboard Allow: wait only — never opens a second permission dialog. */
export async function syncAndroidLocationAfterGrant(): Promise<boolean> {
  return waitForAndroidLocationPermission(4500);
}

/** Shows the system permission dialog only — do not call GPS in the same tick. */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return requestAndroidLocationPermission();
  }

  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }

  return true;
}

export async function ensureLocationPermission(): Promise<boolean> {
  if (await hasLocationPermission()) {
    return true;
  }
  const granted = await requestLocationPermission();
  if (Platform.OS === 'android' && granted) {
    return waitForAndroidLocationPermission(3500);
  }
  return granted;
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
      return 'Location permission denied. Tap Get location below or enable it in app Settings.';
    case 2:
      return 'GPS signal unavailable. Move outdoors or near a window, then tap Retry GPS.';
    case 3:
      return 'Location timed out. Turn on GPS (High accuracy) and tap Retry GPS.';
    case 4:
      return 'Google Play services is missing or outdated. Update it and retry.';
    case 5:
      return 'Phone location is turned off. Enable Location in quick settings, then tap Retry GPS.';
    default:
      return error.message || 'Could not read GPS location. Tap Retry GPS.';
  }
}

export function isPermissionDeniedError(error: GeolocationError): boolean {
  return error.code === 1;
}

export function isLocationSettingsError(error: GeolocationError): boolean {
  return error.code === 5;
}
