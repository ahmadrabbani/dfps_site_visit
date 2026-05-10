/**
 * Runs before test files load. Mocks native modules pulled in by static imports in App/screens.
 */
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
    requestAuthorization: jest.fn(),
    stopObserving: jest.fn(),
  },
}));
