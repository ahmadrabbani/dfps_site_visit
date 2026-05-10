module.exports = {
  preset: 'react-native',
  setupFiles: [
    '<rootDir>/jest/setupFiles.js',
    'react-native-gesture-handler/jestSetup',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@react-navigation|@tanstack)',
  ],
};
