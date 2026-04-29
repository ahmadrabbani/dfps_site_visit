import React, {useEffect, useState} from 'react';
import {SafeAreaView, StatusBar, LogBox} from 'react-native';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import SiteVisitScreen from './screens/SiteVisitScreen';
import ViolationFormScreen from './screens/ViolationFormScreen';
import SummaryScreen from './screens/SummaryScreen';
import {addPendingVisit} from './services/storage';
import {startSyncWatcher, stopSyncWatcher} from './services/syncService';

LogBox.ignoreLogs([/SafeAreaView has been deprecated/]);

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('login');
  const [tmpViolations, setTmpViolations] = useState(null);
  const [completedVisit, setCompletedVisit] = useState(null);
  const [siteScope, setSiteScope] = useState('residential');

  useEffect(() => {
    startSyncWatcher();
    return () => stopSyncWatcher();
  }, []);

  const handleLogin = u => {
    setUser(u);
    setScreen('dashboard');
  };

  const handleStartVisit = () => {
    setSiteScope('residential');
    setScreen('siteVisit');
  };

  const handleAddViolation = (currentViolations, setViolations) => {
    setTmpViolations({currentViolations, setViolations});
    setScreen('violationForm');
  };

  const handleSaveViolation = violation => {
    if (!tmpViolations) {
      return;
    }
    const {currentViolations, setViolations} = tmpViolations;
    const updated = [...currentViolations, violation];
    setViolations(updated);
    setTmpViolations(null);
    setScreen('siteVisit');
  };

  const handleCompleteVisit = async (violations, scopeAtVisit) => {
    const now = new Date().toISOString();
    const visitScope = scopeAtVisit || siteScope;
    const visit = {
      localId: 'local-' + Date.now(),
      siteId: 1, // will map to scheme/block/plot/case in backend
      officerId: user.id,
      authToken: user.token,
      startTime: now,
      endTime: now,
      startLat: 31.5204,
      startLon: 74.3587,
      scope: visitScope,
      violations,
    };
    await addPendingVisit(visit);
    setCompletedVisit(visit);
    setScreen('summary');
  };

  const handleSummaryDone = () => {
    setScreen('dashboard');
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <StatusBar barStyle="dark-content" />
      {screen === 'login' && <LoginScreen onLogin={handleLogin} />}
      {screen === 'dashboard' && (
        <DashboardScreen user={user} onStartVisit={handleStartVisit} />
      )}
      {screen === 'siteVisit' && (
        <SiteVisitScreen
          user={user}
          siteScope={siteScope}
          onScopeChange={setSiteScope}
          onAddViolation={handleAddViolation}
          onCompleteVisit={handleCompleteVisit}
        />
      )}
      {screen === 'violationForm' && (
        <ViolationFormScreen
          scope={siteScope}
          onScopeChange={setSiteScope}
          onSave={handleSaveViolation}
          onCancel={() => {
            setTmpViolations(null);
            setScreen('siteVisit');
          }}
        />
      )}
      {screen === 'summary' && (
        <SummaryScreen visit={completedVisit} onDone={handleSummaryDone} />
      )}
    </SafeAreaView>
  );
}
