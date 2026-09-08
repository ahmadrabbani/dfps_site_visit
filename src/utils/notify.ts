import {enqueueToast, type ToastVariant} from '../components/toast/toastController';
import {hapticError, hapticSuccess, hapticWarning} from './haptics';

function show(variant: ToastVariant, message: string, durationMs?: number) {
  enqueueToast({variant, message, durationMs});
}

export function notifyInfo(message: string) {
  show('info', message);
}

export function notifySuccess(message: string) {
  hapticSuccess();
  show('success', message);
}

export function notifyError(message: string) {
  hapticError();
  show('error', message);
}

export function notifyWarning(message: string) {
  hapticWarning();
  show('warning', message);
}
