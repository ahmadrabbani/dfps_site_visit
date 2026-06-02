import {CONNECTION_STATUS_BAR_HEIGHT} from '../components/ConnectionStatusDot';

/** React Native Paper Appbar content height (excludes status bar). */
export const APP_BAR_HEIGHT = 56;

/** Matches main screen top bar: status bar + app bar. */
export function getAppHeaderHeight(statusBarTop: number): number {
  return statusBarTop + APP_BAR_HEIGHT;
}

/** Extra space below the app header before scrollable content. */
export const SCREEN_TOP_INSET = 12;

export function screenContentPadding(horizontal = 16, bottom = 32) {
  return {
    paddingHorizontal: horizontal,
    paddingTop: horizontal + SCREEN_TOP_INSET,
    paddingBottom: bottom + CONNECTION_STATUS_BAR_HEIGHT,
  };
}
