import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {launchCamera} from 'react-native-image-picker';
import {colors} from '../theme/colors';
import {CC_FLOOR_OPTIONS, CC_UNITS, CC_VIOLATION_REMARKS_MAX} from '../constants/ccSurvey';
import {fetchViolationTypes, type PenaltyCategory, type PenaltyType} from '../services/api';
import {notifyInfo, notifySuccess} from '../utils/notify';
import type {SiteVisitViolation} from '../services/storage';
import type {SiteScope} from '../types/app';

interface ViolationFormScreenProps {
  scope: SiteScope;
  onScopeChange: (scope: SiteScope) => void;
  onSave: (violation: SiteVisitViolation) => void;
  onCancel: () => void;
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
  const [area, setArea] = useState('');
  const [notes, setNotes] = useState('');
  const [floorLabel, setFloorLabel] = useState<string>(CC_FLOOR_OPTIONS[2]);
  const [unit, setUnit] = useState<string>(CC_UNITS[0].value);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
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
    if (typeOption.categories.length > 0) {
      setSelectedCategory(typeOption.categories[0]);
    } else {
      setSelectedCategory(null);
    }
  };

  const handleSelectCategory = (category: PenaltyCategory) => {
    setSelectedCategory(category);
  };

  const calculatedArea = useMemo(() => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    if (!Number.isNaN(l) && !Number.isNaN(w)) {
      return l * w;
    }
    return null;
  }, [length, width]);

  const handleCalculateArea = useCallback(() => {
    if (calculatedArea != null) {
      setArea(String(calculatedArea));
      notifyInfo('Area calculated.');
      return;
    }
    notifyInfo('Enter valid length and width first.');
  }, [calculatedArea]);

  const showCategoryTable =
    !!selectedType &&
    selectedType.categories.some(cat => cat.penaltyRate != null || cat.tokenFee != null);

  const handleSave = () => {
    if (!selectedType) {
      Alert.alert('Select violation', 'Please choose a violation type.');
      return;
    }
    const category =
      selectedCategory ||
      (selectedType.categories.length === 1 ? selectedType.categories[0] : null);
    if (!category) {
      Alert.alert('Select violation', 'Please choose a violation type and category.');
      return;
    }
    if (!category.isFixedAmount && !area) {
      Alert.alert('Area required', 'Enter an area or calculate it for this violation.');
      return;
    }
    const v: SiteVisitViolation = {
      violationTypeId: selectedType.id,
      violationCategoryId: category.id,
      typeLabel: selectedType.name,
      categoryLabel: category.name,
      floorLabel,
      unit,
      length: length ? parseFloat(length) : null,
      width: width ? parseFloat(width) : null,
      area: area ? parseFloat(area) : null,
      notes: notes.slice(0, CC_VIOLATION_REMARKS_MAX),
      photoUri,
    };
    notifySuccess('Violation added to this visit.');
    onSave(v);
  };

  const handleCapturePhoto = async () => {
    setCapturingPhoto(true);
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        includeBase64: false,
        saveToPhotos: false,
        quality: 0.7,
        maxWidth: 1280,
        maxHeight: 1280,
      });

      if (result.didCancel) {
        notifyInfo('Photo capture cancelled.');
        return;
      }

      if (result.errorCode || result.errorMessage) {
        const msg = result.errorMessage || result.errorCode || 'Unable to capture photo.';
        Alert.alert('Camera error', msg);
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Photo missing', 'Photo was captured, but image data is unavailable.');
        return;
      }

      setPhotoUri(asset.uri);
      notifySuccess('Photo attached to this violation.');
    } finally {
      setCapturingPhoto(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Add Violation</Text>
      <View style={styles.scopeToggle}>
        <Text style={styles.subHeader}>Penalty Schedule</Text>
        <View style={styles.scopeButtons}>
          {scopes.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.scopeButton,
                option.value === scope ? styles.scopeButtonActive : styles.scopeButtonInactive,
              ]}
              onPress={() => onScopeChange(option.value)}>
              <Text
                style={[
                  styles.scopeButtonText,
                  option.value === scope ? styles.scopeButtonTextActive : null,
                ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Text style={styles.label}>Violation Type</Text>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loaderText}>Loading penalty table...</Text>
        </View>
      ) : error ? (
        <View style={styles.loader}>
          <Text style={styles.errorText}>{(error as Error)?.message || 'Failed to load penalties.'}</Text>
          <TouchableOpacity style={styles.smallButton} onPress={() => refetch()}>
            <Text style={styles.smallButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.typeList}>
            {penaltyTypes.map(pt => (
              <TouchableOpacity
                key={pt.id}
                style={[
                  styles.typeRowItem,
                  pt.id === (selectedType ? selectedType.id : null)
                    ? styles.typeRowItemActive
                    : styles.typeRowItemInactive,
                ]}
                onPress={() => handleSelectType(pt)}>
                <Text
                  style={[
                    styles.typeRowText,
                    pt.id === (selectedType ? selectedType.id : null)
                      ? styles.typeRowTextActive
                      : null,
                  ]}>
                  {pt.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedType && showCategoryTable ? (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.cellCategory]}>Category</Text>
                <Text style={[styles.tableCell, styles.cellRate]}>Penalty</Text>
                <Text style={[styles.tableCell, styles.cellRate]}>Token Fee</Text>
              </View>
              {selectedType.categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.tableRow,
                    styles.tableDataRow,
                    selectedCategory && cat.id === selectedCategory.id ? styles.tableRowActive : null,
                  ]}
                  onPress={() => handleSelectCategory(cat)}>
                  <Text style={[styles.tableCell, styles.cellCategory]}>{cat.name}</Text>
                  <Text style={[styles.tableCell, styles.cellRate]}>{cat.penaltyRate}</Text>
                  <Text style={[styles.tableCell, styles.cellRate]}>{cat.tokenFee ? cat.tokenFee : '-'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No categories defined for this type.</Text>
          )}
        </>
      )}

      <Text style={styles.label}>Floor *</Text>
      <View style={styles.chipRow}>
        {CC_FLOOR_OPTIONS.map(floor => (
          <TouchableOpacity
            key={floor}
            style={[styles.chip, floorLabel === floor ? styles.chipActive : styles.chipInactive]}
            onPress={() => setFloorLabel(floor)}>
            <Text style={[styles.chipText, floorLabel === floor ? styles.chipTextActive : null]}>
              {floor}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

      <Text style={styles.label}>Length</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={length} onChangeText={setLength} />

      <Text style={styles.label}>Width</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={width} onChangeText={setWidth} />

      <TouchableOpacity style={styles.smallButton} onPress={handleCalculateArea}>
        <Text style={styles.smallButtonText}>Calculate Area</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Area (sq.ft)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={area} onChangeText={setArea} />

      <Text style={styles.label}>Remarks ({notes.length}/{CC_VIOLATION_REMARKS_MAX})</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        multiline
        value={notes}
        maxLength={CC_VIOLATION_REMARKS_MAX}
        onChangeText={setNotes}
        placeholder={`Max ${CC_VIOLATION_REMARKS_MAX} characters`}
      />

      <Text style={styles.label}>Photo Evidence</Text>
      <TouchableOpacity
        style={[styles.smallButton, capturingPhoto ? styles.smallButtonDisabled : null]}
        onPress={handleCapturePhoto}
        disabled={capturingPhoto}>
        <Text style={styles.smallButtonText}>
          {capturingPhoto ? 'Opening camera...' : photoUri ? 'Retake Photo' : 'Take Photo'}
        </Text>
      </TouchableOpacity>
      {photoUri ? (
        <Text style={styles.photoMeta}>Photo will upload with the survey.</Text>
      ) : (
        <Text style={styles.photoMeta}>Optional: capture a photo for evidence.</Text>
      )}
      {photoUri ? <Image source={{uri: photoUri}} style={styles.photoPreview} /> : null}

      <View style={styles.row}>
        <TouchableOpacity style={[styles.actionButton, styles.cancel]} onPress={onCancel}>
          <Text style={styles.actionText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.save]} onPress={handleSave}>
          <Text style={[styles.actionText, styles.actionTextOnPrimary]}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, backgroundColor: colors.background, flexGrow: 1},
  header: {fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 16},
  subHeader: {fontSize: 13, color: colors.mutedText, marginBottom: 8},
  scopeToggle: {marginBottom: 8},
  scopeButtons: {flexDirection: 'row'},
  scopeButton: {paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, marginRight: 10},
  scopeButtonActive: {backgroundColor: colors.primary},
  scopeButtonInactive: {backgroundColor: '#e5e7eb'},
  scopeButtonText: {fontSize: 12, color: colors.text},
  scopeButtonTextActive: {color: '#ffffff'},
  label: {fontSize: 13, color: colors.mutedText, marginTop: 12},
  input: {borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginTop: 4, backgroundColor: '#ffffff'},
  notesInput: {height: 80},
  typeList: {marginTop: 8},
  typeRowItem: {paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6},
  typeRowItemActive: {backgroundColor: colors.primary},
  typeRowItemInactive: {backgroundColor: '#e5e7eb'},
  typeRowText: {fontSize: 13, color: colors.text},
  typeRowTextActive: {color: '#ffffff'},
  table: {marginTop: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden'},
  tableRow: {flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8},
  tableHeader: {backgroundColor: '#f3f4f6'},
  tableDataRow: {backgroundColor: '#ffffff'},
  tableRowActive: {backgroundColor: '#e0edff'},
  tableCell: {fontSize: 12, color: colors.text},
  cellCategory: {flex: 2},
  cellRate: {flex: 1, textAlign: 'right'},
  emptyText: {fontSize: 12, color: colors.mutedText, marginTop: 8},
  smallButton: {marginTop: 8, alignSelf: 'flex-start', backgroundColor: colors.primaryLight, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8},
  smallButtonDisabled: {opacity: 0.7},
  smallButtonText: {color: '#ffffff', fontSize: 12},
  photoMeta: {fontSize: 12, color: colors.mutedText, marginTop: 8},
  photoPreview: {
    width: '100%',
    height: 180,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  loader: {marginTop: 20, alignItems: 'center'},
  loaderText: {marginTop: 8, fontSize: 12, color: colors.mutedText},
  errorText: {fontSize: 12, color: colors.danger, textAlign: 'center'},
  row: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 24},
  actionButton: {flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center'},
  cancel: {backgroundColor: '#e5e7eb', marginRight: 8},
  save: {backgroundColor: colors.primary, marginLeft: 8},
  actionText: {fontWeight: '600', color: colors.text},
  actionTextOnPrimary: {color: '#ffffff'},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 4},
  chip: {paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, marginBottom: 8},
  chipActive: {backgroundColor: colors.primary},
  chipInactive: {backgroundColor: '#e5e7eb'},
  chipText: {fontSize: 12, color: colors.text},
  chipTextActive: {color: '#ffffff'},
});
