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
import {usePendingVisitCount, usePendingVisitsQuery} from '../hooks/usePendingVisitsQuery';
import {useSyncPendingMutation} from '../hooks/useSyncPendingMutation';
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

  const [menuNavigating, setMenuNavigating] = useState(false);
  const pendingCount = usePendingVisitCount();
  const syncMutation = useSyncPendingMutation();
  const menuNavigatingRef = useRef(false);

  const activeRoute = useMemo(() => getActiveStackRouteName(state), [state]);
  const topBarHeight = getAppHeaderHeight(insets.top);

  const {refetch: refetchPending} = usePendingVisitsQuery();

  useEffect(() => {
    if (drawerStatus === 'open') {
      void refetchPending();
    }
  }, [drawerStatus, refetchPending]);

  const handleSync = useCallback(() => {
    if (syncMutation.isPending || !isOnline) {
      return;
    }
    syncMutation.mutate();
  }, [isOnline, syncMutation]);

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
        <View style={styles.header}>
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
              <Icon source="account" size={26} color={colors.primary} />
            </View>
            <View style={styles.userMeta}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.name}
              </Text>
              <View style={styles.statusRow}>
                <ConnectionStatusDot size={8} variant="onPrimary" />
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
        {pendingCount > 0 ? (
          <View style={styles.pendingAlert}>
            <View style={styles.pendingDot} />
            <Text style={styles.pendingAlertText}>
              {pendingCount} {pendingCount === 1 ? 'visit' : 'visits'} not uploaded yet
            </Text>
          </View>
        ) : null}

        {MENU_ITEMS.map((item, index) => {
          const active = activeRoute === item.route;
          const isMySubmissions = item.route === MAIN_STACK_ROUTES.MySubmissions;
          const isLast = index === MENU_ITEMS.length - 1;
          return (
            <View key={item.route}>
              <Pressable
                disabled={menuNavigating || syncMutation.isPending}
                accessibilityRole="button"
                accessibilityState={{selected: active, disabled: menuNavigating || syncMutation.isPending}}
                onPress={() => void navigateTo(item.route)}
                style={({pressed}) => [
                  styles.menuItem,
                  active ? styles.menuItemActive : null,
                  isMySubmissions && pendingCount > 0 ? styles.menuItemPending : null,
                  pressed && !active ? styles.menuItemPressed : null,
                ]}>
                <View style={styles.menuItemTopRow}>
                  <View style={styles.menuItemLabelContainer}>
                    <Icon
                      source={item.icon}
                      size={22}
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
              {!isLast ? <View style={styles.menuDivider} /> : null}
            </View>
          );
        })}
        </DrawerContentScrollView>

      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
        {pendingCount > 0 ? (
          <View style={[styles.syncCard, styles.syncCardPending]}>
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
              disabled={syncMutation.isPending || !isOnline}
              onPress={handleSync}
              style={({pressed}) => [
                styles.syncButton,
                !isOnline ? styles.syncButtonDisabled : null,
                pressed && isOnline ? styles.syncButtonPressed : null,
              ]}>
              {syncMutation.isPending ? (
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
          <Icon source="logout" size={20} color="#ffffff" />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Text style={styles.footerBrand}>DFPS Site Visit</Text>
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
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
    fontWeight: '500',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedText,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 8,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 14,
  },
  menuItemActive: {
    backgroundColor: '#e8f0f8',
  },
  menuItemPending: {
    borderWidth: 2,
    borderColor: colors.danger,
  },
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginRight: 8,
  },
  pendingAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  menuItemPressed: {
    backgroundColor: '#f3f4f6',
  },
  menuItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  menuItemLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  menuLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginLeft: 32,
    lineHeight: 17,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
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
    alignItems: 'center',
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
    alignSelf: 'stretch',
    width: '100%',
  },
  syncCardPending: {
    borderColor: '#fecaca',
    borderWidth: 1.5,
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
    alignSelf: 'stretch',
    width: '100%',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    gap: 8,
  },
  signOutPressed: {
    opacity: 0.88,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.3,
  },
});
