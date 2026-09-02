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
import {useQuery} from '@tanstack/react-query';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {FormLabel} from '../components/FormLabel';
import GpsLocationCard from '../components/GpsLocationCard';
import LookupSelect from '../components/LookupSelect';
import PhotoPickerButtons from '../components/PhotoPickerButtons';
import {CEILING_ACTIVITIES, CEILING_MAX_PHOTOS, PROPERTY_SEAL_TITLE} from '../constants/ceilingInvestigation';
import {useSiteVisitGps} from '../hooks/useSiteVisitGps';
import {queryKeys} from '../queries/queryKeys';
import {addCeilingInvestigationVisit} from '../services/ceilingStorage';
import {fetchBlocks, fetchPhases, fetchPlots, fetchSchemes} from '../services/plotBank';
import type {SessionUser} from '../services/api';
import {colors} from '../theme/colors';
import {formStyles} from '../theme/formStyles';
import {screenContentPadding} from '../theme/screenLayout';
import {notifySuccess} from '../utils/notify';

interface CeilingInvestigationScreenProps {
  user: SessionUser;
  locationPrepared?: boolean;
  onSaved: () => void;
}

interface PhotoSlot {
  id: string;
  uri: string | null;
}

export default function CeilingInvestigationScreen({
  user,
  locationPrepared = false,
  onSaved,
}: CeilingInvestigationScreenProps) {
  const gps = useSiteVisitGps(locationPrepared);
  const [scheme, setScheme] = useState('');
  const [phase, setPhase] = useState('');
  const [block, setBlock] = useState('');
  const [plotId, setPlotId] = useState('');
  const [plotLabel, setPlotLabel] = useState('');
  const [activityValue, setActivityValue] = useState('');
  const [finalRemarks, setFinalRemarks] = useState('');
  const photoIdRef = useRef(1);
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([{id: 'slot-1', uri: null}]);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remarksFocused, setRemarksFocused] = useState(false);

  const schemesQuery = useQuery({
    queryKey: queryKeys.plotSchemes,
    queryFn: fetchSchemes,
    staleTime: 10 * 60 * 1000,
  });
  const phasesQuery = useQuery({
    queryKey: queryKeys.plotPhases(scheme),
    queryFn: () => fetchPhases(scheme),
    enabled: Boolean(scheme),
    staleTime: 10 * 60 * 1000,
  });
  const blocksQuery = useQuery({
    queryKey: queryKeys.plotBlocks(scheme, phase),
    queryFn: () => fetchBlocks(scheme, phase),
    enabled: Boolean(scheme && phase),
    staleTime: 10 * 60 * 1000,
  });
  const plotsQuery = useQuery({
    queryKey: queryKeys.plotPlots(scheme, phase, block),
    queryFn: () => fetchPlots(scheme, phase, block),
    enabled: Boolean(scheme && phase && block),
    staleTime: 10 * 60 * 1000,
  });

  const selectedActivity = useMemo(
    () => CEILING_ACTIVITIES.find(item => item.value === activityValue) || null,
    [activityValue],
  );

  const photoUris = useMemo(
    () => photoSlots.map(slot => slot.uri).filter((uri): uri is string => Boolean(uri)),
    [photoSlots],
  );

  const canSave =
    gps.gpsAllowed &&
    gps.currentLat != null &&
    gps.currentLng != null &&
    scheme.trim().length > 0 &&
    plotLabel.trim().length > 0 &&
    Boolean(activityValue) &&
    finalRemarks.trim().length > 0 &&
    !saving;

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
    if (photoSlots.length >= CEILING_MAX_PHOTOS) {
      Alert.alert('Photo limit', `You can attach up to ${CEILING_MAX_PHOTOS} photos.`);
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
    if (!canSave || gps.currentLat == null || gps.currentLng == null || !selectedActivity) {
      Alert.alert(
        'Incomplete form',
        'GPS, scheme, plot, activity, and final remarks are required before saving.',
      );
      return;
    }
    setSaving(true);
    try {
      await addCeilingInvestigationVisit({
        localId: `ci-${Date.now()}`,
        officerId: user.id,
        officerName: user.name,
        scheme: scheme.trim(),
        phase: phase.trim(),
        block: block.trim(),
        plot: plotLabel.trim(),
        activityValue: selectedActivity.value,
        activityLabel: selectedActivity.label,
        finalRemarks: finalRemarks.trim(),
        photoUris,
        lat: gps.currentLat,
        lng: gps.currentLng,
        savedAt: new Date().toISOString(),
      });
      notifySuccess('Property Seal saved on this device.');
      onSaved();
    } catch {
      Alert.alert('Could not save', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>{PROPERTY_SEAL_TITLE}</Text>
      <View style={styles.officerContainer}>
        <Icon source="account-circle" size={24} color={colors.primary} />
        <Text style={styles.officerLabel}>
          Officer: <Text style={styles.officerName}>{user.name}</Text>
        </Text>
      </View>

      <FormLabel
        title="Scheme"
        required
        first
        hint="Loaded from the housing portal plot bank. Pick a scheme first.">
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

      <FormLabel title="Phase" hint="Fills after you pick a scheme.">
        <LookupSelect
          title="Select phase"
          placeholder={scheme ? 'Select phase' : 'Select a scheme first'}
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

      <FormLabel title="Block" hint="Fills after you pick a phase.">
        <LookupSelect
          title="Select block"
          placeholder={phase ? 'Select block' : 'Select a phase first'}
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

      <FormLabel title="Plot" required hint="Fills after you pick a block.">
        <LookupSelect
          title="Select plot"
          placeholder={block ? 'Select plot' : 'Select a block first'}
          value={plotId}
          options={plotsQuery.data ?? []}
          loading={plotsQuery.isFetching}
          disabled={!block}
          error={plotsQuery.error ? (plotsQuery.error as Error).message : null}
          onRetry={() => void plotsQuery.refetch()}
          onSelect={option => {
            setPlotId(option.value);
            setPlotLabel(option.label);
          }}
          accessibilityLabel="Plot"
        />
      </FormLabel>

      <FormLabel title="Location" required hint="Same GPS capture as Completion Certificate site visit.">
        <GpsLocationCard
          gpsAllowed={gps.gpsAllowed}
          gpsLoading={gps.gpsLoading}
          gpsError={gps.gpsError}
          gpsPermissionDenied={gps.gpsPermissionDenied}
          currentLat={gps.currentLat}
          currentLng={gps.currentLng}
          needsPermissionPrompt={gps.needsPermissionPrompt}
          onGetLocation={() => void gps.handleGetLocation()}
          onRetryGps={() => gps.startLocationFlow(false)}
          onOpenSettings={gps.handleOpenLocationSettings}
        />
      </FormLabel>

      <FormLabel
        title={`Photos (${photoUris.length}/${CEILING_MAX_PHOTOS})`}
        hint="Optional. Add a picture field with +, then take or pick a photo for that row.">
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
            photoSlots.length >= CEILING_MAX_PHOTOS || capturingPhoto ? styles.addPhotoButtonDisabled : null,
          ]}
          onPress={addPhotoSlot}
          disabled={photoSlots.length >= CEILING_MAX_PHOTOS || capturingPhoto}
          accessibilityRole="button"
          accessibilityLabel="Add picture field">
          <Icon source="plus" size={20} color="#ffffff" />
          <Text style={styles.addPhotoButtonText}>Add picture</Text>
        </TouchableOpacity>
      </FormLabel>

      <FormLabel
        title="Activity"
        required
        hint="Enforcement activity from the housing portal (FIR, demolition, sealing, stay orders, notices).">
        <View style={styles.activityWrap}>
          {CEILING_ACTIVITIES.map(item => {
            const selected = item.value === activityValue;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.chip, selected ? styles.chipActive : styles.chipInactive]}
                onPress={() => setActivityValue(item.value)}
                accessibilityRole="button"
                accessibilityState={{selected}}>
                <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </FormLabel>

      <FormLabel title="Final remarks" required>
        <TextInput
          style={[styles.input, formStyles.notesInput, remarksFocused && styles.inputFocused]}
          onFocus={() => setRemarksFocused(true)}
          onBlur={() => setRemarksFocused(false)}
          multiline
          value={finalRemarks}
          onChangeText={setFinalRemarks}
          placeholder="Summary of this Property Seal"
          accessibilityLabel="Final remarks"
        />
      </FormLabel>

      <TouchableOpacity
        style={[styles.saveButton, canSave ? styles.saveButtonEnabled : styles.saveButtonDisabled]}
        disabled={!canSave}
        onPress={() => void handleSave()}
        accessibilityState={{disabled: !canSave, busy: saving}}>
        {saving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Property Seal</Text>
        )}
      </TouchableOpacity>
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
