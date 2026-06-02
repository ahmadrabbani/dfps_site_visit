import {StyleSheet} from 'react-native';
import {colors} from './colors';
import {glassStyles} from './glassStyles';

/** Shared form label + field spacing for survey screens. */
export const formStyles = StyleSheet.create({
  group: {
    marginTop: 18,
  },
  groupFirst: {
    marginTop: 10,
  },
  groupCompact: {
    marginTop: 12,
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
    color: colors.mutedText,
    fontWeight: '600',
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.hintText,
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
    ...glassStyles.chip,
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
