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
});
