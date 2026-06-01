import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNetInfo} from '@react-native-community/netinfo';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface ConnectionStatusDotProps {
  size?: number;
}

/** Green when online, red when offline. */
export default function ConnectionStatusDot({size = 10}: ConnectionStatusDotProps) {
  const netInfo = useNetInfo();
  const isOnline = !!netInfo.isConnected;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isOnline) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.25, {duration: 900}), withTiming(1, {duration: 900})),
        -1,
        false,
      );
      return;
    }
    pulse.value = withTiming(1, {duration: 200});
  }, [isOnline, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulse.value}],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View
        style={[
          styles.dot,
          {width: size, height: size, borderRadius: size / 2},
          isOnline ? styles.online : styles.offline,
        ]}
        accessibilityLabel={isOnline ? 'Online' : 'Offline'}
        accessibilityRole="image"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  online: {
    backgroundColor: '#10b981',
  },
  offline: {
    backgroundColor: '#ef4444',
  },
});
