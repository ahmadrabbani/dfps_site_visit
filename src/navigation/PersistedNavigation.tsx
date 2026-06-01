import AsyncStorage from '@react-native-async-storage/async-storage';
import {NavigationContainer, type NavigationState} from '@react-navigation/native';
import type {LinkingOptions, ParamListBase} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

const NAV_STATE_KEY = 'NAVIGATION_STATE_V1';

export async function clearNavigationPersistence(): Promise<void> {
  await AsyncStorage.removeItem(NAV_STATE_KEY);
}

interface PersistedNavigationProps {
  children: React.ReactNode;
  linking?: LinkingOptions<ParamListBase>;
}

export default function PersistedNavigation({children, linking}: PersistedNavigationProps) {
  const [ready, setReady] = useState(false);
  const [initialState, setInitialState] = useState<NavigationState | undefined>();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(NAV_STATE_KEY);
        if (!cancelled && raw) {
          setInitialState(JSON.parse(raw) as NavigationState);
        }
      } catch {
        // Ignore corrupt saved state.
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onStateChange = useCallback((state: NavigationState | undefined) => {
    if (state) {
      void AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
    }
  }, []);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <NavigationContainer
      linking={linking}
      initialState={initialState}
      onStateChange={onStateChange}>
      {children}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5'},
});
