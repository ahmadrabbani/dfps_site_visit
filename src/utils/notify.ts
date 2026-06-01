import {Alert, Platform, ToastAndroid} from 'react-native';
import {enqueueToast, type ToastVariant} from '../components/toast/toastController';

function fallbackToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(String(message), ToastAndroid.SHORT);
    return;
  }
  Alert.alert('', String(message));
}

function show(variant: ToastVariant, message: string, durationMs?: number) {
  const handled = enqueueToast({variant, message, durationMs});
  if (!handled) {
    fallbackToast(message);
  }
}

export function notifyInfo(message: string) {
  show('info', message);
}

export function notifySuccess(message: string) {
  show('success', message);
}

export function notifyError(message: string) {
  show('error', message);
}

export function notifyWarning(message: string) {
  show('warning', message);
}
