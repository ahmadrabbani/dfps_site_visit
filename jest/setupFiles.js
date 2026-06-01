/**
 * Runs before test files load. Mocks native modules pulled in by static imports in App/screens.
 */
require('react-native-get-random-values');
jest.mock('@react-navigation/drawer', () => {
  const React = require('react');
  const {View} = require('react-native');

  function createDrawerNavigator() {
    const Navigator = ({children}) => (
      <View>
        {React.Children.toArray(children).map(child => {
          if (!React.isValidElement(child)) {
            return null;
          }
          const Comp = child.props.component;
          return Comp ? <Comp key={child.key || child.props.name} /> : null;
        })}
      </View>
    );
    const Screen = () => null;
    return {Navigator, Screen};
  }

  const DrawerContentScrollView = ({children, ...rest}) => (
    <View {...rest}>{children}</View>
  );
  const DrawerItem = () => null;

  return {createDrawerNavigator, DrawerContentScrollView, DrawerItem};
});

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: effect => {
      React.useEffect(() => effect(), [effect]);
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('../src/components/toast/ToastProvider', () => ({
  __esModule: true,
  default: ({children}) => children,
}));

jest.mock('../src/components/animated/FadeInView', () => ({
  __esModule: true,
  default: ({children}) => children,
}));

jest.mock('../src/components/ConnectionStatusDot', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/components/toast/ToastItem', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn(fn => {
    const scope = {
      setTag: jest.fn(),
      setExtra: jest.fn(),
    };
    return fn(scope);
  }),
}));

jest.mock('react-native-maps', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: RN.View,
    Marker: RN.View,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('react-native-fast-image', () => require('react-native').Image);

jest.mock('react-native-config', () => ({
  default: {
    API_BASE_URL: '',
    LOGIN_URL: 'http://test.example/login.php',
    VIOLATION_LIST_URL: '',
    CC_SURVEY_URL: '',
    CC_APPLICATION_LIST_URL: '',
    USE_FAKE_API: 'false',
    SENTRY_DSN: '',
  },
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(success =>
      success({
        coords: {latitude: 31.5204, longitude: 74.3587, accuracy: 5},
      }),
    ),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
    requestAuthorization: jest.fn(() => Promise.resolve('granted')),
    stopObserving: jest.fn(),
  },
}));

jest.mock('../src/utils/locationPermission', () => ({
  hasLocationPermission: jest.fn(() => Promise.resolve(true)),
  hasAndroidLocationPermission: jest.fn(() => Promise.resolve(true)),
  requestLocationPermission: jest.fn(() => Promise.resolve(true)),
  ensureLocationPermission: jest.fn(() => Promise.resolve(true)),
  syncAndroidLocationAfterGrant: jest.fn(() => Promise.resolve(true)),
  waitForAndroidLocationPermission: jest.fn(() => Promise.resolve(true)),
  describeGpsError: jest.fn(() => 'GPS error'),
  isPermissionDeniedError: jest.fn(() => false),
  isLocationSettingsError: jest.fn(() => false),
  openAppSettings: jest.fn(),
}));

jest.mock('../src/utils/deviceLocation', () => ({
  acquireDeviceCoords: jest.fn(() => Promise.resolve({lat: 31.5204, lng: 74.3587})),
  isGpsPermissionError: jest.fn(() => false),
  isGpsSettingsError: jest.fn(() => false),
}));
