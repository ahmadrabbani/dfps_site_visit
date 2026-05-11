import React from 'react';
import {StatusBar, StyleSheet} from 'react-native';
import {Appbar} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme/colors';
import {useAuthNavigation} from '../navigation/AuthNavigationContext';
import {MAIN_STACK_ROUTES} from '../navigation/routeNames';

const TITLES: Record<string, string> = {
  [MAIN_STACK_ROUTES.Dashboard]: 'Dashboard',
  [MAIN_STACK_ROUTES.SiteVisit]: 'Site visit',
  [MAIN_STACK_ROUTES.ViolationForm]: 'Violation',
  [MAIN_STACK_ROUTES.Summary]: 'Summary',
  PendingUploads: 'Pending uploads',
};

interface AppHeaderProps {
  navigation: any;
  routeName: string;
}

export default function AppHeader({navigation, routeName}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const {onSignOut} = useAuthNavigation();
  const title = TITLES[routeName] || 'DFPS';
  const canGoBack = navigation.canGoBack();

  const openDrawer = () => {
    const parent = navigation.getParent();
    if (parent && typeof parent.openDrawer === 'function') {
      parent.openDrawer();
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <Appbar.Header mode="center-aligned" elevated statusBarHeight={insets.top} style={styles.header}>
        {canGoBack ? (
          <Appbar.BackAction
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            color="#ffffff"
          />
        ) : (
          <Appbar.Action
            accessibilityLabel="Open navigation menu"
            icon="menu"
            color="#ffffff"
            onPress={openDrawer}
          />
        )}
        <Appbar.Content title={title} titleStyle={styles.title} />
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
  header: {backgroundColor: colors.primary},
  title: {color: '#ffffff'},
});
