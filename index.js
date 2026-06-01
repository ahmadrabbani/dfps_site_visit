/**
 * @format
 */

// Required before crypto-js (survey API key) on React Native — provides secure random bytes.
import 'react-native-get-random-values';

import 'react-native-reanimated';
import 'react-native-gesture-handler';
import './global.css';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
