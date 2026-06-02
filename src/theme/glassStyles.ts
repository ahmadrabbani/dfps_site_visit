import {Platform, StyleSheet} from 'react-native';

/** Frosted glass / crystal UI tokens (translucent surfaces + soft borders). */
export const glass = {
  fill: {
    light: 'rgba(255, 255, 255, 0.72)',
    lightStrong: 'rgba(255, 255, 255, 0.88)',
    frost: 'rgba(255, 255, 255, 0.55)',
    onDark: 'rgba(255, 255, 255, 0.12)',
  },
  border: {
    outer: 'rgba(255, 255, 255, 0.9)',
    inner: 'rgba(255, 255, 255, 0.45)',
    subtle: 'rgba(0, 51, 102, 0.1)',
  },
  shadow: {
    color: '#003366',
    opacity: 0.12,
    radius: 20,
    offset: {width: 0, height: 8},
    elevation: 6,
  },
} as const;

const shadow = Platform.select({
  ios: {
    shadowColor: glass.shadow.color,
    shadowOffset: glass.shadow.offset,
    shadowOpacity: glass.shadow.opacity,
    shadowRadius: glass.shadow.radius,
  },
  android: {elevation: glass.shadow.elevation},
  default: {},
});

export const glassStyles = StyleSheet.create({
  card: {
    backgroundColor: glass.fill.light,
    borderWidth: 1,
    borderColor: glass.border.outer,
    borderRadius: 16,
    ...shadow,
  },
  cardStrong: {
    backgroundColor: glass.fill.lightStrong,
    borderWidth: 1,
    borderColor: glass.border.outer,
    borderRadius: 16,
    ...shadow,
  },
  panel: {
    backgroundColor: glass.fill.frost,
    borderWidth: 1,
    borderColor: glass.border.inner,
    borderRadius: 14,
  },
  inset: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: glass.border.subtle,
    borderRadius: 12,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: glass.border.inner,
  },
});
