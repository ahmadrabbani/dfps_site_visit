import React, {useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {Icon} from 'react-native-paper';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {FormLabel} from '../components/FormLabel';
import GpsLocationCard from '../components/GpsLocationCard';
import GpsDebugPanel from '../components/GpsDebugPanel';
import OfficerLocationMap from '../components/OfficerLocationMap';
import LookupSelect from '../components/LookupSelect';
import PhotoPickerButtons from '../components/PhotoPickerButtons';
import {
  PROPERTY_DESEAL_TITLE,
  PROPERTY_SEAL_FLOW_TITLE,
  PROPERTY_SEAL_KINDS,
  PROPERTY_SEAL_MAX_GPS_ACCURACY_M,
  PROPERTY_SEAL_MAX_PHOTOS,
  PROPERTY_SEAL_TITLE,
  SEAL_ACTIVITIES,
  type PropertySealActivityValue,
} from '../constants/propertySeal';
import {useSiteVisitGps} from '../hooks/useSiteVisitGps';
import {invalidateVisitCaches} from '../queries/invalidateVisitCaches';
import {queryKeys} from '../queries/queryKeys';
import type {SessionUser} from '../services/api';
import {addPendingPropertySealVisit, type PropertySealVisitKind} from '../services/propertySealStorage';
import {fetchBlocks, fetchPhases, fetchPlots, fetchSchemes} from '../services/plotBank';
import {syncPending} from '../services/syncService';
import {colors} from '../theme/colors';
import {formStyles} from '../theme/formStyles';
import {screenContentPadding} from '../theme/screenLayout';
import {notifySuccess, notifyWarning} from '../utils/notify';
import {gpsDebugLog} from '../utils/gpsDebugLog';
import {hapticMedium, hapticSelection} from '../utils/haptics';

interface PropertySealScreenProps {
  user: SessionUser;
  locationPrepared?: boolean;
  onSaved: () => void;
}

interface PhotoSlot {
  id: string;
  uri: string | null;
}

export default function PropertySealScreen({
  user,
  locationPrepared = false,
  onSaved,
}: PropertySealScreenProps) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<PropertySealVisitKind>('seal');
  const isSeal = kind === 'seal';
  const isDeseal = kind === 'deseal';

  const [scheme, setScheme] = useState('');
  const [phase, setPhase] = useState('');
  const [block, setBlock] = useState('');
  const [plotId, setPlotId] = useState('');
  const [plotLabel, setPlotLabel] = useState('');
  const [activityValue, setActivityValue] = useState('4');
  const [finalRemarks, setFinalRemarks] = useState('');
  const photoIdRef = useRef(1);
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([{id: 'slot-1', uri: null}]);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remarksFocused, setRemarksFocused] = useState(false);

  // Location appears as soon as Seal / Deseal is chosen (kind defaults to seal).
  const canShowLocation = Boolean(kind);

  const gps = useSiteVisitGps(false, {
    stayInApp: true,
    enabled: canShowLocation,
    maxAccuracyMeters: PROPERTY_SEAL_MAX_GPS_ACCURACY_M,
    debugTag: 'PropertySeal',
  });

  const schemesQuery = useQuery({
    queryKey: queryKeys.plotSchemes,
    queryFn: fetchSchemes,
    enabled: isSeal,
    staleTime: 10 * 60 * 1000,
  });
  const phasesQuery = useQuery({
    queryKey: queryKeys.plotPhases(scheme),
    queryFn: () => fetchPhases(scheme),
    enabled: isSeal && Boolean(scheme),
    staleTime: 10 * 60 * 1000,
  });
  const blocksQuery = useQuery({
    queryKey: queryKeys.plotBlocks(scheme, phase),
    queryFn: () => fetchBlocks(scheme, phase),
    enabled: isSeal && Boolean(scheme && phase),
    staleTime: 10 * 60 * 1000,
  });
  const plotsQuery = useQuery({
    queryKey: queryKeys.plotPlots(scheme, phase, block),
    queryFn: () => fetchPlots(scheme, phase, block),
    enabled: isSeal && Boolean(scheme && phase && block),
    staleTime: 10 * 60 * 1000,
  });

  const selectedActivity = useMemo(
    () => SEAL_ACTIVITIES.find(item => item.value === activityValue) || null,
    [activityValue],
  );

  const photoUris = useMemo(
    () => photoSlots.map(slot => slot.uri).filter((uri): uri is string => Boolean(uri)),
    [photoSlots],
  );

  const gpsReady =
    gps.gpsAllowed &&
    gps.currentLat != null &&
    gps.currentLng != null &&
    (gps.currentAccuracy == null || gps.currentAccuracy <= PROPERTY_SEAL_MAX_GPS_ACCURACY_M);

  const canSave = Boolean(kind) &&
    gpsReady &&
    finalRemarks.trim().length > 0 &&
    !saving &&
    (isDeseal
      ? photoUris.length > 0
      : scheme.trim().length > 0 && plotLabel.trim().length > 0 && Boolean(activityValue));

  const selectKind = (next: PropertySealVisitKind) => {
    hapticSelection();
    gpsDebugLog('PropertySeal', 'selectKind', {next, previous: kind});
    setKind(next);
    setScheme('');
    setPhase('');
    setBlock('');
    setPlotId('');
    setPlotLabel('');
    setActivityValue(next === 'seal' ? '4' : '5');
    setFinalRemarks('');
    photoIdRef.current = 1;
    setPhotoSlots([{id: 'slot-1', uri: null}]);
  };

  const pickPhotoForSlot = async (slotId: string, useCamera: boolean) => {
    setCapturingPhoto(true);
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
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        return;
      }
      setPhotoSlots(prev => prev.map(slot => (slot.id === slotId ? {...slot, uri} : slot)));
    } finally {
      setCapturingPhoto(false);
    }
  };

  const addPhotoSlot = () => {
    if (photoSlots.length >= PROPERTY_SEAL_MAX_PHOTOS) {
      Alert.alert('Photo limit', `You can attach up to ${PROPERTY_SEAL_MAX_PHOTOS} photos.`);
      return;
    }
    photoIdRef.current += 1;
    setPhotoSlots(prev => [...prev, {id: `slot-${photoIdRef.current}`, uri: null}]);
  };

  const removePhotoSlot = (slotId: string) => {
    setPhotoSlots(prev => {
      const next = prev.filter(slot => slot.id !== slotId);
      if (next.length > 0) {
        return next;
      }
      photoIdRef.current += 1;
      return [{id: `slot-${photoIdRef.current}`, uri: null}];
    });
  };

  const handleSave = async () => {
    if (!kind || !canSave || gps.currentLat == null || gps.currentLng == null) {
      Alert.alert(
        'Incomplete form',
        isDeseal
          ? 'Location (≤50 m), at least one picture, and remarks are required.'
          : 'Location (≤50 m), scheme, plot, activity, and remarks are required.',
      );
      return;
    }

    const activityLabel =
      kind === 'deseal'
        ? 'De-sealing'
        : selectedActivity?.label ||
          SEAL_ACTIVITIES.find(a => a.value === (activityValue as PropertySealActivityValue))?.label ||
          'Sealed / demolished';

    setSaving(true);
    try {
      await addPendingPropertySealVisit({
        localId: `ps-${Date.now()}`,
        kind,
        officerId: user.id,
        officerName: user.name,
        authToken: user.token,
        scheme: isDeseal ? '' : scheme.trim(),
        phase: isDeseal ? '' : phase.trim(),
        block: isDeseal ? '' : block.trim(),
        plot: isDeseal ? '' : plotLabel.trim(),
        activityValue: isDeseal ? '5' : activityValue,
        activityLabel,
        finalRemarks: finalRemarks.trim(),
        photoUris,
        lat: gps.currentLat,
        lng: gps.currentLng,
        accuracyMeters: gps.currentAccuracy,
        savedAt: new Date().toISOString(),
      });

      let uploaded = false;
      try {
        const syncResult = await syncPending({skipNotifications: true});
        uploaded = syncResult.uploaded > 0;
      } catch {
        uploaded = false;
      }

      invalidateVisitCaches(queryClient, {serverPushSucceeded: uploaded});

      if (uploaded) {
        notifySuccess(
          kind === 'deseal'
            ? 'Property Deseal saved and sent to the server.'
            : 'Property Seal saved and sent to the server.',
        );
      } else {
        notifyWarning(
          'Saved on this device. Open My Submissions to push when online (same as site visits).',
        );
      }
      onSaved();
    } catch {
      Alert.alert('Could not save', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>{PROPERTY_SEAL_FLOW_TITLE}</Text>
      <View style={styles.officerContainer}>
        <Icon source="account-circle" size={24} color={colors.primary} />
        <Text style={styles.officerLabel}>
          Officer: <Text style={styles.officerName}>{user.name}</Text>
        </Text>
      </View>

      <FormLabel title="Seal or Deseal" required first compact>
        <View style={styles.activityWrap}>
          {PROPERTY_SEAL_KINDS.map(item => {
            const selected = item.value === kind;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.chip, selected ? styles.chipActive : styles.chipInactive]}
                onPress={() => selectKind(item.value)}
                accessibilityRole="button"
                accessibilityState={{selected}}
                accessibilityLabel={item.label}>
                <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </FormLabel>

      {kind ? (
        <>
          <FormLabel title="Location" required compact>
            <GpsLocationCard
              gpsAllowed={gps.gpsAllowed}
              gpsLoading={gps.gpsLoading}
              gpsError={gps.gpsError}
              gpsPermissionDenied={gps.gpsPermissionDenied}
              currentLat={gps.currentLat}
              currentLng={gps.currentLng}
              currentAccuracy={gps.currentAccuracy}
              maxAccuracyMeters={PROPERTY_SEAL_MAX_GPS_ACCURACY_M}
              needsPermissionPrompt={gps.needsPermissionPrompt}
              allowOpenSettings={false}
              onGetLocation={() => {
                hapticMedium();
                gpsDebugLog('PropertySeal', 'Get location button pressed', {
                  kind,
                  scheme,
                  plotLabel,
                  canShowLocation,
                });
                void gps.handleGetLocation();
              }}
              onRetryGps={() => {
                hapticMedium();
                gps.startLocationFlow(false);
              }}
              onOpenSettings={gps.handleOpenLocationSettings}
            />
            {gps.currentLat != null && gps.currentLng != null ? (
              <OfficerLocationMap
                lat={gps.currentLat}
                lng={gps.currentLng}
                accuracyMeters={gps.currentAccuracy}
              />
            ) : null}
          </FormLabel>

          <Text style={styles.sectionTitle}>
            {isDeseal ? PROPERTY_DESEAL_TITLE : PROPERTY_SEAL_TITLE} details
          </Text>

          {isSeal ? (
            <>
              <FormLabel title="Scheme" required compact>
                <LookupSelect
                  title="Select scheme"
                  placeholder="Select scheme"
                  value={scheme}
                  options={schemesQuery.data ?? []}
                  loading={schemesQuery.isLoading}
                  error={schemesQuery.error ? (schemesQuery.error as Error).message : null}
                  onRetry={() => void schemesQuery.refetch()}
                  onSelect={option => {
                    setScheme(option.value);
                    setPhase('');
                    setBlock('');
                    setPlotId('');
                    setPlotLabel('');
                  }}
                  accessibilityLabel="Scheme"
                />
              </FormLabel>

              <FormLabel title="Phase" compact>
                <LookupSelect
                  title="Select phase"
                  placeholder="Select phase"
                  value={phase}
                  options={phasesQuery.data ?? []}
                  loading={phasesQuery.isFetching}
                  disabled={!scheme}
                  error={phasesQuery.error ? (phasesQuery.error as Error).message : null}
                  onRetry={() => void phasesQuery.refetch()}
                  onSelect={option => {
                    setPhase(option.value);
                    setBlock('');
                    setPlotId('');
                    setPlotLabel('');
                  }}
                  accessibilityLabel="Phase"
                />
              </FormLabel>

              <FormLabel title="Block" compact>
                <LookupSelect
                  title="Select block"
                  placeholder="Select block"
                  value={block}
                  options={blocksQuery.data ?? []}
                  loading={blocksQuery.isFetching}
                  disabled={!phase}
                  error={blocksQuery.error ? (blocksQuery.error as Error).message : null}
                  onRetry={() => void blocksQuery.refetch()}
                  onSelect={option => {
                    setBlock(option.value);
                    setPlotId('');
                    setPlotLabel('');
                  }}
                  accessibilityLabel="Block"
                />
              </FormLabel>

              <FormLabel title="Plot" required compact>
                <LookupSelect
                  title="Select plot"
                  placeholder="Select plot"
                  value={plotId}
                  options={plotsQuery.data ?? []}
                  loading={plotsQuery.isFetching}
                  disabled={!block}
                  error={plotsQuery.error ? (plotsQuery.error as Error).message : null}
                  onRetry={() => void plotsQuery.refetch()}
                  onSelect={option => {
                    gpsDebugLog('PropertySeal', 'plot selected', {
                      plotId: option.value,
                      plotLabel: option.label,
                    });
                    setPlotId(option.value);
                    setPlotLabel(option.label);
                  }}
                  accessibilityLabel="Plot"
                />
              </FormLabel>

              <FormLabel title="Activity" required compact>
                <View style={styles.activityWrap}>
                  {SEAL_ACTIVITIES.map(item => {
                    const selected = item.value === activityValue;
                    return (
                      <TouchableOpacity
                        key={item.value}
                        style={[styles.chip, selected ? styles.chipActive : styles.chipInactive]}
                        onPress={() => {
                          hapticSelection();
                          setActivityValue(item.value);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{selected}}>
                        <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </FormLabel>
            </>
          ) : null}

          <FormLabel
            title={`Photos (${photoUris.length}/${PROPERTY_SEAL_MAX_PHOTOS})`}
            required={isDeseal}
            hint={
              isDeseal
                ? 'Required. Add a picture field with +, then take or pick a photo for that row.'
                : 'Optional. Add a picture field with +, then take or pick a photo for that row.'
            }>
            {photoSlots.map((slot, index) => (
              <View key={slot.id} style={styles.photoRow}>
                <View style={styles.photoRowHeader}>
                  <Text style={styles.photoRowTitle}>Picture {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removePhotoSlot(slot.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove picture ${index + 1}`}>
                    <Icon source="close-circle" size={22} color={colors.danger} />
                  </TouchableOpacity>
                </View>
                {slot.uri ? (
                  <Image source={{uri: slot.uri}} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.helper}>No picture in this field yet.</Text>
                )}
                <PhotoPickerButtons
                  disabled={capturingPhoto}
                  onCamera={() => void pickPhotoForSlot(slot.id, true)}
                  onGallery={() => void pickPhotoForSlot(slot.id, false)}
                  cameraLabel="Take photo"
                  galleryLabel="From gallery"
                />
              </View>
            ))}
            <TouchableOpacity
              style={[
                styles.addPhotoButton,
                photoSlots.length >= PROPERTY_SEAL_MAX_PHOTOS || capturingPhoto
                  ? styles.addPhotoButtonDisabled
                  : null,
              ]}
              onPress={addPhotoSlot}
              disabled={photoSlots.length >= PROPERTY_SEAL_MAX_PHOTOS || capturingPhoto}
              accessibilityRole="button"
              accessibilityLabel="Add picture field">
              <Icon source="plus" size={20} color="#ffffff" />
              <Text style={styles.addPhotoButtonText}>Add picture</Text>
            </TouchableOpacity>
          </FormLabel>

          <FormLabel title="Final remarks" required>
            <TextInput
              style={[styles.input, formStyles.notesInput, remarksFocused && styles.inputFocused]}
              onFocus={() => setRemarksFocused(true)}
              onBlur={() => setRemarksFocused(false)}
              multiline
              value={finalRemarks}
              onChangeText={setFinalRemarks}
              placeholder={
                isDeseal ? 'Summary of this Property Deseal' : 'Summary of this Property Seal'
              }
              accessibilityLabel="Final remarks"
            />
          </FormLabel>

          <TouchableOpacity
            style={[styles.saveButton, canSave ? styles.saveButtonEnabled : styles.saveButtonDisabled]}
            disabled={!canSave}
            onPress={() => {
              hapticMedium();
              void handleSave();
            }}
            accessibilityState={{disabled: !canSave, busy: saving}}>
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isDeseal ? 'Save Property Deseal' : 'Save Property Seal'}
              </Text>
            )}
          </TouchableOpacity>

          <GpsDebugPanel title="Property Seal GPS debug (dev)" />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...screenContentPadding(16, 24),
    paddingTop: 14,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  header: {fontSize: 20, fontWeight: '700', color: colors.primary},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 0,
  },
  officerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0f8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 4,
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
  helper: {fontSize: 12, color: colors.mutedText, marginTop: 8, lineHeight: 17},
  photoRow: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#c5d0de',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  photoRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  photoRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  photoPreview: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },
  addPhotoButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addPhotoButtonDisabled: {
    opacity: 0.65,
  },
  addPhotoButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 6,
  },
  activityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {backgroundColor: colors.primary},
  chipInactive: {backgroundColor: '#e5e7eb'},
  chipText: {fontSize: 13, color: colors.text, fontWeight: '600'},
  chipTextActive: {color: '#ffffff'},
  saveButton: {
    marginTop: 24,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonEnabled: {backgroundColor: colors.primary},
  saveButtonDisabled: {backgroundColor: '#9ca3af'},
  saveButtonText: {color: '#ffffff', fontWeight: '600'},
});
