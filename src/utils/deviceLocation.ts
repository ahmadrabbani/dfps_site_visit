import {AppState, InteractionManager, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {describeGpsError, isPermissionDeniedError} from './locationPermission';

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
 * Fetches GPS after permission is already granted.
 * Waits for the app to be active and retries with safer native options (avoids post-permission crashes).
 */
export async function acquireDeviceCoords(): Promise<DeviceCoords> {
  await waitForAppActive();
  await runAfterInteractions();
  if (Platform.OS === 'android') {
    await delay(900);
  } else {
    await delay(200);
  }

  const attempts: PositionOptions[] =
    Platform.OS === 'android'
      ? [
          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 300000,
            showLocationDialog: false,
            forceRequestLocation: false,
            forceLocationManager: true,
          },
          {
            enableHighAccuracy: true,
            timeout: 30000,
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
      await delay(400);
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
  return /permission/i.test(message);
}
