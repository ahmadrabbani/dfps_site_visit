import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Icon} from 'react-native-paper';
import {colors} from '../theme/colors';

interface PhotoPickerButtonsProps {
  disabled?: boolean;
  onCamera: () => void;
  onGallery: () => void;
  cameraLabel?: string;
  galleryLabel?: string;
  cameraAccessibilityLabel?: string;
  galleryAccessibilityLabel?: string;
}

export default function PhotoPickerButtons({
  disabled = false,
  onCamera,
  onGallery,
  cameraLabel = 'Take photo',
  galleryLabel = 'From gallery',
  cameraAccessibilityLabel,
  galleryAccessibilityLabel,
}: PhotoPickerButtonsProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.button, styles.buttonPrimary, disabled ? styles.buttonDisabled : null]}
        disabled={disabled}
        onPress={onCamera}
        accessibilityRole="button"
        accessibilityLabel={cameraAccessibilityLabel ?? cameraLabel}
        accessibilityState={{disabled}}>
        <Icon source="camera" size={20} color="#ffffff" />
        <Text style={[styles.buttonTextPrimary, styles.buttonLabel]}>{cameraLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary, disabled ? styles.buttonDisabled : null]}
        disabled={disabled}
        onPress={onGallery}
        accessibilityRole="button"
        accessibilityLabel={galleryAccessibilityLabel ?? galleryLabel}
        accessibilityState={{disabled}}>
        <Icon source="image-multiple-outline" size={20} color={colors.primary} />
        <Text style={[styles.buttonTextSecondary, styles.buttonLabel]}>{galleryLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  button: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  buttonPrimary: {
    backgroundColor: colors.primaryLight,
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonLabel: {
    marginLeft: 8,
  },
  buttonTextPrimary: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
