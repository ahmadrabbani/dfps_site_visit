import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, InteractionManager, Platform, type AppStateStatus} from 'react-native';
import {
  acquireDeviceCoords,
  isGpsPermissionError,
  isGpsSettingsError,
  GpsAccuracyError,
} from '../utils/deviceLocation';
import {
  hasLocationPermission,
  openAppSettings,
  requestLocationPermission,
  waitForAndroidLocationPermission,
} from '../utils/locationPermission';
import {isAndroidLocationPrepared} from '../utils/locationSession';
import {gpsDebugLog} from '../utils/gpsDebugLog';

const DEFAULT_DEBUG_TAG = 'SiteVisitGPS';

export function formatCoord(value: number | null): string {
  return value != null && Number.isFinite(value) ? value.toFixed(5) : '—';
}

export function useSiteVisitGps(
  locationPrepared = false,
  options?: {
    maxAccuracyMeters?: number;
    skipPermissionRequest?: boolean;
    stayInApp?: boolean;
    /** When false, GPS stays idle until the form is ready (Property Seal). */
    enabled?: boolean;
    debugTag?: string;
  },
) {
  const [gpsAllowed, setGpsAllowed] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(Platform.OS !== 'android');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [needsPermissionPrompt, setNeedsPermissionPrompt] = useState(false);

  const mountedRef = useRef(true);
  const gpsRunIdRef = useRef(0);
  const screenFocusedRef = useRef(false);
  const awaitingReturnRef = useRef(false);
  const permissionDialogOpenRef = useRef(false);
  const locationPreparedRef = useRef(locationPrepared);
  const maxAccuracyRef = useRef(options?.maxAccuracyMeters);
  const skipPermissionRequestRef = useRef(options?.skipPermissionRequest === true);
  const stayInAppRef = useRef(options?.stayInApp === true);
  const enabledRef = useRef(options?.enabled !== false);
  const debugTagRef = useRef(options?.debugTag || DEFAULT_DEBUG_TAG);

  maxAccuracyRef.current = options?.maxAccuracyMeters;
  stayInAppRef.current = options?.stayInApp === true;
  enabledRef.current = options?.enabled !== false;
  skipPermissionRequestRef.current = options?.skipPermissionRequest === true;
  debugTagRef.current = options?.debugTag || DEFAULT_DEBUG_TAG;

  const log = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      gpsDebugLog(debugTagRef.current, message, data);
    },
    [],
  );

  const androidPostPermissionDelay = () =>
    Platform.OS === 'android'
      ? new Promise<void>(resolve => setTimeout(resolve, 600))
      : Promise.resolve();

  const applyCoords = useCallback((lat: number, lng: number, accuracy: number | null) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setCurrentAccuracy(accuracy);
    setGpsAllowed(true);
    setGpsLoading(false);
    setGpsError(null);
    setGpsPermissionDenied(false);
    setNeedsPermissionPrompt(false);
  }, []);

  const finishGpsFailure = useCallback((error: unknown) => {
    log('GPS failure', {
      message: error instanceof Error ? error.message : String(error),
    });
    setGpsAllowed(false);
    setGpsLoading(false);
    if (error instanceof GpsAccuracyError) {
      setCurrentLat(error.lat);
      setCurrentLng(error.lng);
      setCurrentAccuracy(error.accuracy);
      setGpsPermissionDenied(false);
      setNeedsPermissionPrompt(false);
      setGpsError(error.message);
      return;
    }
    setCurrentLat(null);
    setCurrentLng(null);
    setCurrentAccuracy(null);
    const permissionDenied = isGpsPermissionError(error);
    const settingsIssue = isGpsSettingsError(error);
    setGpsPermissionDenied(permissionDenied);
    setNeedsPermissionPrompt(permissionDenied);
    setGpsError(
      error instanceof Error && error.message
        ? error.message
        : permissionDenied
          ? 'Tap Get location below, then choose Allow in the system dialog.'
          : settingsIssue
            ? 'Turn on phone Location (GPS), then tap Retry GPS.'
            : 'Could not read GPS. Tap Retry GPS or move to an open area.',
    );
  }, [log]);

  const runGpsFetch = useCallback(
    async (runId: number) => {
      const isStale = () => !mountedRef.current || runId !== gpsRunIdRef.current;
      log('runGpsFetch start', {runId});
      try {
        const coords = await acquireDeviceCoords({
          maxAccuracyMeters: maxAccuracyRef.current,
          stayInApp: stayInAppRef.current,
          debugTag: debugTagRef.current,
        });
        if (isStale()) {
          return;
        }
        applyCoords(coords.lat, coords.lng, coords.accuracy);
      } catch (error) {
        if (isStale()) {
          return;
        }
        finishGpsFailure(error);
      }
    },
    [applyCoords, finishGpsFailure, log],
  );

  const refreshGps = useCallback(
    async (requestPermission: boolean) => {
      if (!enabledRef.current) {
        log('refreshGps skipped (disabled)');
        return;
      }
      const runId = ++gpsRunIdRef.current;
      const isStale = () => !mountedRef.current || runId !== gpsRunIdRef.current;

      log('refreshGps start', {
        runId,
        requestPermission,
        appState: AppState.currentState,
      });

      setGpsLoading(true);
      setGpsError(null);
      setGpsPermissionDenied(false);
      setNeedsPermissionPrompt(false);

      let permitted = await hasLocationPermission();
      log('permission check', {permitted});

      if (
        !permitted &&
        Platform.OS === 'android' &&
        (locationPreparedRef.current || isAndroidLocationPrepared())
      ) {
        permitted = await waitForAndroidLocationPermission(4500);
      }

      if (!permitted && requestPermission && !skipPermissionRequestRef.current) {
        log('requesting permission dialog');
        permissionDialogOpenRef.current = true;
        try {
          permitted = await requestLocationPermission();
          log('permission dialog result', {permitted});
          if (permitted && Platform.OS === 'android') {
            permitted = await waitForAndroidLocationPermission(3500);
          }
        } finally {
          permissionDialogOpenRef.current = false;
        }
      }

      if (isStale()) {
        setGpsLoading(false);
        return;
      }

      if (!permitted) {
        setGpsAllowed(false);
        setGpsLoading(false);
        setNeedsPermissionPrompt(true);
        setGpsPermissionDenied(true);
        setGpsError(
          Platform.OS === 'android'
            ? 'Tap Get location below, then choose Allow in the system dialog.'
            : 'Tap Allow location below, then choose Allow in the system dialog.',
        );
        return;
      }

      if (Platform.OS === 'android') {
        await androidPostPermissionDelay();
        await new Promise<void>(resolve => {
          InteractionManager.runAfterInteractions(() => resolve());
        });
      }

      if (isStale()) {
        setGpsLoading(false);
        return;
      }

      await runGpsFetch(runId);
    },
    [runGpsFetch, log],
  );

  const handleOpenLocationSettings = useCallback(() => {
    if (stayInAppRef.current) {
      void refreshGps(false);
      return;
    }
    if (skipPermissionRequestRef.current) {
      void refreshGps(false);
      return;
    }
    awaitingReturnRef.current = true;
    openAppSettings();
  }, [refreshGps]);

  useEffect(() => {
    locationPreparedRef.current = locationPrepared;
  }, [locationPrepared]);

  useEffect(() => {
    maxAccuracyRef.current = options?.maxAccuracyMeters;
  }, [options?.maxAccuracyMeters]);

  useEffect(() => {
    skipPermissionRequestRef.current = options?.skipPermissionRequest === true;
  }, [options?.skipPermissionRequest]);

  useEffect(() => {
    stayInAppRef.current = options?.stayInApp === true;
  }, [options?.stayInApp]);

  useEffect(() => {
    enabledRef.current = options?.enabled !== false;
    log('enabled changed', {enabled: enabledRef.current});
  }, [options?.enabled, log]);

  useEffect(() => {
    debugTagRef.current = options?.debugTag || DEFAULT_DEBUG_TAG;
  }, [options?.debugTag]);

  const startLocationFlow = useCallback(
    (requestPermission: boolean) => {
      void refreshGps(requestPermission);
    },
    [refreshGps],
  );

  const handleGetLocation = useCallback(async () => {
    log('handleGetLocation tap', {enabled: enabledRef.current, appState: AppState.currentState});
    if (!enabledRef.current) {
      log('handleGetLocation blocked — GPS disabled');
      return;
    }
    try {
      let permitted = await hasLocationPermission();
      if (
        !permitted &&
        Platform.OS === 'android' &&
        (locationPreparedRef.current || isAndroidLocationPrepared())
      ) {
        permitted = await waitForAndroidLocationPermission(2000);
      }
      const mayRequest = !skipPermissionRequestRef.current;
      log('handleGetLocation starting flow', {permitted, mayRequest});
      startLocationFlow(mayRequest && !permitted);
    } catch (error) {
      log('handleGetLocation threw', {message: String((error as Error)?.message || error)});
      finishGpsFailure(error);
    }
  }, [startLocationFlow, log, finishGpsFailure]);

  useEffect(() => {
    mountedRef.current = true;
    screenFocusedRef.current = true;

    if (!enabledRef.current) {
      setGpsLoading(false);
      setGpsAllowed(false);
      setGpsError(null);
      setNeedsPermissionPrompt(false);
      return () => {
        mountedRef.current = false;
        screenFocusedRef.current = false;
      };
    }

    if (Platform.OS !== 'android') {
      void refreshGps(true);
      return () => {
        mountedRef.current = false;
        screenFocusedRef.current = false;
        if (!permissionDialogOpenRef.current) {
          gpsRunIdRef.current += 1;
        }
      };
    }

    setGpsLoading(false);
    setGpsAllowed(false);
    setGpsError(
      locationPreparedRef.current || isAndroidLocationPrepared()
        ? 'Tap Get location below to load GPS. No extra Allow needed if you already allowed on Dashboard.'
        : 'Tap Get location below. Allow when Android asks (Precise or Approximate is OK).',
    );
    setNeedsPermissionPrompt(true);

    return () => {
      mountedRef.current = false;
      screenFocusedRef.current = false;
      if (!permissionDialogOpenRef.current) {
        gpsRunIdRef.current += 1;
      }
    };
  }, [locationPrepared, refreshGps, options?.enabled]);

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      log('AppState change', {nextState, screenFocused: screenFocusedRef.current});
      if (nextState !== 'active' || !screenFocusedRef.current) {
        return;
      }
      if (permissionDialogOpenRef.current) {
        return;
      }
      if (awaitingReturnRef.current) {
        awaitingReturnRef.current = false;
        if (!gpsAllowed) {
          void refreshGps(false);
        }
        return;
      }
      if (Platform.OS !== 'android' && !gpsAllowed && !gpsLoading) {
        void refreshGps(false);
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [gpsAllowed, gpsLoading, refreshGps, log]);

  return {
    gpsAllowed,
    gpsLoading,
    gpsError,
    gpsPermissionDenied,
    currentLat,
    currentLng,
    currentAccuracy,
    needsPermissionPrompt,
    handleGetLocation,
    startLocationFlow,
    handleOpenLocationSettings,
  };
}
