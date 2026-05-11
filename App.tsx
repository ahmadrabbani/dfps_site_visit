/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import './src/i18n';
import * as Sentry from '@sentry/react-native';
import Config from 'react-native-config';
import React from 'react';

const sentryDsn = (Config.SENTRY_DSN || '').trim();
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });
}
import {StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import type {LinkingOptions, ParamListBase} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {MD3LightTheme, PaperProvider} from 'react-native-paper';
import App from './src/App';
import {linking} from './src/navigation/linking';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
    },
  },
});

const appTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#003366',
    secondary: '#335588',
  },
};

const appLinking = linking as LinkingOptions<ParamListBase>;

export default function Root() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={appTheme}>
          <SafeAreaProvider>
            <NavigationContainer linking={appLinking}>
              <App />
            </NavigationContainer>
          </SafeAreaProvider>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
