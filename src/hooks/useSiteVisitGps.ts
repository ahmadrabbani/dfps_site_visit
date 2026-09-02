import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, InteractionManager, Platform, type AppStateStatus} from 'react-native';
import {acquireDeviceCoords, isGpsPermissionError, isGpsSettingsError} from '../utils/deviceLocation';
import {
  hasLocationPermission,
  openAppSettings,
  requestLocationPermission,
  waitForAndroidLocationPermission,
} from '../utils/locationPermission';
import {isAndroidLocationPrepared} from '../utils/locationSession';

export function formatCoord(value: number | null): string {
  return value != null && Number.isFinite(value) ? value.toFixed(5) : '—';
}

export function useSiteVisitGps(locationPrepared = false) {
  const [gpsAllowed, setGpsAllowed] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(Platform.OS !== 'android');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [needsPermissionPrompt, setNeedsPermissionPrompt] = useState(false);

  const mountedRef = useRef(true);
  const gpsRunIdRef = useRef(0);
  const screenFocusedRef = useRef(false);
  const awaitingReturnRef = useRef(false);
  const permissionDialogOpenRef = useRef(false);
  const locationPreparedRef = useRef(locationPrepared);

  const androidPostPermissionDelay = () =>
    Platform.OS === 'android'
      ? new Promise<void>(resolve => setTimeout(resolve, 600))
      : Promise.resolve();

  const applyCoords = useCallback((lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setGpsAllowed(true);
    setGpsLoading(false);
    setGpsError(null);
    setGpsPermissionDenied(false);
    setNeedsPermissionPrompt(false);
  }, []);

  const finishGpsFailure = useCallback((error: unknown) => {
    setGpsAllowed(false);
    setGpsLoading(false);
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
  }, []);

  const runGpsFetch = useCallback(
    async (runId: number) => {
      const isStale = () => !mountedRef.current || runId !== gpsRunIdRef.current;
      try {
        const coords = await acquireDeviceCoords();
        if (isStale()) {
          return;
        }
        applyCoords(coords.lat, coords.lng);
      } catch (error) {
        if (isStale()) {
          return;
        }
        finishGpsFailure(error);
      }
    },
    [applyCoords, finishGpsFailure],
  );

  const refreshGps = useCallback(
    async (requestPermission: boolean) => {
      const runId = ++gpsRunIdRef.current;
      const isStale = () => !mountedRef.current || runId !== gpsRunIdRef.current;

      setGpsLoading(true);
      setGpsError(null);
      setGpsPermissionDenied(false);
      setNeedsPermissionPrompt(false);

      let permitted = await hasLocationPermission();

      if (
        !permitted &&
        Platform.OS === 'android' &&
        (locationPreparedRef.current || isAndroidLocationPrepared())
      ) {
        permitted = await waitForAndroidLocationPermission(4500);
      }

      if (!permitted && requestPermission) {
        permissionDialogOpenRef.current = true;
        try {
          permitted = await requestLocationPermission();
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
    [runGpsFetch],
  );

  const handleOpenLocationSettings = useCallback(() => {
    awaitingReturnRef.current = true;
    openAppSettings();
  }, []);

  useEffect(() => {
    locationPreparedRef.current = locationPrepared;
  }, [locationPrepared]);

  const startLocationFlow = useCallback(
    (requestPermission: boolean) => {
      void refreshGps(requestPermission);
    },
    [refreshGps],
  );

  const handleGetLocation = useCallback(async () => {
    let permitted = await hasLocationPermission();
    if (
      !permitted &&
      Platform.OS === 'android' &&
      (locationPreparedRef.current || isAndroidLocationPrepared())
    ) {
      permitted = await waitForAndroidLocationPermission(2000);
    }
    startLocationFlow(!permitted);
  }, [startLocationFlow]);

  useEffect(() => {
    mountedRef.current = true;
    screenFocusedRef.current = true;

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
  }, [locationPrepared, refreshGps]);

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
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
  }, [gpsAllowed, gpsLoading, refreshGps]);

  return {
    gpsAllowed,
    gpsLoading,
    gpsError,
    gpsPermissionDenied,
    currentLat,
    currentLng,
    needsPermissionPrompt,
    handleGetLocation,
    startLocationFlow,
    handleOpenLocationSettings,
  };
}
