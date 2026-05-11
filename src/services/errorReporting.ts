import * as Sentry from '@sentry/react-native';

export function reportServiceError(
  context: string,
  error: unknown,
  extras: Record<string, unknown> = {},
) {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : `${context} failed`);

  Sentry.withScope(scope => {
    scope.setTag('layer', 'service');
    scope.setTag('context', context);
    Object.entries(extras).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureException(err);
  });
}
