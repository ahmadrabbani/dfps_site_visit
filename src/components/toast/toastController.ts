export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export interface ShowToastOptions {
  message: string;
  variant: ToastVariant;
  durationMs?: number;
}

type ToastHandler = (options: ShowToastOptions) => void;

let toastHandler: ToastHandler | null = null;

export function registerToastHandler(handler: ToastHandler | null): void {
  toastHandler = handler;
}

/** Returns true if the toast UI handled the message. */
export function enqueueToast(options: ShowToastOptions): boolean {
  if (toastHandler) {
    toastHandler(options);
    return true;
  }
  return false;
}
