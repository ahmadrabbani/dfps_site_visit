import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, StatusBar, LogBox, ActivityIndicator, Text, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import AuthenticatedFlow from './navigation/AuthenticatedFlow';
import {startSyncWatcher, stopSyncWatcher} from './services/syncService';
import {clearSession, loadSession, saveSession} from './services/authService';

LogBox.ignoreLogs([/SafeAreaView has been deprecated/]);

const Stack = createNativeStackNavigator();

function SplashScreen() {
  return (
    <View style={splashStyles.container}>
      <StatusBar barStyle="dark-content" />
      <ActivityIndicator size="large" color="#003366" accessibilityLabel="Loading session" />
      <Text style={splashStyles.text}>Loading…</Text>
    </View>
  );
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [siteScope, setSiteScope] = useState('residential');
  const violationDraftRef = useRef(null);

  useEffect(() => {
    startSyncWatcher();
    return () => stopSyncWatcher();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await loadSession();
        if (cancelled) {
          return;
        }
        if (session) {
          setUser(session);
        } else {
          setUser(null);
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

  const handleLogin = useCallback(async u => {
    try {
      await saveSession(u);
    } catch (e) {
      console.warn('[App] saveSession failed', e?.message);
    }
    setUser(u);
  }, []);

  const handleSignOut = useCallback(async () => {
    await clearSession();
    setUser(null);
    violationDraftRef.current = null;
  }, []);

  const stackKey = !authReady ? 'splash' : user ? 'app' : 'auth';

  return (
    <Stack.Navigator key={stackKey} screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
        {!authReady ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : !user ? (
          <Stack.Screen name="Login" options={{contentStyle: {flex: 1}}}>
            {() => <LoginScreen onLogin={handleLogin} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Authenticated" options={{headerShown: false}}>
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
