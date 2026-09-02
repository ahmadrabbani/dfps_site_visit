import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {Icon} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme/colors';
import {glassStyles} from '../theme/glassStyles';
import type {PlotBankOption} from '../services/plotBank';

interface LookupSelectProps {
  title: string;
  placeholder: string;
  value: string;
  options: PlotBankOption[];
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onRetry?: () => void;
  onSelect: (option: PlotBankOption) => void;
  accessibilityLabel?: string;
}

export default function LookupSelect({
  title,
  placeholder,
  value,
  options,
  loading = false,
  error = null,
  disabled = false,
  onRetry,
  onSelect,
  accessibilityLabel,
}: LookupSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const selected = options.find(item => item.value === value);
  const display = selected?.label || placeholder;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return options;
    }
    return options.filter(item => item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <>
      <TouchableOpacity
        style={[styles.selectField, (loading || disabled) && styles.selectFieldDisabled]}
        disabled={disabled || loading}
        onPress={() => {
          if (error && onRetry) {
            onRetry();
            return;
          }
          setQuery('');
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{disabled: disabled || loading}}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text
            style={[styles.selectFieldText, !selected ? styles.placeholder : null]}
            numberOfLines={2}>
            {error ? 'Tap to retry' : display}
          </Text>
        )}
      </TouchableOpacity>
      {error ? (
        <TouchableOpacity style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>{error}</Text>
        </TouchableOpacity>
      ) : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalRoot, {paddingTop: Math.max(insets.top, 16)}]}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              style={styles.modalCloseHeader}
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <Icon source="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            autoCorrect={false}
            accessibilityLabel={`Search ${title}`}
          />
          <FlatList
            style={styles.modalList}
            contentContainerStyle={styles.modalListContent}
            data={filtered}
            keyExtractor={item => item.value}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.empty}>No matches.</Text>}
            renderItem={({item}) => {
              const active = item.value === value;
              return (
                <Pressable
                  style={[styles.modalRow, active ? styles.modalRowActive : null]}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}>
                  <Text style={[styles.modalRowText, active ? styles.modalRowTextActive : null]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
          <TouchableOpacity
            style={[styles.modalClose, {marginBottom: Math.max(insets.bottom, 16) + 8}]}
            onPress={() => setOpen(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectField: {
    ...glassStyles.inset,
    padding: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  selectFieldDisabled: {opacity: 0.7},
  selectFieldText: {fontSize: 14, color: colors.text},
  placeholder: {color: colors.mutedText},
  retry: {marginTop: 8},
  retryText: {fontSize: 12, color: colors.danger, lineHeight: 17},
  modalRoot: {flex: 1, backgroundColor: colors.background, paddingHorizontal: 16},
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 8,
  },
  modalTitle: {fontSize: 18, fontWeight: '700', color: colors.primary, flex: 1, paddingRight: 12},
  modalCloseHeader: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    ...glassStyles.inset,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  modalList: {flex: 1},
  modalListContent: {paddingBottom: 8},
  empty: {fontSize: 13, color: colors.mutedText, paddingVertical: 16},
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 6,
    ...glassStyles.panel,
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
  },
  modalCloseText: {color: '#ffffff', fontWeight: '700', fontSize: 16},
});
