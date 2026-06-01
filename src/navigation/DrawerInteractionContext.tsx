import React, {createContext, useContext, useEffect, useMemo} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import {useDrawerStatus} from '@react-navigation/drawer';
import {DrawerActions, useNavigation} from '@react-navigation/native';
import type {PropsWithChildren} from 'react';

type DrawerInteractionContextValue = {
  isDrawerOpen: boolean;
};

const DrawerInteractionContext = createContext<DrawerInteractionContextValue>({
  isDrawerOpen: false,
});

export function useDrawerInteraction(): DrawerInteractionContextValue {
  return useContext(DrawerInteractionContext);
}

/** Blocks background interaction while the drawer is open or animating. */
export function MainStackDrawerHost({children}: PropsWithChildren) {
  const drawerStatus = useDrawerStatus();
  const navigation = useNavigation();
  const isDrawerOpen = drawerStatus === 'open' || drawerStatus === 'settling';

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.dispatch(DrawerActions.closeDrawer());
      return true;
    });
    return () => subscription.remove();
  }, [isDrawerOpen, navigation]);

  const value = useMemo(() => ({isDrawerOpen}), [isDrawerOpen]);

  return (
    <DrawerInteractionContext.Provider value={value}>
      <View
        style={styles.host}
        pointerEvents={isDrawerOpen ? 'none' : 'box-none'}
        accessibilityElementsHidden={isDrawerOpen}
        importantForAccessibility={isDrawerOpen ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
    </DrawerInteractionContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: {flex: 1},
});
