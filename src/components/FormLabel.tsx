import React from 'react';
import {Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {formStyles} from '../theme/formStyles';
import {toTitleCase} from '../utils/titleCase';

type FormLabelProps = {
  title: string;
  required?: boolean;
  /** Short guidance shown between the label and the control. */
  hint?: string;
  first?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function FormLabel({
  title,
  required,
  hint,
  first,
  compact,
  style,
  children,
}: FormLabelProps) {
  return (
    <View
      style={[
        formStyles.group,
        first ? formStyles.groupFirst : null,
        compact ? formStyles.groupCompact : null,
        style,
      ]}>
      <Text
        style={[
          formStyles.label,
          compact ? formStyles.labelCompact : null,
          compact ? {marginBottom: 9} : formStyles.labelSpacing,
        ]}>
        {toTitleCase(title)}
        {required ? <Text style={formStyles.requiredMark}> *</Text> : null}
      </Text>
      {hint ? <Text style={formStyles.hint}>{hint}</Text> : null}
      {children != null ? <View style={formStyles.field}>{children}</View> : null}
    </View>
  );
}
