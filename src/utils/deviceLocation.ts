import {AppState, InteractionManager, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {hasAndroidLocationPermission} from './locationPermission';
import {
  describeGpsError,
  isLocationSettingsError,
  isPermissionDeniedError,
} from './locationPermission';
import {gpsDebugLog} from './gpsDebugLog';

export interface DeviceCoords {
  lat: number;
  lng: number;
  /** Horizontal accuracy in meters when the platform provides it. */
  accuracy: number | null;
}

interface GeolocationError {
  code?: number;
  message?: string;
}

export type AcquireDeviceCoordsOptions = {
  /** Reject fixes with worse (larger) accuracy than this many meters. */
  maxAccuracyMeters?: number;
  /**
   * Prefer Fused Location (no LocationManager / system location UI).
   * Use for flows where leaving the app on Get location is unacceptable.
   */
  stayInApp?: boolean;
  debugTag?: string;
};

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
          const {latitude, longitude, accuracy} = position.coords;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            reject(new Error('Invalid GPS coordinates'));
            return;
          }
          resolve({
            lat: latitude,
            lng: longitude,
            accuracy: Number.isFinite(accuracy) ? accuracy : null,
          });
        },
        error => reject(error),
        options,
      );
    } catch (error) {
      reject(error);
    }
  });
}

export class GpsAccuracyError extends Error {
  accuracy: number;
  maxAccuracyMeters: number;
  lat: number;
  lng: number;

  constructor(accuracy: number, maxAccuracyMeters: number, lat: number, lng: number) {
    super(
      `GPS accuracy is ${Math.round(accuracy)} m. Move outdoors until accuracy is ${maxAccuracyMeters} m or better.`,
    );
    this.name = 'GpsAccuracyError';
    this.accuracy = accuracy;
    this.maxAccuracyMeters = maxAccuracyMeters;
    this.lat = lat;
    this.lng = lng;
  }
}

/**
 * Fetches GPS after permission is already granted. Does not request permission.
 */
export async function acquireDeviceCoords(
  options: AcquireDeviceCoordsOptions = {},
): Promise<DeviceCoords> {
  const tag = options.debugTag || 'GPS';
  gpsDebugLog(tag, 'acquireDeviceCoords start', {
    stayInApp: options.stayInApp === true,
    maxAccuracyMeters: options.maxAccuracyMeters ?? null,
    appState: AppState.currentState,
  });

  if (Platform.OS === 'android' && !(await hasAndroidLocationPermission())) {
    gpsDebugLog(tag, 'permission missing before fetch');
    throw new Error('Location permission denied. Tap Get location below or enable it in app Settings.');
  }

  await waitForAppActive();
  gpsDebugLog(tag, 'app active, waiting interactions');
  await runAfterInteractions();
  if (Platform.OS === 'android') {
    await delay(500);
  } else {
    await delay(200);
  }

  const attempts: PositionOptions[] =
    Platform.OS === 'android'
      ? options.stayInApp
        ? options.maxAccuracyMeters != null
          ? [
              {
                enableHighAccuracy: true,
                timeout: 25000,
                maximumAge: 5000,
                showLocationDialog: false,
                forceRequestLocation: true,
                forceLocationManager: false,
              },
              {
                enableHighAccuracy: true,
                timeout: 25000,
                maximumAge: 0,
                showLocationDialog: false,
                forceRequestLocation: true,
                forceLocationManager: false,
              },
              {
                enableHighAccuracy: true,
                timeout: 25000,
                maximumAge: 0,
                showLocationDialog: false,
                forceRequestLocation: true,
                forceLocationManager: false,
              },
            ]
          : [
              {
                enableHighAccuracy: true,
                timeout: 45000,
                maximumAge: 5000,
                showLocationDialog: false,
                // forceRequestLocation bypasses the "settings not satisfied" check result
                // (no system dialog is shown) and requests location directly while the
                // app stays in the foreground. Required when showLocationDialog is false,
                // otherwise the fused provider fails fast with SETTINGS_NOT_SATISFIED.
                forceRequestLocation: true,
                forceLocationManager: false,
              },
              {
                enableHighAccuracy: false,
                timeout: 30000,
                maximumAge: 10000,
                showLocationDialog: false,
                forceRequestLocation: true,
                forceLocationManager: false,
              },
            ]
        : [
            {
              enableHighAccuracy: true,
              timeout: 60000,
              maximumAge: 0,
              showLocationDialog: false,
              forceRequestLocation: false,
              forceLocationManager: true,
            },
            {
              enableHighAccuracy: true,
              timeout: 60000,
              maximumAge: 15000,
              showLocationDialog: false,
              forceRequestLocation: false,
              forceLocationManager: false,
            },
          ]
      : [
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 15000,
            showLocationDialog: false,
            forceRequestLocation: false,
          },
        ];

  let lastError: GeolocationError | Error | null = null;
  let bestCoords: DeviceCoords | null = null;

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i];
    try {
      gpsDebugLog(tag, `getCurrentPosition attempt ${i + 1}/${attempts.length}`, {
        enableHighAccuracy: attempt?.enableHighAccuracy,
        forceLocationManager: (attempt as {forceLocationManager?: boolean})?.forceLocationManager,
        showLocationDialog: (attempt as {showLocationDialog?: boolean})?.showLocationDialog,
      });
      const coords = await getCurrentPositionOnce(attempt);
      gpsDebugLog(tag, 'coords received', {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
      });
      if (
        options.maxAccuracyMeters != null &&
        coords.accuracy != null &&
        coords.accuracy > options.maxAccuracyMeters
      ) {
        if (!bestCoords || (coords.accuracy < (bestCoords.accuracy ?? Infinity))) {
          bestCoords = coords;
        }
        gpsDebugLog(tag, 'accuracy rejected on attempt', {
          accuracy: coords.accuracy,
          max: options.maxAccuracyMeters,
          attempt: i + 1,
          total: attempts.length,
        });
        if (i < attempts.length - 1) {
          // Delay to give the GPS hardware / satellite lock time to refine accuracy <= 50m
          await delay(1500);
          continue;
        }
        throw new GpsAccuracyError(
          bestCoords.accuracy ?? coords.accuracy,
          options.maxAccuracyMeters,
          bestCoords.lat,
          bestCoords.lng,
        );
      }
      gpsDebugLog(tag, 'acquireDeviceCoords success');
      return coords;
    } catch (error) {
      lastError = error as GeolocationError | Error;
      if (error instanceof GpsAccuracyError) {
        throw error;
      }
      gpsDebugLog(tag, `attempt ${i + 1} failed`, {
        message: (error as Error)?.message,
        code: (error as GeolocationError)?.code,
      });
      await delay(300);
    }
  }

  if (
    bestCoords &&
    options.maxAccuracyMeters != null &&
    bestCoords.accuracy != null &&
    bestCoords.accuracy > options.maxAccuracyMeters
  ) {
    throw new GpsAccuracyError(
      bestCoords.accuracy,
      options.maxAccuracyMeters,
      bestCoords.lat,
      bestCoords.lng,
    );
  }

  gpsDebugLog(tag, 'acquireDeviceCoords failed all attempts');

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
