import {AppState, InteractionManager, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {hasAndroidLocationPermission} from './locationPermission';
import {
  describeGpsError,
  isLocationSettingsError,
  isPermissionDeniedError,
} from './locationPermission';

export interface DeviceCoords {
  lat: number;
  lng: number;
}

interface GeolocationError {
  code?: number;
  message?: string;
}

type PositionOptions = Parameters<typeof Geolocation.getCurrentPosition>[2];

function waitForAppActive(): Promise<void> {
  if (AppState.currentState === 'active') {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        subscription.remove();
        resolve();
      }
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runAfterInteractions(): Promise<void> {
  return new Promise(resolve => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

function getCurrentPositionOnce(options: PositionOptions): Promise<DeviceCoords> {
  return new Promise((resolve, reject) => {
    try {
      Geolocation.getCurrentPosition(
        position => {
          const {latitude, longitude} = position.coords;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            reject(new Error('Invalid GPS coordinates'));
            return;
          }
          resolve({lat: latitude, lng: longitude});
        },
        error => reject(error),
        options,
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Fetches GPS after permission is already granted. Does not request permission.
 */
export async function acquireDeviceCoords(): Promise<DeviceCoords> {
  if (Platform.OS === 'android' && !(await hasAndroidLocationPermission())) {
    throw new Error('Location permission denied. Tap Get location below or enable it in app Settings.');
  }

  await waitForAppActive();
  await runAfterInteractions();
  if (Platform.OS === 'android') {
    await delay(500);
  } else {
    await delay(200);
  }

  const attempts: PositionOptions[] =
    Platform.OS === 'android'
      ? [
          {
            enableHighAccuracy: false,
            timeout: 60000,
            maximumAge: 120000,
            showLocationDialog: false,
            forceRequestLocation: false,
            forceLocationManager: true,
          },
          {
            enableHighAccuracy: false,
            timeout: 60000,
            maximumAge: 60000,
            showLocationDialog: false,
            forceRequestLocation: false,
            forceLocationManager: false,
          },
        ]
      : [
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 60000,
            showLocationDialog: false,
            forceRequestLocation: false,
          },
        ];

  let lastError: GeolocationError | Error | null = null;
  for (const options of attempts) {
    try {
      return await getCurrentPositionOnce(options);
    } catch (error) {
      lastError = error as GeolocationError | Error;
      await delay(300);
    }
  }

  if (lastError && typeof lastError === 'object' && 'code' in lastError) {
    const geo = lastError as GeolocationError;
    throw new Error(describeGpsError(geo));
  }
  throw new Error(
    lastError instanceof Error ? lastError.message : 'Could not read GPS location.',
  );
}

export function isGpsPermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as GeolocationError).code;
  if (code != null) {
    return isPermissionDeniedError({code});
  }
  const message = String((error as Error).message || '');
  return /permission/i.test(message) && !/timed out/i.test(message);
}

export function isGpsSettingsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as GeolocationError).code;
  if (code != null) {
    return isLocationSettingsError({code});
  }
  const message = String((error as Error).message || '');
  return /location is off|location service|settings/i.test(message);
}
