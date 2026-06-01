import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ToastItem from './ToastItem';
import {
  registerToastHandler,
  type ShowToastOptions,
  type ToastVariant,
} from './toastController';
import {TOAST_DURATION_MS} from './toastTheme';

interface ActiveToast extends ShowToastOptions {
  id: string;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export default function ToastProvider({children}: ToastProviderProps) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<ActiveToast | null>(null);
  const queueRef = useRef<ActiveToast[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dequeue = useCallback(() => {
    clearTimer();
    const next = queueRef.current.shift() ?? null;
    if (!next) {
      showingRef.current = false;
      setActive(null);
      return;
    }
    showingRef.current = true;
    setActive(next);
    const duration = next.durationMs ?? TOAST_DURATION_MS[next.variant as ToastVariant];
    timerRef.current = setTimeout(() => {
      dequeue();
    }, duration);
  }, [clearTimer]);

  const enqueue = useCallback(
    (options: ShowToastOptions) => {
      const item: ActiveToast = {
        ...options,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      queueRef.current.push(item);
      if (!showingRef.current) {
        dequeue();
      }
    },
    [dequeue],
  );

  const handleDismiss = useCallback(() => {
    clearTimer();
    dequeue();
  }, [clearTimer, dequeue]);

  useEffect(() => {
    registerToastHandler(enqueue);
    return () => {
      registerToastHandler(null);
      clearTimer();
      queueRef.current = [];
      showingRef.current = false;
    };
  }, [clearTimer, enqueue]);

  return (
    <View style={styles.root}>
      {children}
      <View
        style={[styles.host, {top: insets.top + 8}]}
        pointerEvents="box-none"
        accessibilityLiveRegion="polite">
        {active ? (
          <ToastItem
            key={active.id}
            message={active.message}
            variant={active.variant}
            onDismiss={handleDismiss}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
});
