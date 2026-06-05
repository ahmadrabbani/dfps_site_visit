import React from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';
import {Appbar} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {DrawerActions} from '@react-navigation/native';
import ConnectionStatusDot from './ConnectionStatusDot';
import {colors} from '../theme/colors';
import {useAuthNavigation} from '../navigation/AuthNavigationContext';
import {useDrawerInteraction} from '../navigation/DrawerInteractionContext';
import {MAIN_STACK_ROUTES} from '../navigation/routeNames';

const TITLES: Record<string, string> = {
  [MAIN_STACK_ROUTES.Dashboard]: 'Dashboard',
  [MAIN_STACK_ROUTES.SiteVisit]: 'Completion Certificate Site Visit',
  [MAIN_STACK_ROUTES.ViolationForm]: 'Violation',
  [MAIN_STACK_ROUTES.Summary]: 'Summary',
  [MAIN_STACK_ROUTES.MySubmissions]: 'My Site Visits & Submissions',
  PendingUploads: 'Pending Uploads',
};

interface AppHeaderProps {
  navigation: any;
  routeName: string;
}

export default function AppHeader({navigation, routeName}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const {onSignOut} = useAuthNavigation();
  const {isDrawerOpen} = useDrawerInteraction();
  const title = TITLES[routeName] || 'DFPS';
  const canGoBack = navigation.canGoBack() && !isDrawerOpen;

  const openDrawer = () => {
    if (isDrawerOpen) {
      return;
    }
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <Appbar.Header mode="center-aligned" elevated statusBarHeight={insets.top} style={styles.header}>
        {canGoBack ? (
          <Appbar.BackAction
            accessibilityLabel="Go back"
            disabled={isDrawerOpen}
            onPress={() => {
              if (!isDrawerOpen) {
                navigation.goBack();
              }
            }}
            color="#ffffff"
          />
        ) : (
          <Appbar.Action
            accessibilityLabel="Open navigation menu"
            icon="menu"
            disabled={isDrawerOpen}
            color="#ffffff"
            onPress={openDrawer}
          />
        )}
        <Appbar.Content
          title={
            <View style={styles.centerTitle}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <ConnectionStatusDot size={14} variant="onPrimary" />
            </View>
          }
        />
        <Appbar.Action
          accessibilityLabel="Sign out"
          icon="logout"
          color="#ffffff"
          onPress={() => onSignOut()}
        />
      </Appbar.Header>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  centerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    maxWidth: '100%',
    paddingHorizontal: 4,
  },
  title: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 17,
    flexShrink: 1,
  },
});
