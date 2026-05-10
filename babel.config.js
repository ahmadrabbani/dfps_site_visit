module.exports = {
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    // Must stay last — https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation/
    'react-native-reanimated/plugin',
  ],
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
};
