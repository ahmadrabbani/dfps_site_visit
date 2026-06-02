export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export interface ShowToastOptions {
  message: string;
  variant: ToastVariant;
  durationMs?: number;
}

type ToastHandler = (options: ShowToastOptions) => void;

let toastHandler: ToastHandler | null = null;
const pendingQueue: ShowToastOptions[] = [];

export function registerToastHandler(handler: ToastHandler | null): void {
  toastHandler = handler;
  if (!handler) {
    return;
  }
  while (pendingQueue.length > 0) {
    const next = pendingQueue.shift();
    if (next) {
      handler(next);
    }
  }
}

/** Enqueues a bottom toast. Returns false only when message is empty. */
export function enqueueToast(options: ShowToastOptions): boolean {
  const message = options.message?.trim();
  if (!message) {
    return false;
  }
  const payload = {...options, message};
  if (toastHandler) {
    toastHandler(payload);
    return true;
  }
  pendingQueue.push(payload);
  return true;
}
