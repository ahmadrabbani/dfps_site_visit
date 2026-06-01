import React, {useEffect} from 'react';
import {useNetInfo} from '@react-native-community/netinfo';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Dark apple green when online. */
const COLOR_ONLINE = '#1a7f37';
const COLOR_MID = '#9ca3af';
const COLOR_OFFLINE = '#dc2626';

interface ConnectionStatusDotProps {
  size?: number;
  /** White ring for header on primary blue; subtle grey ring on light backgrounds. */
  variant?: 'onPrimary' | 'onLight';
}

export default function ConnectionStatusDot({size = 10, variant = 'onPrimary'}: ConnectionStatusDotProps) {
  const netInfo = useNetInfo();
  const isOnline = !!netInfo.isConnected;
  const colorProgress = useSharedValue(isOnline ? 0 : 1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isOnline) {
      colorProgress.value = withTiming(0, {duration: 450});
      pulse.value = withRepeat(
        withSequence(withTiming(1.2, {duration: 900}), withTiming(1, {duration: 900})),
        -1,
        false,
      );
      return;
    }

    pulse.value = withTiming(1, {duration: 200});
    colorProgress.value = withSequence(
      withTiming(0.5, {duration: 380}),
      withTiming(1, {duration: 380}),
    );
  }, [isOnline, colorProgress, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: interpolateColor(colorProgress.value, [0, 0.5, 1], [COLOR_ONLINE, COLOR_MID, COLOR_OFFLINE]),
    transform: [{scale: pulse.value}],
    borderWidth: 1.5,
    borderColor: variant === 'onPrimary' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.12)',
  }));

  return (
    <Animated.View
      style={animatedStyle}
      accessibilityLabel={isOnline ? 'Online' : 'Offline'}
      accessibilityRole="image"
    />
  );
}
