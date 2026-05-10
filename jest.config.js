module.exports = {
  preset: 'react-native',
  setupFiles: [
    '<rootDir>/jest/setupFiles.js',
    'react-native-gesture-handler/jestSetup',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-reanimated|react-native-drawer-layout|@react-navigation|@tanstack|@sentry|@shopify/flash-list|react-native-maps|react-native-fast-image|i18next|react-i18next|zustand|jotai)',
  ],
};
