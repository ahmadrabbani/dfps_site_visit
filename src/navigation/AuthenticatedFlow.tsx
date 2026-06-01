import React, {useMemo, useState} from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {useNavigation, useRoute} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthNavigationProvider, useAuthNavigation} from './AuthNavigationContext';
import {MainStackDrawerHost, useDrawerInteraction} from './DrawerInteractionContext';
import AppDrawerContent from '../components/AppDrawerContent';
import AppHeader from '../components/AppHeader';
import {uploadCopy} from '../constants/uploadCopy';
import {colors} from '../theme/colors';
import DashboardScreen from '../screens/DashboardScreen';
import SiteVisitScreen from '../screens/SiteVisitScreen';
import ViolationFormScreen from '../screens/ViolationFormScreen';
import SummaryScreen from '../screens/SummaryScreen';
import MySubmissionsScreen from '../screens/MySubmissionsScreen';
import {addPendingVisit} from '../services/storage';
import {syncPending} from '../services/syncService';
import {notifySuccess} from '../utils/notify';
import {prepareSiteVisitLocation} from '../utils/prepareSiteVisitLocation';
import {DRAWER_ROUTES, MAIN_STACK_ROUTES} from './routeNames';
import type {AuthNavigationContextValue, CcSurveyCompletePayload, SiteScope, ViolationDraft} from '../types/app';
import type {SessionUser} from '../services/api';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function MainStackHeader(props: any) {
  return <AppHeader navigation={props.navigation} routeName={props.route.name} />;
}

function DashboardRouteScreen() {
  const navigation = useNavigation<any>();
  const {user, setSiteScope} = useAuthNavigation();
  const [startingVisit, setStartingVisit] = useState(false);

  const handleStartVisit = async () => {
    if (startingVisit) {
      return;
    }
    setStartingVisit(true);
    try {
      setSiteScope('residential');
      const allowed = await prepareSiteVisitLocation();
      if (allowed) {
        navigation.navigate(MAIN_STACK_ROUTES.SiteVisit, {locationPrepared: true});
      }
    } finally {
      setStartingVisit(false);
    }
  };

  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <DashboardScreen
        user={user}
        startingVisit={startingVisit}
        onStartVisit={() => void handleStartVisit()}
      />
    </SafeAreaView>
  );
}

function SiteVisitRouteScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {user, siteScope, setSiteScope, violationDraftRef} = useAuthNavigation();
  const locationPrepared = route.params?.locationPrepared === true;
  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <SiteVisitScreen
        user={user}
        siteScope={siteScope}
        locationPrepared={locationPrepared}
        onScopeChange={setSiteScope}
        onAddViolation={(currentViolations, setViolations) => {
          violationDraftRef.current = {currentViolations, setViolations};
          navigation.navigate(MAIN_STACK_ROUTES.ViolationForm);
        }}
        onCompleteVisit={async (survey: CcSurveyCompletePayload) => {
          const now = new Date().toISOString();
          const visit = {
            localId: 'local-' + Date.now(),
            siteId: 1,
            caseId: survey.caseId,
            caseNumber: survey.caseLabel,
            officerId: user.id,
            visitByName: user.name,
            authToken: user.token,
            startTime: now,
            endTime: now,
            startLat: survey.coords.lat,
            startLon: survey.coords.lng,
            scope: survey.scope,
            isViolation: survey.isViolation,
            noOfFloors: survey.noOfFloors,
            remarks: survey.remarks,
            mainImageUri: survey.mainImageUri,
            violations: survey.violations,
          };
          await addPendingVisit(visit);
          let uploadedToApi = false;
          let uploadError: string | null = null;
          try {
            const syncResult = await syncPending();
            uploadedToApi = syncResult.uploaded > 0;
            if (uploadedToApi) {
              notifySuccess(uploadCopy.pushedToServer);
            } else if (syncResult.failed > 0) {
              uploadError = uploadCopy.uploadFailedRetry;
              notifySuccess(uploadCopy.savedPushFromSubmissions);
            } else {
              notifySuccess(uploadCopy.savedPushFromSubmissions);
            }
          } catch (e) {
            uploadError = (e as Error).message;
            notifySuccess(uploadCopy.savedPushFromSubmissions);
          }
          navigation.navigate(MAIN_STACK_ROUTES.Summary, {visit, uploadedToApi, uploadError});
        }}
      />
    </SafeAreaView>
  );
}

function ViolationFormRouteScreen() {
  const navigation = useNavigation<any>();
  const {siteScope, setSiteScope, violationDraftRef} = useAuthNavigation();
  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <ViolationFormScreen
        scope={siteScope}
        onScopeChange={setSiteScope}
        onSave={violation => {
          const draft = violationDraftRef.current;
          if (draft) {
            const {currentViolations, setViolations} = draft;
            setViolations([...currentViolations, violation]);
          }
          violationDraftRef.current = null;
          navigation.goBack();
        }}
        onCancel={() => {
          violationDraftRef.current = null;
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

function MySubmissionsRouteScreen() {
  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <MySubmissionsScreen />
    </SafeAreaView>
  );
}

function SummaryRouteScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visit = route.params?.visit;
  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <SummaryScreen
        visit={visit}
        uploadedToApi={route.params?.uploadedToApi}
        uploadError={route.params?.uploadError}
        onDone={() => {
          navigation.reset({index: 0, routes: [{name: MAIN_STACK_ROUTES.Dashboard}]});
        }}
      />
    </SafeAreaView>
  );
}

function MainDrawerScreen() {
  return (
    <MainStackDrawerHost>
      <MainStack />
    </MainStackDrawerHost>
  );
}

function MainStack() {
  const {isDrawerOpen} = useDrawerInteraction();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: MainStackHeader,
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: !isDrawerOpen,
      }}>
      <Stack.Screen name={MAIN_STACK_ROUTES.Dashboard} component={DashboardRouteScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.SiteVisit} component={SiteVisitRouteScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.ViolationForm} component={ViolationFormRouteScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.Summary} component={SummaryRouteScreen} />
      <Stack.Screen name={MAIN_STACK_ROUTES.MySubmissions} component={MySubmissionsRouteScreen} />
    </Stack.Navigator>
  );
}

interface AuthenticatedFlowProps {
  user: SessionUser;
  siteScope: SiteScope;
  setSiteScope: (scope: SiteScope) => void;
  violationDraftRef: React.MutableRefObject<ViolationDraft | null>;
  onSignOut: () => void | Promise<void>;
}

export default function AuthenticatedFlow({
  user,
  siteScope,
  setSiteScope,
  violationDraftRef,
  onSignOut,
}: AuthenticatedFlowProps) {
  const value = useMemo<AuthNavigationContextValue>(
    () => ({user, siteScope, setSiteScope, violationDraftRef, onSignOut}),
    [user, siteScope, setSiteScope, violationDraftRef, onSignOut],
  );

  return (
    <AuthNavigationProvider value={value}>
      <Drawer.Navigator
        drawerContent={props => <AppDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerPosition: 'left',
          drawerType: 'front',
          swipeEnabled: true,
          overlayColor: 'rgba(0, 51, 102, 0.45)',
          drawerStyle: {
            width: '86%',
            maxWidth: 320,
            backgroundColor: '#ffffff',
            marginBottom: 12,
            borderBottomRightRadius: 16,
            borderTopRightRadius: 0,
          },
          sceneContainerStyle: {backgroundColor: colors.background},
        }}>
        <Drawer.Screen name={DRAWER_ROUTES.Main} component={MainDrawerScreen} options={{title: 'Menu'}} />
      </Drawer.Navigator>
    </AuthNavigationProvider>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: colors.background},
});
