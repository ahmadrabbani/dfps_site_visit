import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  AppState,
  InteractionManager,
  Platform,
  type AppStateStatus,
} from 'react-native';
import {Icon} from 'react-native-paper';
import {useQuery} from '@tanstack/react-query';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {USE_FAKE_API} from '../config/env';
import {CC_MAX_FLOORS} from '../constants/ccSurvey';
import {FormLabel} from '../components/FormLabel';
import PhotoPickerButtons from '../components/PhotoPickerButtons';
import {colors} from '../theme/colors';
import {formStyles} from '../theme/formStyles';
import {screenContentPadding} from '../theme/screenLayout';
import {fetchCaseList, isTestModeSession, type SessionUser} from '../services/api';
import type {SiteVisitViolation} from '../services/storage';
import type {CcSurveyCompletePayload, SetViolations, SiteScope, ViolationChoice} from '../types/app';
import {acquireDeviceCoords, isGpsPermissionError, isGpsSettingsError} from '../utils/deviceLocation';
import {
  hasLocationPermission,
  openAppSettings,
  requestLocationPermission,
  waitForAndroidLocationPermission,
} from '../utils/locationPermission';
import {isAndroidLocationPrepared} from '../utils/locationSession';
import {notifyInfo} from '../utils/notify';

const showTestGpsControls = typeof __DEV__ !== 'undefined' && __DEV__ && USE_FAKE_API;

function formatCoord(value: number | null): string {
  return value != null && Number.isFinite(value) ? value.toFixed(5) : '—';
}

interface SiteVisitScreenProps {
  user: SessionUser;
  siteScope: SiteScope;
  /** Set when location was granted on Dashboard/drawer before navigating here. */
  locationPrepared?: boolean;
  onScopeChange: (scope: SiteScope) => void;
  onAddViolation: (currentViolations: SiteVisitViolation[], setViolations: SetViolations) => void;
  onCompleteVisit: (survey: CcSurveyCompletePayload) => void;
}

export default function SiteVisitScreen({
  user,
  siteScope,
  locationPrepared = false,
  onScopeChange,
  onAddViolation,
  onCompleteVisit,
}: SiteVisitScreenProps) {
  const [gpsAllowed, setGpsAllowed] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(Platform.OS !== 'android');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [violations, setViolations] = useState<SiteVisitViolation[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [violationChoice, setViolationChoice] = useState<ViolationChoice>('');
  const [noOfFloors, setNoOfFloors] = useState('');
  const [remarks, setRemarks] = useState('');
  const [siteSketchUri, setSiteSketchUri] = useState<string | null>(null);
  const [capturingSketch, setCapturingSketch] = useState(false);
  const [needsPermissionPrompt, setNeedsPermissionPrompt] = useState(false);
  const [noOfFloorsFocused, setNoOfFloorsFocused] = useState(false);
  const [remarksFocused, setRemarksFocused] = useState(false);

  const mountedRef = useRef(true);
  const gpsRunIdRef = useRef(0);
  const screenFocusedRef = useRef(false);
  const awaitingReturnRef = useRef(false);
  const permissionDialogOpenRef = useRef(false);
  const allowTestGpsFallback = isTestModeSession(user);
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

  const finishGpsFailure = useCallback(
    (error: unknown) => {
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
    },
    [],
  );

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

  const useTestGpsFallback = useCallback(() => {
    applyCoords(31.5204, 74.3587);
    notifyInfo('Using test GPS coordinates (Lahore).');
  }, [applyCoords]);

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

  const plotCategoryLabel = siteScope === 'commercial' ? 'Commercial' : 'Residential';

  const {
    data: cases = [],
    isLoading: casesLoading,
    isFetching: casesFetching,
    error: casesError,
    refetch: refetchCases,
  } = useQuery({
    queryKey: ['ccCases', user.username, siteScope],
    queryFn: () => fetchCaseList(user.username, siteScope),
    staleTime: 2 * 60 * 1000,
  });

  const handleScopeChange = (scope: SiteScope) => {
    setSelectedCaseId('');
    onScopeChange(scope);
  };

  const selectedCase = useMemo(
    () => cases.find(item => item.id === selectedCaseId) || null,
    [cases, selectedCaseId],
  );

  const caseSelected = Boolean(selectedCaseId);
  const isViolation = violationChoice === 'yes';
  const isNoViolation = violationChoice === 'no';
  const caseAndCategoryReady = Boolean(selectedCaseId && siteScope);
  const showViolationSection = caseAndCategoryReady && isViolation;
  const showNoViolationSection = caseAndCategoryReady && isNoViolation;

  useEffect(() => {
    setSelectedCaseId('');
    setViolationChoice('');
    setViolations([]);
    setRemarks('');
    setSiteSketchUri(null);
  }, [siteScope]);

  useEffect(() => {
    if (!selectedCaseId) {
      setViolationChoice('');
    }
    setViolations([]);
    setRemarks('');
    setSiteSketchUri(null);
  }, [selectedCaseId, violationChoice]);

  const scopes: Array<{label: string; value: SiteScope}> = [
    {label: 'Residential', value: 'residential'},
    {label: 'Commercial', value: 'commercial'},
  ];

  const violationChoices: Array<{label: string; value: ViolationChoice}> = [
    {label: 'Yes — Violation', value: 'yes'},
    {label: 'No — Clear', value: 'no'},
  ];

  const canSave = useMemo(() => {
    if (!gpsAllowed || currentLat == null || currentLng == null) {
      return false;
    }
    if (!selectedCaseId || !siteScope || !violationChoice) {
      return false;
    }
    const floors = parseInt(noOfFloors, 10);
    if (!Number.isFinite(floors) || floors < 1 || floors > CC_MAX_FLOORS) {
      return false;
    }
    if (isViolation) {
      return violations.length > 0;
    }
    if (isNoViolation) {
      return remarks.trim().length > 0;
    }
    return false;
  }, [
    gpsAllowed,
    currentLat,
    currentLng,
    selectedCaseId,
    siteScope,
    violationChoice,
    noOfFloors,
    isViolation,
    isNoViolation,
    violations.length,
    remarks,
  ]);

  const handleAddViolation = () => {
    if (!showViolationSection) {
      return;
    }
    onAddViolation(violations, setViolations);
  };

  const pickSiteSketch = async (useCamera: boolean) => {
    setCapturingSketch(true);
    try {
      const result = useCamera
        ? await launchCamera({
            mediaType: 'photo',
            includeBase64: false,
            saveToPhotos: false,
            quality: 0.7,
            maxWidth: 1280,
            maxHeight: 1280,
          })
        : await launchImageLibrary({
            mediaType: 'photo',
            includeBase64: false,
            selectionLimit: 1,
            quality: 0.7,
            maxWidth: 1280,
            maxHeight: 1280,
          });

      if (result.didCancel) {
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Image missing', 'Could not read the selected image.');
        return;
      }
      setSiteSketchUri(asset.uri);
      notifyInfo('Site sketch attached.');
    } finally {
      setCapturingSketch(false);
    }
  };

  const handleSaveSurvey = () => {
    if (!canSave || currentLat == null || currentLng == null) {
      Alert.alert('Incomplete survey', 'Fill all required fields before saving.');
      return;
    }

    const floors = parseInt(noOfFloors, 10);
    onCompleteVisit({
      caseId: selectedCaseId,
      caseLabel: selectedCase?.owc || selectedCaseId,
      isViolation,
      noOfFloors: floors,
      remarks: remarks.trim(),
      mainImageUri: siteSketchUri,
      violations: isViolation ? violations : [],
      scope: siteScope,
      coords: {lat: currentLat, lng: currentLng},
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Completion Certificate Survey</Text>
      <View style={styles.officerContainer}>
        <Icon source="account-circle" size={24} color={colors.primary} />
        <Text style={styles.officerLabel}>
          Officer: <Text style={styles.officerName}>{user.name}</Text>
        </Text>
      </View>
      <FormLabel title="Current Location" required first>
        <View style={styles.locationCard}>
          <View style={styles.locationCardHeader}>
            <Icon
              source={gpsAllowed ? 'map-marker' : 'map-marker-off'}
              size={22}
              color={gpsLoading ? colors.mutedText : gpsAllowed ? colors.success : colors.danger}
            />
            <Text style={styles.locationTitle}>
              {gpsLoading
                ? 'Acquiring GPS location...'
                : gpsAllowed
                  ? 'GPS Location Ready'
                  : needsPermissionPrompt
                    ? 'Location required'
                    : 'GPS Signal Offline'}
            </Text>
          </View>
          
          {gpsAllowed && currentLat != null && currentLng != null ? (
            <View style={styles.coordinatesContainer}>
              <View style={styles.coordinateBlock}>
                <Text style={styles.coordinateLabel}>LATITUDE</Text>
                <Text style={styles.coordinateValue}>{formatCoord(currentLat)}</Text>
              </View>
              <View style={styles.coordinateDivider} />
              <View style={styles.coordinateBlock}>
                <Text style={styles.coordinateLabel}>LONGITUDE</Text>
                <Text style={styles.coordinateValue}>{formatCoord(currentLng)}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.locationError}>
              {gpsError || 'Tap Get location below to record GPS for this survey.'}
            </Text>
          )}

          {!gpsLoading && !gpsAllowed ? (
            <View style={styles.locationActionRow}>
              <TouchableOpacity
                style={styles.locationRetryBtn}
                onPress={() => void handleGetLocation()}>
                <Icon source="map-marker-radius" size={16} color="#ffffff" />
                <Text style={styles.locationRetryBtnText}>Get location</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.locationRetryBtn, styles.locationRetryBtnSecondary]}
                onPress={() => startLocationFlow(false)}>
                <Icon source="refresh" size={16} color={colors.primary} />
                <Text style={[styles.locationRetryBtnText, styles.locationRetryBtnTextSecondary]}>
                  Retry GPS
                </Text>
              </TouchableOpacity>
              {gpsPermissionDenied ? (
                <TouchableOpacity
                  style={styles.locationSettingsBtn}
                  onPress={handleOpenLocationSettings}>
                  <Text style={styles.locationSettingsBtnText}>Open Settings</Text>
                </TouchableOpacity>
              ) : null}
              {allowTestGpsFallback ? (
                <TouchableOpacity
                  style={styles.locationSettingsBtn}
                  onPress={useTestGpsFallback}>
                  <Text style={styles.locationSettingsBtnText}>Use test GPS</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </FormLabel>

      {showTestGpsControls ? (
        <Text style={styles.siteInfo}>Test mode active (fake API enabled).</Text>
      ) : null}

      <FormLabel title="Plot category" required>
        <View style={styles.row}>
          {scopes.map(scope => (
            <TouchableOpacity
              key={scope.value}
              style={[
                styles.chip,
                scope.value === siteScope ? styles.chipActive : styles.chipInactive,
              ]}
              onPress={() => handleScopeChange(scope.value)}>
              <Text style={[styles.chipText, scope.value === siteScope ? styles.chipTextActive : null]}>
                {scope.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </FormLabel>

      <FormLabel
        title="Application case"
        required
        hint="Cases assigned to you for the selected plot category.">
        {casesLoading || casesFetching ? (
        <View style={styles.loaderRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.helper}>Loading {plotCategoryLabel} cases...</Text>
        </View>
      ) : casesError ? (
        <View>
          <Text style={styles.errorText}>{(casesError as Error).message}</Text>
          <TouchableOpacity style={styles.smallButton} onPress={() => refetchCases()}>
            <Text style={styles.smallButtonText}>Retry cases</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {cases.length === 0 ? (
            <Text style={styles.helper}>
              No {plotCategoryLabel} cases for {user.username}. Try the other plot category or sign in with
              your field officer account.
            </Text>
          ) : (
            <View style={styles.caseGrid}>
              {cases.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.caseCard,
                    item.id === selectedCaseId ? styles.caseCardActive : styles.caseCardInactive,
                  ]}
                  onPress={() => setSelectedCaseId(item.id)}>
                  <Text style={[styles.caseCardText, item.id === selectedCaseId ? styles.caseCardTextActive : null]}>
                    {item.owc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        )}
      </FormLabel>

      <FormLabel
        title="Violation on site"
        required
        hint={
          caseSelected
            ? 'Does this visit record a building violation?'
            : 'Select an application case above before answering.'
        }>
        <View style={styles.row}>
          {violationChoices.map(choice => (
            <TouchableOpacity
              key={choice.value}
              disabled={!caseSelected}
              style={[
                styles.chip,
                !caseSelected ? styles.chipDisabled : null,
                violationChoice === choice.value ? styles.chipActive : styles.chipInactive,
              ]}
              onPress={() => {
                if (!caseSelected) {
                  return;
                }
                setViolationChoice(choice.value);
              }}>
              <Text
                style={[
                  styles.chipText,
                  !caseSelected ? styles.chipTextDisabled : null,
                  violationChoice === choice.value ? styles.chipTextActive : null,
                ]}>
                {choice.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </FormLabel>

      <FormLabel title="Number of floors" required>
        <TextInput
          style={[styles.input, noOfFloorsFocused && styles.inputFocused]}
          onFocus={() => setNoOfFloorsFocused(true)}
          onBlur={() => setNoOfFloorsFocused(false)}
          keyboardType="number-pad"
          value={noOfFloors}
          onChangeText={value => {
            const numeric = value.replace(/[^0-9]/g, '');
            if (numeric && parseInt(numeric, 10) > CC_MAX_FLOORS) {
              setNoOfFloors(String(CC_MAX_FLOORS));
              return;
            }
            setNoOfFloors(numeric);
          }}
          placeholder={`Enter 1–${CC_MAX_FLOORS}`}
          returnKeyType="done"
          accessibilityLabel="Number of floors input"
          accessibilityHint={`Enter a value between 1 and ${CC_MAX_FLOORS}`}
        />
      </FormLabel>

      {showViolationSection ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Violations</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddViolation}>
              <Text style={styles.addButtonText}>+ Add Violation</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.photoFlowHint}>
            Each violation can include a local photo (Add Violation). Below, Site sketch is the
            photo uploaded to the server as main_image.
          </Text>
          {violations.length === 0 ? (
            <Text style={styles.helper}>Add at least one violation.</Text>
          ) : (
            violations.map((item, idx) => (
              <View key={`${item.violationTypeId}-${idx}`} style={styles.violationCard}>
                <Text style={styles.violationType}>{item.typeLabel || item.type}</Text>
                {item.floorLabel ? <Text style={styles.violationMeta}>Floor: {item.floorLabel}</Text> : null}
                {item.unit ? <Text style={styles.violationMeta}>Unit: {item.unit}</Text> : null}
                {item.width != null && item.length != null ? (
                  <Text style={styles.violationMeta}>
                    Size: {item.width} x {item.length}
                  </Text>
                ) : null}
                {item.notes ? <Text style={styles.violationNotes}>{item.notes}</Text> : null}
                {item.photoUri ? (
                  <Text style={styles.violationMeta}>Local violation photo attached</Text>
                ) : null}
              </View>
            ))
          )}
          <FormLabel title="Visit remarks" hint="Optional — site position or other notes.">
            <TextInput
              style={[styles.input, formStyles.notesInput, remarksFocused && styles.inputFocused]}
              onFocus={() => setRemarksFocused(true)}
              onBlur={() => setRemarksFocused(false)}
              multiline
              value={remarks}
              onChangeText={setRemarks}
              placeholder="e.g. corner plot, road-facing"
              accessibilityLabel="Visit remarks input"
              accessibilityHint="Optional details about the inspection"
            />
          </FormLabel>
          <FormLabel
            title="Site sketch (server upload)"
            hint="Optional. This photo is sent to the DFPS server as main_image — not the per-violation photos from Add Violation. Use a clear site layout or plot photo.">
            <PhotoPickerButtons
              disabled={capturingSketch}
              onCamera={() => pickSiteSketch(true)}
              onGallery={() => pickSiteSketch(false)}
              cameraLabel="Take site photo"
              galleryLabel="From gallery"
              cameraAccessibilityLabel="Take site sketch photo with camera"
              galleryAccessibilityLabel="Choose site sketch from gallery"
            />
            <Text style={styles.photoMeta}>
              {siteSketchUri
                ? 'Site sketch ready — will upload as main_image'
                : 'No site sketch yet — optional but this is the server photo'}
            </Text>
            {siteSketchUri ? <Image source={{uri: siteSketchUri}} style={styles.sketchPreview} /> : null}
          </FormLabel>
        </>
      ) : null}

      {showNoViolationSection ? (
        <FormLabel
          title="Visit remarks"
          required
          hint="Required when no violation was found on site.">
          <TextInput
            style={[styles.input, formStyles.notesInput, remarksFocused && styles.inputFocused]}
            onFocus={() => setRemarksFocused(true)}
            onBlur={() => setRemarksFocused(false)}
            multiline
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Brief summary of the inspection"
            accessibilityLabel="Required visit remarks input"
            accessibilityHint="Describe the details confirming no violations were observed"
          />
        </FormLabel>
      ) : null}

      <TouchableOpacity
        style={[styles.completeButton, canSave ? styles.completeButtonEnabled : styles.completeButtonDisabled]}
        disabled={!canSave}
        onPress={handleSaveSurvey}>
        <Text style={styles.completeButtonText}>Save Survey</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...screenContentPadding(16, 24),
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  header: {fontSize: 20, fontWeight: '700', color: colors.primary},
  officerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0f8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  officerLabel: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  officerName: {
    fontWeight: '800',
    color: colors.primary,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 6,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  coordinateBlock: {
    flex: 1,
    alignItems: 'center',
  },
  coordinateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedText,
    letterSpacing: 1,
  },
  coordinateValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
    marginTop: 4,
  },
  coordinateDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#cbd5e1',
  },
  locationError: {
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 18,
  },
  locationActionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  locationRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  locationRetryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationRetryBtnSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  locationRetryBtnTextSecondary: {
    color: colors.primary,
  },
  locationSettingsBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  locationSettingsBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  siteInfo: {fontSize: 13, color: colors.mutedText, marginTop: 2},
  helper: {fontSize: 12, color: colors.mutedText, marginTop: 8, lineHeight: 17},
  errorText: {fontSize: 12, color: colors.danger, marginTop: 8},
  row: {flexDirection: 'row', flexWrap: 'wrap'},
  chip: {paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginRight: 8, marginBottom: 8},
  chipActive: {backgroundColor: colors.primary},
  chipInactive: {backgroundColor: '#e5e7eb'},
  chipDisabled: {opacity: 0.45},
  chipText: {fontSize: 13, color: colors.text},
  chipTextDisabled: {color: colors.mutedText},
  chipTextActive: {color: '#ffffff'},
  input: {
    borderWidth: 1,
    borderColor: '#c5d0de',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  caseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  caseCard: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  caseCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  caseCardInactive: {
    backgroundColor: '#f3f4f6',
  },
  caseCardText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  caseCardTextActive: {
    color: '#ffffff',
  },
  loaderRow: {flexDirection: 'row', alignItems: 'center', marginTop: 8},
  sectionHeader: {marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  sectionTitle: {fontSize: 16, fontWeight: '700', color: colors.primary},
  photoFlowHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedText,
    marginBottom: 12,
    marginTop: 4,
  },
  photoMeta: {fontSize: 12, color: colors.mutedText, marginTop: 8, lineHeight: 17},
  addButton: {paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.primaryLight},
  addButtonText: {color: '#ffffff', fontSize: 12},
  violationCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  violationType: {fontWeight: '600', color: colors.text},
  violationMeta: {fontSize: 12, color: colors.mutedText, marginTop: 4},
  violationNotes: {fontSize: 12, color: colors.text, marginTop: 6},
  smallButton: {
    marginTop: 8,
    marginRight: 8,
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  smallButtonText: {color: '#ffffff', fontSize: 12, fontWeight: '600'},
  buttonDisabled: {opacity: 0.7},
  sketchPreview: {
    width: '100%',
    height: 180,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  completeButton: {marginTop: 24, marginBottom: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center'},
  completeButtonEnabled: {backgroundColor: colors.primary},
  completeButtonDisabled: {backgroundColor: '#9ca3af'},
  completeButtonText: {color: '#ffffff', fontWeight: '600'},
});
