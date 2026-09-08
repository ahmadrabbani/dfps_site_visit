import {Platform} from 'react-native';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

function trigger(type: HapticFeedbackTypes) {
  try {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return;
    }
    ReactNativeHapticFeedback.trigger(type, options);
  } catch {
    // Native module missing in tests / unsupported devices — ignore.
  }
}

/** Soft tap — chips, menu rows, secondary buttons. */
export function hapticLight() {
  trigger(
    Platform.OS === 'android'
      ? HapticFeedbackTypes.effectClick
      : HapticFeedbackTypes.impactLight,
  );
}

/** Stronger confirmation — primary save / Get location. */
export function hapticMedium() {
  trigger(
    Platform.OS === 'android'
      ? HapticFeedbackTypes.effectHeavyClick
      : HapticFeedbackTypes.impactMedium,
  );
}

/** Successful save / sync. */
export function hapticSuccess() {
  trigger(
    Platform.OS === 'ios'
      ? HapticFeedbackTypes.notificationSuccess
      : HapticFeedbackTypes.effectTick,
  );
}

/** Soft warning (accuracy, offline save). */
export function hapticWarning() {
  trigger(
    Platform.OS === 'ios'
      ? HapticFeedbackTypes.notificationWarning
      : HapticFeedbackTypes.effectDoubleClick,
  );
}

/** Hard failure. */
export function hapticError() {
  trigger(
    Platform.OS === 'ios'
      ? HapticFeedbackTypes.notificationError
      : HapticFeedbackTypes.effectHeavyClick,
  );
}

/** Segmented control / kind chip selection. */
export function hapticSelection() {
  trigger(
    Platform.OS === 'ios'
      ? HapticFeedbackTypes.selection
      : HapticFeedbackTypes.effectClick,
  );
}
