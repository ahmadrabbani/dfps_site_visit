import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {colors} from '../theme/colors';
import {CC_FLOOR_OPTIONS, CC_UNITS, CC_VIOLATION_REMARKS_MAX} from '../constants/ccSurvey';
import {fetchViolationTypes, type PenaltyCategory, type PenaltyType} from '../services/api';
import {notifySuccess} from '../utils/notify';
import type {SiteVisitViolation} from '../services/storage';
import type {SiteScope} from '../types/app';

interface ViolationFormScreenProps {
  scope: SiteScope;
  onScopeChange: (scope: SiteScope) => void;
  onSave: (violation: SiteVisitViolation) => void;
  onCancel: () => void;
}

const FLOOR_LABELS: Record<string, string> = {
  B2: 'Basement 2',
  B1: 'Basement 1',
  GF: 'Ground Floor',
};

function floorLabel(floor: string): string {
  return FLOOR_LABELS[floor] ?? floor;
}

export default function ViolationFormScreen({
  scope,
  onScopeChange,
  onSave,
  onCancel,
}: ViolationFormScreenProps) {
  const [selectedType, setSelectedType] = useState<PenaltyType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PenaltyCategory | null>(null);
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [notes, setNotes] = useState('');
  const [floorLabelValue, setFloorLabelValue] = useState<string>(CC_FLOOR_OPTIONS[0]);
  const [unit, setUnit] = useState<string>(CC_UNITS[0].value);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [violationPickerOpen, setViolationPickerOpen] = useState(false);
  const [floorPickerOpen, setFloorPickerOpen] = useState(false);

  const scopes: Array<{label: string; value: SiteScope}> = [
    {label: 'Residential', value: 'residential'},
    {label: 'Commercial', value: 'commercial'},
  ];

  const {
    data: penaltyTypes = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['violationTypes', scope],
    queryFn: () => fetchViolationTypes(scope),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (!penaltyTypes.length) {
      setSelectedType(null);
      return;
    }
    setSelectedType(prev => penaltyTypes.find(pt => pt.id === prev?.id) || penaltyTypes[0]);
  }, [penaltyTypes]);

  useEffect(() => {
    if (!selectedType) {
      setSelectedCategory(null);
      return;
    }
    setSelectedCategory(
      prev => selectedType.categories.find(cat => cat.id === prev?.id) || selectedType.categories[0] || null,
    );
  }, [selectedType]);

  const handleSelectType = (typeOption: PenaltyType) => {
    setSelectedType(typeOption);
    setSelectedCategory(typeOption.categories[0] || null);
    setViolationPickerOpen(false);
  };

  const handleSave = () => {
    if (!selectedType) {
      Alert.alert('Select violation', 'Please choose a violation type.');
      return;
    }
    const category =
      selectedCategory ||
      (selectedType.categories.length === 1 ? selectedType.categories[0] : null);
    if (!category) {
      Alert.alert('Select violation', 'Please choose a violation type.');
      return;
    }

    const lengthNum = length ? parseFloat(length) : null;
    const widthNum = width ? parseFloat(width) : null;
    let areaNum: number | null = null;
    if (lengthNum != null && widthNum != null && Number.isFinite(lengthNum) && Number.isFinite(widthNum)) {
      areaNum = lengthNum * widthNum;
    }

    const v: SiteVisitViolation = {
      violationTypeId: selectedType.id,
      violationCategoryId: category.id,
      typeLabel: selectedType.name,
      categoryLabel: category.name,
      floorLabel: floorLabelValue,
      unit,
      length: lengthNum,
      width: widthNum,
      area: areaNum,
      notes: notes.slice(0, CC_VIOLATION_REMARKS_MAX),
      photoUri,
    };
    notifySuccess('Violation added to this visit.');
    onSave(v);
  };

  const pickPhoto = async (useCamera: boolean) => {
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
      if (result.errorCode || result.errorMessage) {
        Alert.alert('Image error', result.errorMessage || result.errorCode || 'Could not open image.');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Image missing', 'Could not read the selected image.');
        return;
      }
      setPhotoUri(asset.uri);
      notifySuccess('Violation image attached.');
    } finally {
      setCapturingPhoto(false);
    }
  };

  const violationPickerTitle = useMemo(() => {
    if (loading) {
      return 'Loading violations...';
    }
    if (error) {
      return 'Could not load violations';
    }
    return selectedType?.name || 'Tap to select violation';
  }, [loading, error, selectedType]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator>
        <Text style={styles.header}>Violation</Text>

        <Text style={styles.label}>Plot category</Text>
        <View style={styles.chipRow}>
          {scopes.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.chip,
                option.value === scope ? styles.chipActive : styles.chipInactive,
              ]}
              onPress={() => onScopeChange(option.value)}>
              <Text style={[styles.chipText, option.value === scope ? styles.chipTextActive : null]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Select Violation *</Text>
        <TouchableOpacity
          style={[styles.selectField, (loading || error) && styles.selectFieldDisabled]}
          disabled={loading}
          onPress={() => {
            if (error) {
              void refetch();
              return;
            }
            if (!penaltyTypes.length) {
              Alert.alert('No violations', 'No violation types returned for this category.');
              return;
            }
            setViolationPickerOpen(true);
          }}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.selectFieldText} numberOfLines={3}>
              {error ? 'Tap to retry loading violations' : violationPickerTitle}
            </Text>
          )}
        </TouchableOpacity>
        {error ? (
          <TouchableOpacity style={styles.smallButton} onPress={() => refetch()}>
            <Text style={styles.smallButtonText}>Retry violations</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.label}>Unit *</Text>
        <View style={styles.chipRow}>
          {CC_UNITS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, unit === option.value ? styles.chipActive : styles.chipInactive]}
              onPress={() => setUnit(option.value)}>
              <Text style={[styles.chipText, unit === option.value ? styles.chipTextActive : null]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dimensionRow}>
          <View style={styles.dimensionCol}>
            <Text style={styles.label}>Width</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={width}
              onChangeText={setWidth}
              placeholder="0.00"
            />
          </View>
          <View style={styles.dimensionCol}>
            <Text style={styles.label}>Length</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={length}
              onChangeText={setLength}
              placeholder="0.00"
            />
          </View>
        </View>

        <Text style={styles.label}>Floor *</Text>
        <TouchableOpacity style={styles.selectField} onPress={() => setFloorPickerOpen(true)}>
          <Text style={styles.selectFieldText}>{floorLabel(floorLabelValue)}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Violation Image</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.smallButton, capturingPhoto ? styles.smallButtonDisabled : null]}
            disabled={capturingPhoto}
            onPress={() => pickPhoto(true)}>
            <Text style={styles.smallButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.secondaryButton, capturingPhoto ? styles.smallButtonDisabled : null]}
            disabled={capturingPhoto}
            onPress={() => pickPhoto(false)}>
            <Text style={[styles.smallButtonText, styles.secondaryButtonText]}>Browse</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.photoMeta}>{photoUri ? 'Image attached' : 'No file chosen'}</Text>
        {photoUri ? <Image source={{uri: photoUri}} style={styles.photoPreview} /> : null}

        <Text style={styles.label}>
          Remarks ({notes.length}/{CC_VIOLATION_REMARKS_MAX})
        </Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          multiline
          value={notes}
          maxLength={CC_VIOLATION_REMARKS_MAX}
          onChangeText={setNotes}
          placeholder={`Max ${CC_VIOLATION_REMARKS_MAX} characters`}
        />

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, styles.cancel]} onPress={onCancel}>
            <Text style={styles.actionText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.save]} onPress={handleSave}>
            <Text style={[styles.actionText, styles.actionTextOnPrimary]}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={violationPickerOpen} animationType="slide" onRequestClose={() => setViolationPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <Text style={styles.modalTitle}>Select Violation</Text>
          <FlatList
            data={penaltyTypes}
            keyExtractor={item => String(item.id)}
            renderItem={({item}) => (
              <Pressable
                style={[
                  styles.modalRow,
                  selectedType?.id === item.id ? styles.modalRowActive : null,
                ]}
                onPress={() => handleSelectType(item)}>
                <Text
                  style={[
                    styles.modalRowText,
                    selectedType?.id === item.id ? styles.modalRowTextActive : null,
                  ]}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
          <TouchableOpacity style={styles.modalClose} onPress={() => setViolationPickerOpen(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={floorPickerOpen} animationType="slide" onRequestClose={() => setFloorPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <Text style={styles.modalTitle}>Select Floor</Text>
          <FlatList
            data={CC_FLOOR_OPTIONS}
            keyExtractor={item => item}
            renderItem={({item}) => (
              <Pressable
                style={[
                  styles.modalRow,
                  floorLabelValue === item ? styles.modalRowActive : null,
                ]}
                onPress={() => {
                  setFloorLabelValue(item);
                  setFloorPickerOpen(false);
                }}>
                <Text
                  style={[
                    styles.modalRowText,
                    floorLabelValue === item ? styles.modalRowTextActive : null,
                  ]}>
                  {floorLabel(item)}
                </Text>
              </Pressable>
            )}
          />
          <TouchableOpacity style={styles.modalClose} onPress={() => setFloorPickerOpen(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  container: {padding: 16, paddingBottom: 32, flexGrow: 1},
  header: {fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 8},
  label: {fontSize: 13, color: colors.mutedText, marginTop: 12, marginBottom: 6},
  selectField: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    minHeight: 48,
    justifyContent: 'center',
  },
  selectFieldDisabled: {opacity: 0.7},
  selectFieldText: {fontSize: 14, color: colors.text},
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: colors.text,
  },
  notesInput: {minHeight: 80, textAlignVertical: 'top'},
  dimensionRow: {flexDirection: 'row'},
  dimensionCol: {flex: 1, marginRight: 8},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap'},
  chip: {paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginRight: 8, marginBottom: 8},
  chipActive: {backgroundColor: colors.primary},
  chipInactive: {backgroundColor: '#e5e7eb'},
  chipText: {fontSize: 13, color: colors.text},
  chipTextActive: {color: '#ffffff'},
  row: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 4},
  smallButton: {
    marginTop: 4,
    marginRight: 8,
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  secondaryButton: {backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.primaryLight},
  smallButtonDisabled: {opacity: 0.7},
  smallButtonText: {color: '#ffffff', fontSize: 12, fontWeight: '600'},
  secondaryButtonText: {color: colors.primaryLight},
  photoMeta: {fontSize: 12, color: colors.mutedText, marginTop: 6},
  photoPreview: {
    width: '100%',
    height: 160,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  actions: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 24},
  actionButton: {flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center'},
  cancel: {backgroundColor: '#e5e7eb', marginRight: 8},
  save: {backgroundColor: colors.primary, marginLeft: 8},
  actionText: {fontWeight: '600', color: colors.text},
  actionTextOnPrimary: {color: '#ffffff'},
  modalRoot: {flex: 1, backgroundColor: colors.background, paddingTop: 48, paddingHorizontal: 16},
  modalTitle: {fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 12},
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalRowActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  modalRowText: {fontSize: 14, color: colors.text},
  modalRowTextActive: {color: '#ffffff'},
  modalClose: {
    marginTop: 12,
    marginBottom: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {color: '#ffffff', fontWeight: '600'},
});
