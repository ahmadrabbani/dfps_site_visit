import React, {useCallback, useMemo, useRef, useState, useEffect} from 'react';
import {InteractionManager, Pressable, StyleSheet, Text, View, ActivityIndicator, Image} from 'react-native';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
  useDrawerStatus,
} from '@react-navigation/drawer';
import {Icon} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNetInfo} from '@react-native-community/netinfo';
import type {NavigationState} from '@react-navigation/native';
import {useAuthNavigation} from '../navigation/AuthNavigationContext';
import {DRAWER_ROUTES, MAIN_STACK_ROUTES} from '../navigation/routeNames';
import {colors} from '../theme/colors';
import {getAppHeaderHeight} from '../theme/screenLayout';
import {getPendingVisits} from '../services/storage';
import {syncPending} from '../services/syncService';
import {prepareSiteVisitLocation} from '../utils/prepareSiteVisitLocation';
import ConnectionStatusDot from './ConnectionStatusDot';

const ldaLogo = require('../../LDA-logo.png');

type MenuItem = {
  route: string;
  label: string;
  subtitle: string;
  icon: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    route: MAIN_STACK_ROUTES.Dashboard,
    label: 'Dashboard',
    subtitle: 'Overview and quick actions',
    icon: 'view-dashboard-outline',
  },
  {
    route: MAIN_STACK_ROUTES.SiteVisit,
    label: 'DFPS Site Visit',
    subtitle: 'Completion certificate survey',
    icon: 'map-marker-check-outline',
  },
  {
    route: MAIN_STACK_ROUTES.MySubmissions,
    label: 'My Site Visits & Submissions',
    subtitle: 'Saved visits and server upload',
    icon: 'cloud-upload-outline',
  },
];

function getActiveStackRouteName(state: NavigationState | undefined): string | undefined {
  if (!state) {
    return undefined;
  }
  const route = state.routes[state.index ?? 0];
  if (route.state) {
    return getActiveStackRouteName(route.state as NavigationState);
  }
  return route.name;
}

export default function AppDrawerContent(props: DrawerContentComponentProps) {
  const {navigation, state} = props;
  const insets = useSafeAreaInsets();
  const {user, onSignOut} = useAuthNavigation();
  const drawerStatus = useDrawerStatus();
  const netInfo = useNetInfo();
  const isOnline = !!netInfo.isConnected;

  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [menuNavigating, setMenuNavigating] = useState(false);
  const menuNavigatingRef = useRef(false);

  const activeRoute = useMemo(() => getActiveStackRouteName(state), [state]);
  const topBarHeight = getAppHeaderHeight(insets.top);

  const fetchPendingCount = useCallback(async () => {
    try {
      const visits = await getPendingVisits();
      setPendingCount(visits.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  useEffect(() => {
    if (drawerStatus === 'open') {
      fetchPendingCount();
    }
  }, [drawerStatus, fetchPendingCount]);

  const handleSync = useCallback(async () => {
    if (syncing || !isOnline) {
      return;
    }
    setSyncing(true);
    try {
      await syncPending();
    } catch (e) {
      // Errors are already logged and alerted inside syncPending
    } finally {
      await fetchPendingCount();
      setSyncing(false);
    }
  }, [syncing, isOnline, fetchPendingCount]);

  const navigateTo = useCallback(
    async (screen: string) => {
      if (menuNavigatingRef.current) {
        return;
      }
      menuNavigatingRef.current = true;
      setMenuNavigating(true);
      try {
        navigation.closeDrawer();
        await new Promise<void>(resolve => {
          InteractionManager.runAfterInteractions(() => resolve());
        });
        await new Promise<void>(resolve => setTimeout(resolve, 320));

        if (screen === MAIN_STACK_ROUTES.SiteVisit) {
          const allowed = await prepareSiteVisitLocation();
          if (!allowed) {
            return;
          }
        }
        navigation.navigate(DRAWER_ROUTES.Main, {
          screen,
          params: screen === MAIN_STACK_ROUTES.SiteVisit ? {locationPrepared: true} : undefined,
        });
      } finally {
        menuNavigatingRef.current = false;
        setMenuNavigating(false);
      }
    },
    [navigation],
  );

  const handleSignOut = useCallback(() => {
    navigation.closeDrawer();
    onSignOut();
  }, [navigation, onSignOut]);

  return (
    <View style={styles.root}>
      {/* Aligns with the main screen AppHeader — drawer body starts below this. */}
      <View style={[styles.topBarSpacer, {height: topBarHeight}]} />

      <View style={styles.drawerBody}>
        <View style={styles.profileSection}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconWrap}>
              <Image source={ldaLogo} style={styles.brandLogo} resizeMode="contain" />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandTitle}>DFPS Site Visit</Text>
              <Text style={styles.brandSubtitle}>Completion Certificate</Text>
            </View>
          </View>

          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Icon source="account" size={28} color={colors.primary} />
            </View>
            <View style={styles.userMeta}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.name}
              </Text>
              <View style={styles.statusRow}>
                <ConnectionStatusDot size={9} />
                <Text style={styles.statusText}>
                  {isOnline ? 'Online' : 'Offline Mode'}
                </Text>
              </View>
            </View>
          </View>
        </View>

      <DrawerContentScrollView
        {...props}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Menu</Text>

        {MENU_ITEMS.map(item => {
          const active = activeRoute === item.route;
          const isMySubmissions = item.route === MAIN_STACK_ROUTES.MySubmissions;
          return (
            <Pressable
              key={item.route}
              disabled={menuNavigating || syncing}
              accessibilityRole="button"
              accessibilityState={{selected: active, disabled: menuNavigating || syncing}}
              onPress={() => void navigateTo(item.route)}
              style={({pressed}) => [
                styles.menuItem,
                active ? styles.menuItemActive : null,
                pressed && !active ? styles.menuItemPressed : null,
              ]}>
              <View style={styles.menuItemTopRow}>
                <View style={styles.menuItemLabelContainer}>
                  <Icon
                    source={item.icon}
                    size={26}
                    color={active ? colors.primary : colors.primaryLight}
                  />
                  <Text style={[styles.menuLabel, active ? styles.menuLabelActive : null]}>
                    {item.label}
                  </Text>
                </View>
                {isMySubmissions && pendingCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.menuSubtitle} numberOfLines={2}>
                {item.subtitle}
              </Text>
              {active ? <View style={styles.activeBar} /> : null}
            </Pressable>
          );
        })}
      </DrawerContentScrollView>

      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
        {pendingCount > 0 ? (
          <View style={styles.syncCard}>
            <View style={styles.syncCardMeta}>
              <Icon source="cloud-sync-outline" size={22} color="#b45309" />
              <View style={styles.syncCardText}>
                <Text style={styles.syncCardTitle}>
                  {pendingCount} unsynced {pendingCount === 1 ? 'visit' : 'visits'}
                </Text>
                <Text style={styles.syncCardSubtitle}>
                  {isOnline ? 'Ready to upload' : 'Connect to sync'}
                </Text>
              </View>
            </View>
            <Pressable
              disabled={syncing || !isOnline}
              onPress={handleSync}
              style={({pressed}) => [
                styles.syncButton,
                !isOnline ? styles.syncButtonDisabled : null,
                pressed && isOnline ? styles.syncButtonPressed : null,
              ]}>
              {syncing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.syncButtonText}>Sync</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.footerDivider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={handleSignOut}
          style={({pressed}) => [styles.signOutButton, pressed ? styles.signOutPressed : null]}>
          <Icon source="logout" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Text style={styles.footerVersion}>Site visit · v1.0</Text>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBarSpacer: {
    backgroundColor: colors.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  drawerBody: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brandLogo: {
    width: 42,
    height: 42,
  },
  brandText: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 3,
    fontWeight: '500',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f0f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedText,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 4,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  menuItemActive: {
    backgroundColor: '#e8f0f8',
  },
  menuItemPressed: {
    backgroundColor: '#f3f4f6',
  },
  menuItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  menuItemLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 8,
  },
  menuLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  menuLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  menuSubtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginLeft: 40,
    lineHeight: 20,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: colors.accent,
  },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 28, // slightly increased width for cleaner fit
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: '#ffffff',
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  syncCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  syncCardText: {
    marginLeft: 8,
    flex: 1,
  },
  syncCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  syncCardSubtitle: {
    fontSize: 10,
    color: '#b45309',
    marginTop: 1,
  },
  syncButton: {
    backgroundColor: '#d97706',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  syncButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  syncButtonPressed: {
    backgroundColor: '#b45309',
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    gap: 8,
  },
  signOutPressed: {
    opacity: 0.85,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },
  footerVersion: {
    fontSize: 11,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: 10,
  },
});
