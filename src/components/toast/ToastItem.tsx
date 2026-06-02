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
import {glassStyles} from '../../theme/glassStyles';

interface ToastItemProps {
  message: string;
  variant: ToastVariant;
  onDismiss: () => void;
}

export default function ToastItem({message, variant, onDismiss}: ToastItemProps) {
  const meta = toastVariantMeta[variant];
  const translateY = useSharedValue(56);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  const finishDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const dismiss = useCallback(() => {
    translateY.value = withTiming(48, {duration: 240, easing: Easing.in(Easing.cubic)});
    opacity.value = withTiming(0, {duration: 220}, finished => {
      if (finished) {
        runOnJS(finishDismiss)();
      }
    });
    scale.value = withTiming(0.97, {duration: 220});
  }, [finishDismiss, opacity, scale, translateY]);

  useEffect(() => {
    translateY.value = withSpring(0, {damping: 20, stiffness: 260, mass: 0.75});
    opacity.value = withTiming(1, {duration: 280, easing: Easing.out(Easing.cubic)});
    scale.value = withSpring(1, {damping: 18, stiffness: 220});
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
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    ...glassStyles.cardStrong,
    borderRadius: 16,
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 0,
    overflow: 'hidden',
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
    fontSize: 15,
    lineHeight: 21,
    color: '#111827',
    fontWeight: '600',
  },
});
