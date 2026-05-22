import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import {useNavigation, useRoute} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthNavigationProvider, useAuthNavigation} from './AuthNavigationContext';
import AppHeader from '../components/AppHeader';
import DashboardScreen from '../screens/DashboardScreen';
import SiteVisitScreen from '../screens/SiteVisitScreen';
import ViolationFormScreen from '../screens/ViolationFormScreen';
import SummaryScreen from '../screens/SummaryScreen';
import MySubmissionsScreen from '../screens/MySubmissionsScreen';
import {addPendingVisit} from '../services/storage';
import {syncPending} from '../services/syncService';
import {notifySuccess} from '../utils/notify';
import {DRAWER_ROUTES, MAIN_STACK_ROUTES} from './routeNames';
import type {AuthNavigationContextValue, CcSurveyCompletePayload, SiteScope, ViolationDraft} from '../types/app';
import type {SessionUser} from '../services/api';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function AppDrawerContent(props: any) {
  const {navigation} = props;
  const {onSignOut} = useAuthNavigation();

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScroll}>
      <DrawerItem
        label="Dashboard"
        onPress={() => {
          navigation.navigate(DRAWER_ROUTES.Main, {screen: MAIN_STACK_ROUTES.Dashboard});
          navigation.closeDrawer();
        }}
      />
      <DrawerItem
        label="Site visit"
        onPress={() => {
          navigation.navigate(DRAWER_ROUTES.Main, {screen: MAIN_STACK_ROUTES.SiteVisit});
          navigation.closeDrawer();
        }}
      />
      <DrawerItem
        label="My submissions"
        onPress={() => {
          navigation.navigate(DRAWER_ROUTES.Main, {screen: MAIN_STACK_ROUTES.MySubmissions});
          navigation.closeDrawer();
        }}
      />
      <DrawerItem
        onPress={() => {
          navigation.closeDrawer();
          onSignOut();
        }}
      />
    </DrawerContentScrollView>
  );
}

function MainStackHeader(props: any) {
  return <AppHeader navigation={props.navigation} routeName={props.route.name} />;
}

function DashboardRouteScreen() {
  const navigation = useNavigation<any>();
  const {user, setSiteScope} = useAuthNavigation();
  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <DashboardScreen
        user={user}
        onStartVisit={() => {
          setSiteScope('residential');
          navigation.navigate(MAIN_STACK_ROUTES.SiteVisit);
        }}
      />
    </SafeAreaView>
  );
}

function SiteVisitRouteScreen() {
  const navigation = useNavigation<any>();
  const {user, siteScope, setSiteScope, violationDraftRef} = useAuthNavigation();
  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <SiteVisitScreen
        user={user}
        siteScope={siteScope}
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
          const syncResult = await syncPending();
          if (syncResult.uploaded > 0) {
            notifySuccess('Site visit uploaded to the server.');
          } else {
            notifySuccess('Site visit saved on device. It will sync when online.');
          }
          navigation.navigate(MAIN_STACK_ROUTES.Summary, {visit});
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
        onDone={() => {
          navigation.reset({index: 0, routes: [{name: MAIN_STACK_ROUTES.Dashboard}]});
        }}
      />
    </SafeAreaView>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: MainStackHeader,
        animation: 'slide_from_right',
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
        drawerContent={AppDrawerContent}
        screenOptions={{
          headerShown: false,
          drawerPosition: 'left',
          swipeEnabled: true,
          overlayColor: 'rgba(0,0,0,0.35)',
        }}>
        <Drawer.Screen name={DRAWER_ROUTES.Main} component={MainStack} options={{title: 'Menu'}} />
      </Drawer.Navigator>
    </AuthNavigationProvider>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: '#f5f5f5'},
  drawerScroll: {paddingTop: 8},
});
