import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Subtle entrance for screen sections (Reanimated layout). */
export default function FadeInView({children, delay = 0, style}: FadeInViewProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(380).springify().damping(18)}
      style={style}>
      {children}
    </Animated.View>
  );
}
