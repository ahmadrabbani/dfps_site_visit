import type {ToastVariant} from './toastController';

export const TOAST_DURATION_MS: Record<ToastVariant, number> = {
  info: 3200,
  success: 3000,
  error: 4200,
  warning: 3800,
};

export const toastVariantMeta: Record<
  ToastVariant,
  {icon: string; accent: string; surface: string; iconColor: string}
> = {
  success: {
    icon: 'check-circle',
    accent: '#15803d',
    surface: '#ecfdf5',
    iconColor: '#15803d',
  },
  error: {
    icon: 'alert-circle',
    accent: '#b91c1c',
    surface: '#fef2f2',
    iconColor: '#b91c1c',
  },
  info: {
    icon: 'information',
    accent: '#003366',
    surface: '#eff6ff',
    iconColor: '#003366',
  },
  warning: {
    icon: 'alert',
    accent: '#d97706',
    surface: '#fffbeb',
    iconColor: '#b45309',
  },
};
