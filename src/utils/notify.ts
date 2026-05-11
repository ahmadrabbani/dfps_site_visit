import {Alert, Platform, ToastAndroid} from 'react-native';

function showAndroid(message: string) {
  ToastAndroid.show(String(message), ToastAndroid.SHORT);
}

function showCrossPlatform(title: string, message: string) {
  if (Platform.OS === 'android') {
    showAndroid(message);
    return;
  }
  Alert.alert(title, message);
}

export function notifyInfo(message: string) {
  showCrossPlatform('Info', message);
}

export function notifySuccess(message: string) {
  showCrossPlatform('Success', message);
}

export function notifyError(message: string) {
  showCrossPlatform('Error', message);
}
