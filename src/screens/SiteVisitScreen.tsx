import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {useQuery} from '@tanstack/react-query';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {USE_FAKE_API} from '../config/env';
import {CC_MAX_FLOORS} from '../constants/ccSurvey';
import {colors} from '../theme/colors';
import {fetchCaseList, type SessionUser} from '../services/api';
import type {SiteVisitViolation} from '../services/storage';
import type {CcSurveyCompletePayload, SetViolations, SiteScope, ViolationChoice} from '../types/app';
import {notifyInfo} from '../utils/notify';

const showTestGpsControls = typeof __DEV__ !== 'undefined' && __DEV__ && USE_FAKE_API;

interface SiteVisitScreenProps {
  user: SessionUser;
  siteScope: SiteScope;
  onScopeChange: (scope: SiteScope) => void;
  onAddViolation: (currentViolations: SiteVisitViolation[], setViolations: SetViolations) => void;
  onCompleteVisit: (survey: CcSurveyCompletePayload) => void;
}

export default function SiteVisitScreen({
  user,
  siteScope,
  onScopeChange,
  onAddViolation,
  onCompleteVisit,
}: SiteVisitScreenProps) {
  const [gpsAllowed, setGpsAllowed] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [violations, setViolations] = useState<SiteVisitViolation[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [violationChoice, setViolationChoice] = useState<ViolationChoice>('');
  const [noOfFloors, setNoOfFloors] = useState('');
  const [remarks, setRemarks] = useState('');
  const [siteSketchUri, setSiteSketchUri] = useState<string | null>(null);
  const [capturingSketch, setCapturingSketch] = useState(false);

  const targetLat = 31.5204;
  const targetLon = 74.3587;

  const {
    data: cases = [],
    isLoading: casesLoading,
    error: casesError,
    refetch: refetchCases,
  } = useQuery({
    queryKey: ['ccCases', user.username],
    queryFn: () => fetchCaseList(user.username),
    staleTime: 5 * 60 * 1000,
  });

  const selectedCase = useMemo(
    () => cases.find(item => item.id === selectedCaseId) || null,
    [cases, selectedCaseId],
  );

  const isViolation = violationChoice === 'yes';
  const isNoViolation = violationChoice === 'no';
  const caseAndCategoryReady = Boolean(selectedCaseId && siteScope);
  const showViolationSection = caseAndCategoryReady && isViolation;
  const showNoViolationSection = caseAndCategoryReady && isNoViolation;

  useEffect(() => {
    Geolocation.getCurrentPosition(
      pos => {
        const {latitude, longitude} = pos.coords;
        setCurrentLat(latitude);
        setCurrentLng(longitude);
        const dist = distanceInMeters(latitude, longitude, targetLat, targetLon);
        setGpsAllowed(dist < 100);
      },
      () => setGpsAllowed(false),
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  }, []);

  useEffect(() => {
    setViolations([]);
    setRemarks('');
    setSiteSketchUri(null);
  }, [selectedCaseId, violationChoice, siteScope]);

  const scopes: Array<{label: string; value: SiteScope}> = [
    {label: 'Residential', value: 'residential'},
    {label: 'Commercial', value: 'commercial'},
  ];

  const violationChoices: Array<{label: string; value: ViolationChoice}> = [
    {label: 'Yes', value: 'yes'},
    {label: 'No', value: 'no'},
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
      <Text style={styles.siteInfo}>Officer: {user.name}</Text>
      <View style={[styles.statusBadge, {backgroundColor: gpsAllowed ? colors.success : colors.danger}]}>
        <Text style={styles.statusText}>{gpsAllowed ? 'On-site (GPS verified)' : 'Not at site location'}</Text>
      </View>
      {showTestGpsControls ? (
        <Text style={styles.siteInfo}>Test mode active (fake API enabled).</Text>
      ) : null}

      <Text style={styles.label}>Plot Category *</Text>
      <View style={styles.row}>
        {scopes.map(scope => (
          <TouchableOpacity
            key={scope.value}
            style={[
              styles.chip,
              scope.value === siteScope ? styles.chipActive : styles.chipInactive,
            ]}
            onPress={() => onScopeChange(scope.value)}>
            <Text style={[styles.chipText, scope.value === siteScope ? styles.chipTextActive : null]}>
              {scope.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Select Case *</Text>
      {casesLoading ? (
        <View style={styles.loaderRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.helper}>Loading cases...</Text>
        </View>
      ) : casesError ? (
        <View>
          <Text style={styles.errorText}>{(casesError as Error).message}</Text>
          <TouchableOpacity style={styles.smallButton} onPress={() => refetchCases()}>
            <Text style={styles.smallButtonText}>Retry cases</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.helper}>No cases available for your account.</Text>}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[
                styles.caseRow,
                item.id === selectedCaseId ? styles.caseRowActive : styles.caseRowInactive,
              ]}
              onPress={() => setSelectedCaseId(item.id)}>
              <Text style={[styles.caseText, item.id === selectedCaseId ? styles.caseTextActive : null]}>
                {item.owc}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Text style={styles.label}>Is Violation? *</Text>
      <View style={styles.row}>
        {violationChoices.map(choice => (
          <TouchableOpacity
            key={choice.value}
            style={[
              styles.chip,
              violationChoice === choice.value ? styles.chipActive : styles.chipInactive,
            ]}
            onPress={() => setViolationChoice(choice.value)}>
            <Text
              style={[
                styles.chipText,
                violationChoice === choice.value ? styles.chipTextActive : null,
              ]}>
              {choice.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>No. of Floors *</Text>
      <TextInput
        style={styles.input}
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
        placeholder={`Max ${CC_MAX_FLOORS}`}
      />

      {showViolationSection ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Violations</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddViolation}>
              <Text style={styles.addButtonText}>+ Add Violation</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={violations}
            keyExtractor={(_, idx) => idx.toString()}
            scrollEnabled={false}
            renderItem={({item}) => (
              <View style={styles.violationCard}>
                <Text style={styles.violationType}>{item.typeLabel || item.type}</Text>
                {item.floorLabel ? <Text style={styles.violationMeta}>Floor: {item.floorLabel}</Text> : null}
                {item.unit ? <Text style={styles.violationMeta}>Unit: {item.unit}</Text> : null}
                {item.width != null && item.length != null ? (
                  <Text style={styles.violationMeta}>
                    Size: {item.width} x {item.length}
                  </Text>
                ) : null}
                {item.notes ? <Text style={styles.violationNotes}>{item.notes}</Text> : null}
              </View>
            )}
            ListEmptyComponent={<Text style={styles.helper}>Add at least one violation.</Text>}
          />
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            multiline
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Site position / visit remarks"
          />
        </>
      ) : null}

      {showNoViolationSection ? (
        <>
          <Text style={styles.label}>General Remarks *</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            multiline
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Required when there is no violation"
          />
        </>
      ) : null}

      {(showViolationSection || showNoViolationSection) && (
        <>
          <Text style={styles.label}>Upload Site Sketch</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.smallButton, capturingSketch ? styles.buttonDisabled : null]}
              disabled={capturingSketch}
              onPress={() => pickSiteSketch(true)}>
              <Text style={styles.smallButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallButton, styles.secondaryButton, capturingSketch ? styles.buttonDisabled : null]}
              disabled={capturingSketch}
              onPress={() => pickSiteSketch(false)}>
              <Text style={[styles.smallButtonText, styles.secondaryButtonText]}>Browse</Text>
            </TouchableOpacity>
          </View>
          {siteSketchUri ? <Image source={{uri: siteSketchUri}} style={styles.sketchPreview} /> : null}
        </>
      )}

      <TouchableOpacity
        style={[styles.completeButton, canSave ? styles.completeButtonEnabled : styles.completeButtonDisabled]}
        disabled={!canSave}
        onPress={handleSaveSurvey}>
        <Text style={styles.completeButtonText}>Save Survey</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const styles = StyleSheet.create({
  container: {padding: 16, backgroundColor: colors.background, flexGrow: 1},
  header: {fontSize: 20, fontWeight: '700', color: colors.primary},
  siteInfo: {fontSize: 13, color: colors.mutedText, marginTop: 2},
  statusBadge: {marginTop: 12, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start'},
  statusText: {color: '#ffffff', fontSize: 12},
  label: {fontSize: 13, color: colors.mutedText, marginTop: 16, marginBottom: 6},
  helper: {fontSize: 12, color: colors.mutedText, marginTop: 8},
  errorText: {fontSize: 12, color: colors.danger, marginTop: 8},
  row: {flexDirection: 'row', flexWrap: 'wrap'},
  chip: {paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginRight: 8, marginBottom: 8},
  chipActive: {backgroundColor: colors.primary},
  chipInactive: {backgroundColor: '#e5e7eb'},
  chipText: {fontSize: 13, color: colors.text},
  chipTextActive: {color: '#ffffff'},
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: colors.text,
  },
  notesInput: {minHeight: 90, textAlignVertical: 'top'},
  caseRow: {paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 6},
  caseRowActive: {backgroundColor: colors.primary},
  caseRowInactive: {backgroundColor: '#e5e7eb'},
  caseText: {fontSize: 13, color: colors.text},
  caseTextActive: {color: '#ffffff', fontWeight: '600'},
  loaderRow: {flexDirection: 'row', alignItems: 'center', marginTop: 8},
  sectionHeader: {marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  sectionTitle: {fontSize: 16, fontWeight: '600', color: colors.text},
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
  secondaryButton: {backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.primaryLight},
  smallButtonText: {color: '#ffffff', fontSize: 12, fontWeight: '600'},
  secondaryButtonText: {color: colors.primaryLight},
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
