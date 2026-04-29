import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {colors} from '../theme/colors';
import {fetchViolationTypes} from '../services/api';

export default function ViolationFormScreen({scope, onScopeChange, onSave, onCancel}) {
  const [penaltyTypes, setPenaltyTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [area, setArea] = useState('');
  const [notes, setNotes] = useState('');
  const [floorLabel, setFloorLabel] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const scopes = [
    {label: 'Residential', value: 'residential'},
    {label: 'Commercial', value: 'commercial'},
  ];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const types = await fetchViolationTypes(scope);
        if (!mounted) {
          return;
        }
        setPenaltyTypes(types);
        if (types.length > 0) {
          const defaultType = types[0];
          setSelectedType(defaultType);
          if (defaultType.categories.length > 0) {
            setSelectedCategory(defaultType.categories[0]);
            setFloorLabel(defaultType.categories[0].name);
          } else {
            setSelectedCategory(null);
            setFloorLabel('');
          }
        } else {
          setSelectedType(null);
          setSelectedCategory(null);
          setFloorLabel('');
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [scope, reloadKey]);

  useEffect(() => {
    if (selectedCategory) {
      setFloorLabel(selectedCategory.name);
    }
  }, [selectedCategory]);

  const handleSelectType = typeOption => {
    setSelectedType(typeOption);
    if (typeOption.categories.length > 0) {
      setSelectedCategory(typeOption.categories[0]);
    } else {
      setSelectedCategory(null);
    }
  };

  const handleSelectCategory = category => {
    setSelectedCategory(category);
  };

  const handleCalculateArea = () => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    if (!isNaN(l) && !isNaN(w)) {
      setArea(String(l * w));
    }
  };

  const handleSave = () => {
    if (!selectedType || !selectedCategory) {
      Alert.alert('Select violation', 'Please choose a violation type and category.');
      return;
    }
    if (!selectedCategory.isFixedAmount && !area) {
      Alert.alert('Area required', 'Enter an area or calculate it for this violation.');
      return;
    }
    const v = {
      violationTypeId: selectedType.id,
      violationCategoryId: selectedCategory.id,
      typeLabel: selectedType.name,
      categoryLabel: selectedCategory.name,
      floorLabel: floorLabel || selectedCategory.name,
      length: length ? parseFloat(length) : null,
      width: width ? parseFloat(width) : null,
      area: area ? parseFloat(area) : null,
      notes,
      photoBase64: null,
    };
    onSave(v);
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
                  option.value === scope ? {color: '#ffffff'} : null,
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
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.smallButton} onPress={() => setReloadKey(key => key + 1)}>
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
                      ? {color: '#ffffff'}
                      : null,
                  ]}>
                  {pt.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedType && selectedType.categories.length > 0 ? (
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
                    selectedCategory && cat.id === selectedCategory.id
                      ? styles.tableRowActive
                      : null,
                  ]}
                  onPress={() => handleSelectCategory(cat)}>
                  <Text style={[styles.tableCell, styles.cellCategory]}>{cat.name}</Text>
                  <Text style={[styles.tableCell, styles.cellRate]}>{cat.penaltyRate}</Text>
                  <Text style={[styles.tableCell, styles.cellRate]}>
                    {cat.tokenFee ? cat.tokenFee : '—'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No categories defined for this type.</Text>
          )}
        </>
      )}

      <Text style={styles.label}>Floor / Custom Label</Text>
      <TextInput style={styles.input} value={floorLabel} onChangeText={setFloorLabel} placeholder="e.g. Ground Floor" />

      <Text style={styles.label}>Length (ft)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={length}
        onChangeText={setLength}
      />

      <Text style={styles.label}>Width (ft)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={width}
        onChangeText={setWidth}
      />

      <TouchableOpacity style={styles.smallButton} onPress={handleCalculateArea}>
        <Text style={styles.smallButtonText}>Calculate Area</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Area (sq.ft)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={area}
        onChangeText={setArea}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, {height: 80}]}
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Describe the violation"
      />

      <View style={styles.row}>
        <TouchableOpacity style={[styles.actionButton, styles.cancel]} onPress={onCancel}>
          <Text style={styles.actionText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.save]} onPress={handleSave}>
          <Text style={[styles.actionText, {color: '#ffffff'}]}>Save</Text>
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
  label: {fontSize: 13, color: colors.mutedText, marginTop: 12},
  input: {borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginTop: 4, backgroundColor: '#ffffff'},
  typeList: {marginTop: 8},
  typeRowItem: {paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6},
  typeRowItemActive: {backgroundColor: colors.primary},
  typeRowItemInactive: {backgroundColor: '#e5e7eb'},
  typeRowText: {fontSize: 13, color: colors.text},
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
  smallButtonText: {color: '#ffffff', fontSize: 12},
  loader: {marginTop: 20, alignItems: 'center'},
  loaderText: {marginTop: 8, fontSize: 12, color: colors.mutedText},
  errorText: {fontSize: 12, color: colors.danger, textAlign: 'center'},
  row: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 24},
  actionButton: {flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center'},
  cancel: {backgroundColor: '#e5e7eb', marginRight: 8},
  save: {backgroundColor: colors.primary, marginLeft: 8},
  actionText: {fontWeight: '600', color: colors.text},
});
