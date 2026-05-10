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
import PendingUploadsScreen from '../screens/PendingUploadsScreen';
import {addPendingVisit} from '../services/storage';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function AppDrawerContent(props) {
  const {navigation} = props;
  const {onSignOut} = useAuthNavigation();

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScroll}>
      <DrawerItem
        label="Dashboard"
        onPress={() => {
          navigation.navigate('Main', {screen: 'Dashboard'});
          navigation.closeDrawer();
        }}
      />
      <DrawerItem
        label="Site visit"
        onPress={() => {
          navigation.navigate('Main', {screen: 'SiteVisit'});
          navigation.closeDrawer();
        }}
      />
      <DrawerItem
        label="Pending uploads"
        onPress={() => {
          navigation.navigate('Main', {screen: 'PendingUploads'});
          navigation.closeDrawer();
        }}
      />
      <DrawerItem
        label="Sign out"
        onPress={() => {
          navigation.closeDrawer();
          onSignOut();
        }}
      />
    </DrawerContentScrollView>
  );
}

function MainStackHeader(props) {
  return <AppHeader navigation={props.navigation} routeName={props.route.name} />;
}

function DashboardRouteScreen() {
  const navigation = useNavigation();
  const {user, setSiteScope} = useAuthNavigation();
  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <DashboardScreen
        user={user}
        onStartVisit={() => {
          setSiteScope('residential');
          navigation.navigate('SiteVisit');
        }}
      />
    </SafeAreaView>
  );
}

function SiteVisitRouteScreen() {
  const navigation = useNavigation();
  const {user, siteScope, setSiteScope, violationDraftRef} = useAuthNavigation();
  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <SiteVisitScreen
        user={user}
        siteScope={siteScope}
        onScopeChange={setSiteScope}
        onAddViolation={(currentViolations, setViolations) => {
          violationDraftRef.current = {currentViolations, setViolations};
          navigation.navigate('ViolationForm');
        }}
        onCompleteVisit={async (violations, scopeAtVisit) => {
          const now = new Date().toISOString();
          const visitScope = scopeAtVisit || siteScope;
          const visit = {
            localId: 'local-' + Date.now(),
            siteId: 1,
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
          navigation.navigate('Summary', {visit});
        }}
      />
    </SafeAreaView>
  );
}

function ViolationFormRouteScreen() {
  const navigation = useNavigation();
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

function SummaryRouteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const visit = route.params?.visit;
  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <SummaryScreen
        visit={visit}
        onDone={() => {
          navigation.reset({index: 0, routes: [{name: 'Dashboard'}]});
        }}
      />
    </SafeAreaView>
  );
}

function PendingUploadsRouteScreen() {
  return (
    <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
      <PendingUploadsScreen />
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
      <Stack.Screen name="Dashboard" component={DashboardRouteScreen} />
      <Stack.Screen name="SiteVisit" component={SiteVisitRouteScreen} />
      <Stack.Screen name="ViolationForm" component={ViolationFormRouteScreen} />
      <Stack.Screen name="Summary" component={SummaryRouteScreen} />
      <Stack.Screen name="PendingUploads" component={PendingUploadsRouteScreen} />
    </Stack.Navigator>
  );
}

export default function AuthenticatedFlow({user, siteScope, setSiteScope, violationDraftRef, onSignOut}) {
  const value = useMemo(
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
        <Drawer.Screen name="Main" component={MainStack} options={{title: 'Menu'}} />
      </Drawer.Navigator>
    </AuthNavigationProvider>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: '#f5f5f5'},
  drawerScroll: {paddingTop: 8},
});
