import {enqueueToast, type ToastVariant} from '../components/toast/toastController';

function show(variant: ToastVariant, message: string, durationMs?: number) {
  enqueueToast({variant, message, durationMs});
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
