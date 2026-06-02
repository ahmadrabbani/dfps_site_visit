import React, {type ReactNode} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import {glassStyles} from '../theme/glassStyles';

type GlassVariant = 'card' | 'cardStrong' | 'panel' | 'inset';

interface GlassSurfaceProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassVariant;
}

export default function GlassSurface({children, style, variant = 'card'}: GlassSurfaceProps) {
  const base =
    variant === 'cardStrong'
      ? glassStyles.cardStrong
      : variant === 'panel'
        ? glassStyles.panel
        : variant === 'inset'
          ? glassStyles.inset
          : glassStyles.card;

  return <View style={[base, style]}>{children}</View>;
}
