import React, {useCallback, useEffect} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Icon} from 'react-native-paper';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type {ToastVariant} from './toastController';
import {toastVariantMeta} from './toastTheme';

interface ToastItemProps {
  message: string;
  variant: ToastVariant;
  onDismiss: () => void;
}

export default function ToastItem({message, variant, onDismiss}: ToastItemProps) {
  const meta = toastVariantMeta[variant];
  const translateY = useSharedValue(-28);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);

  const finishDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const dismiss = useCallback(() => {
    translateY.value = withTiming(-24, {duration: 220, easing: Easing.in(Easing.cubic)});
    opacity.value = withTiming(0, {duration: 200}, finished => {
      if (finished) {
        runOnJS(finishDismiss)();
      }
    });
    scale.value = withTiming(0.96, {duration: 200});
  }, [finishDismiss, opacity, scale, translateY]);

  useEffect(() => {
    translateY.value = withSpring(0, {damping: 18, stiffness: 220, mass: 0.8});
    opacity.value = withTiming(1, {duration: 260, easing: Easing.out(Easing.cubic)});
    scale.value = withSpring(1, {damping: 16, stiffness: 200});
  }, [opacity, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{translateY: translateY.value}, {scale: scale.value}],
  }));

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${variant} message`}
        onPress={dismiss}
        style={({pressed}) => [styles.card, pressed ? styles.cardPressed : null]}>
        <View style={[styles.accent, {backgroundColor: meta.accent}]} />
        <View style={[styles.iconWrap, {backgroundColor: meta.surface}]}>
          <Icon source={meta.icon} size={22} color={meta.iconColor} />
        </View>
        <Text style={styles.message} numberOfLines={4}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingRight: 14,
    paddingLeft: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cardPressed: {
    opacity: 0.92,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
    fontWeight: '500',
  },
});
