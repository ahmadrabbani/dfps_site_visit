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
import {Icon} from 'react-native-paper';
import {useQuery} from '@tanstack/react-query';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {FormLabel} from '../components/FormLabel';
import PhotoPickerButtons from '../components/PhotoPickerButtons';
import {colors} from '../theme/colors';
import {formStyles} from '../theme/formStyles';
import {screenContentPadding} from '../theme/screenLayout';
import {CC_FLOOR_OPTIONS, CC_UNITS, CC_VIOLATION_REMARKS_MAX} from '../constants/ccSurvey';
import {queryKeys} from '../queries/queryKeys';
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
  const [widthFocused, setWidthFocused] = useState(false);
  const [lengthFocused, setLengthFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const insets = useSafeAreaInsets();

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
    queryKey: queryKeys.violationTypes(scope),
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
        <Text style={styles.header}>Add violation</Text>

        <FormLabel title="Plot category" first>
          <View style={formStyles.plotCategoryRow}>
            {scopes.map(option => {
              const selected = option.value === scope;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  style={[
                    formStyles.plotCategoryChip,
                    selected ? formStyles.plotCategoryChipActive : formStyles.plotCategoryChipInactive,
                  ]}
                  onPress={() => onScopeChange(option.value)}>
                  <Text
                    style={[
                      formStyles.plotCategoryChipText,
                      selected ? formStyles.plotCategoryChipTextActive : null,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FormLabel>

        <FormLabel title="Violation type" required hint="Choose the violation observed on site.">
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
        </FormLabel>

        <FormLabel title="Measurement unit" required>
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
        </FormLabel>

        <View style={styles.dimensionRow}>
          <View style={styles.dimensionCol}>
            <FormLabel title="Width" compact>
              <TextInput
                style={[styles.input, widthFocused && styles.inputFocused]}
                onFocus={() => setWidthFocused(true)}
                onBlur={() => setWidthFocused(false)}
                keyboardType="decimal-pad"
                value={width}
                onChangeText={setWidth}
                placeholder="0.00"
                returnKeyType="next"
                accessibilityLabel="Width input"
                accessibilityHint="Enter the width of the violation"
              />
            </FormLabel>
          </View>
          <View style={styles.dimensionCol}>
            <FormLabel title="Length" compact>
              <TextInput
                style={[styles.input, lengthFocused && styles.inputFocused]}
                onFocus={() => setLengthFocused(true)}
                onBlur={() => setLengthFocused(false)}
                keyboardType="decimal-pad"
                value={length}
                onChangeText={setLength}
                placeholder="0.00"
                returnKeyType="done"
                accessibilityLabel="Length input"
                accessibilityHint="Enter the length of the violation"
              />
            </FormLabel>
          </View>
        </View>

        <FormLabel title="Building floor" required>
          <TouchableOpacity style={styles.selectField} onPress={() => setFloorPickerOpen(true)}>
            <Text style={styles.selectFieldText}>{floorLabel(floorLabelValue)}</Text>
          </TouchableOpacity>
        </FormLabel>

        <FormLabel
          title="Violation photo (local only)"
          hint="Optional. One photo for this violation — saved on your device with the visit. It is not uploaded as main_image. Use Site sketch on the DFPS Site Visit screen for the photo sent to the server.">
          <PhotoPickerButtons
            disabled={capturingPhoto}
            onCamera={() => pickPhoto(true)}
            onGallery={() => pickPhoto(false)}
            cameraLabel="Take photo"
            galleryLabel="From gallery"
            cameraAccessibilityLabel="Take violation photo with camera"
            galleryAccessibilityLabel="Choose violation photo from gallery"
          />
          <Text style={styles.photoMeta}>
            {photoUri
              ? 'Violation photo attached (local copy)'
              : 'No violation photo — optional, stored on device only'}
          </Text>
          {photoUri ? <Image source={{uri: photoUri}} style={styles.photoPreview} /> : null}
        </FormLabel>

        <FormLabel
          title={`Notes (${notes.length}/${CC_VIOLATION_REMARKS_MAX})`}
          hint="Optional short description of this violation.">
          <TextInput
            style={[styles.input, formStyles.notesInput, notesFocused && styles.inputFocused]}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
            multiline
            value={notes}
            maxLength={CC_VIOLATION_REMARKS_MAX}
            onChangeText={setNotes}
            placeholder={`Up to ${CC_VIOLATION_REMARKS_MAX} characters`}
            accessibilityLabel="Violation notes input"
            accessibilityHint="Optional description of the observed violation"
          />
        </FormLabel>

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
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Select Violation</Text>
            <TouchableOpacity style={styles.modalCloseHeader} onPress={() => setViolationPickerOpen(false)}>
              <Icon source="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            style={styles.modalList}
            contentContainerStyle={styles.modalListContent}
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
          <TouchableOpacity
            style={[styles.modalClose, {marginBottom: Math.max(insets.bottom, 16) + 8}]}
            onPress={() => setViolationPickerOpen(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={floorPickerOpen} animationType="slide" onRequestClose={() => setFloorPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Select Floor</Text>
            <TouchableOpacity style={styles.modalCloseHeader} onPress={() => setFloorPickerOpen(false)}>
              <Icon source="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            style={styles.modalList}
            contentContainerStyle={styles.modalListContent}
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
          <TouchableOpacity
            style={[styles.modalClose, {marginBottom: Math.max(insets.bottom, 16) + 8}]}
            onPress={() => setFloorPickerOpen(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  container: {...screenContentPadding(16, 32), flexGrow: 1},
  header: {fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 4},
  selectField: {
    borderWidth: 1,
    borderColor: '#c5d0de',
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
  smallButtonDisabled: {opacity: 0.7},
  smallButtonText: {color: '#ffffff', fontSize: 12, fontWeight: '600'},
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 8,
  },
  actionButton: {flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center'},
  cancel: {backgroundColor: '#e5e7eb', marginRight: 8},
  save: {backgroundColor: colors.primary, marginLeft: 8},
  actionText: {fontWeight: '600', color: colors.text},
  actionTextOnPrimary: {color: '#ffffff'},
  modalRoot: {flex: 1, backgroundColor: colors.background, paddingTop: 48, paddingHorizontal: 16},
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  modalTitle: {fontSize: 18, fontWeight: '700', color: colors.primary, flex: 1, paddingRight: 12},
  modalCloseHeader: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  modalList: {flex: 1},
  modalListContent: {paddingBottom: 8},
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
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalCloseText: {color: '#ffffff', fontWeight: '700', fontSize: 16},
});
