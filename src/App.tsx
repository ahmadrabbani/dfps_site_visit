import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, StatusBar, LogBox, ActivityIndicator, Text, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import AuthenticatedFlow from './navigation/AuthenticatedFlow';
import {ROOT_ROUTES} from './navigation/routeNames';
import {startSyncWatcher, stopSyncWatcher} from './services/syncService';
import {clearNavigationPersistence} from './navigation/PersistedNavigation';
import {clearAndroidLocationPrepared} from './utils/locationSession';
import {clearSession, loadSession, saveSession} from './services/authService';
import type {SessionUser} from './services/api';
import type {SiteScope, ViolationDraft} from './types/app';

LogBox.ignoreLogs([/SafeAreaView has been deprecated/]);

const Stack = createNativeStackNavigator();

function SplashScreen() {
  return (
    <View style={splashStyles.container}>
      <StatusBar barStyle="dark-content" />
      <ActivityIndicator size="large" color="#003366" accessibilityLabel="Loading session" />
      <Text style={splashStyles.text}>Loading...</Text>
    </View>
  );
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [siteScope, setSiteScope] = useState<SiteScope>('residential');
  const violationDraftRef = useRef<ViolationDraft | null>(null);

  useEffect(() => {
    startSyncWatcher();
    return () => stopSyncWatcher();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await loadSession();
        if (!cancelled) {
          setUser(session);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = useCallback(async (u: SessionUser) => {
    if (u.isBypassLogin) {
      setUser(u);
      return;
    }
    try {
      await saveSession(u);
    } catch {
      // Keep login success even if local secure persistence fails.
    }
    setUser(u);
  }, []);

  const handleSignOut = useCallback(async () => {
    await clearSession();
    await clearNavigationPersistence();
    clearAndroidLocationPrepared();
    setUser(null);
    violationDraftRef.current = null;
  }, []);

  if (!authReady) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
      {user ? (
        <Stack.Screen name={ROOT_ROUTES.Authenticated} options={{headerShown: false}}>
          {() => (
            <AuthenticatedFlow
              user={user}
              siteScope={siteScope}
              setSiteScope={setSiteScope}
              violationDraftRef={violationDraftRef}
              onSignOut={handleSignOut}
            />
          )}
        </Stack.Screen>
      ) : (
        <Stack.Screen name={ROOT_ROUTES.Login} options={{contentStyle: {flex: 1}}}>
          {() => <LoginScreen onLogin={handleLogin} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#374151',
  },
});
