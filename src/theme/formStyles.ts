import {StyleSheet} from 'react-native';
import {colors} from './colors';

/** Shared form label + field spacing for survey screens. */
export const formStyles = StyleSheet.create({
  group: {
    marginTop: 22,
  },
  groupFirst: {
    marginTop: 10,
  },
  groupCompact: {
    marginTop: 14,
  },
  labelSpacing: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.25,
  },
  labelCompact: {
    fontSize: 13,
    fontWeight: '600',
  },
  requiredMark: {
    color: colors.danger,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedText,
    marginTop: -2,
    marginBottom: 8,
  },
  field: {
    marginTop: 1,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  plotCategoryRow: {
    flexDirection: 'row',
    gap: 14,
  },
  plotCategoryChip: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plotCategoryChipActive: {
    backgroundColor: colors.primary,
  },
  plotCategoryChipInactive: {
    backgroundColor: '#e5e7eb',
  },
  plotCategoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  plotCategoryChipTextActive: {
    color: '#ffffff',
  },
});
