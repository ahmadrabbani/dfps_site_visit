import React, {useEffect} from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {useNetInfo} from '@react-native-community/netinfo';
import {glass, glassStyles} from '../theme/glassStyles';
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

export const CONNECTION_STATUS_BAR_HEIGHT = 40;

interface ConnectionStatusDotProps {
  size?: number;
  /** White ring for header on primary blue; subtle grey ring on light backgrounds. */
  variant?: 'onPrimary' | 'onLight';
  /** Shows "Connected" / "Disconnected" beside the dot with matching color animation. */
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ConnectionStatusDot({
  size = 10,
  variant = 'onPrimary',
  showLabel = false,
  style,
}: ConnectionStatusDotProps) {
  const netInfo = useNetInfo();
  const isOnline = !!netInfo.isConnected;
  const colorProgress = useSharedValue(isOnline ? 0 : 1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isOnline) {
      colorProgress.value = withTiming(0, {duration: 450});
      pulse.value = withRepeat(
        withSequence(withTiming(1.18, {duration: 900}), withTiming(1, {duration: 900})),
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

  const dotStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: interpolateColor(colorProgress.value, [0, 0.5, 1], [COLOR_ONLINE, COLOR_MID, COLOR_OFFLINE]),
    transform: [{scale: pulse.value}],
    borderWidth: variant === 'onPrimary' ? 2 : 1.5,
    borderColor: variant === 'onPrimary' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.1)',
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(colorProgress.value, [0, 0.5, 1], [COLOR_ONLINE, COLOR_MID, COLOR_OFFLINE]),
  }));

  const statusText = isOnline ? 'Connected' : 'Disconnected';

  return (
    <View
      style={[showLabel ? styles.row : null, style]}
      accessibilityLabel={isOnline ? 'Connected' : 'Disconnected'}
      accessibilityRole="text">
      <Animated.View style={dotStyle} />
      {showLabel ? (
        <Animated.Text style={[styles.label, labelStyle]}>{statusText}</Animated.Text>
      ) : null}
    </View>
  );
}

/** Persistent bottom strip: connection dot + Connected / Disconnected. */
export function ConnectionStatusBar() {
  return (
    <View style={styles.bar}>
      <ConnectionStatusDot size={12} variant="onLight" showLabel />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bar: {
    height: CONNECTION_STATUS_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    ...glassStyles.cardStrong,
    borderTopWidth: 1,
    borderTopColor: glass.border.outer,
    borderRadius: 0,
  },
});
