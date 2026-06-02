import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {InteractionManager} from 'react-native';
import {APP_TOUR_STEP_COUNT} from '../constants/appTourSteps';
import {hasCompletedAppTour, setAppTourCompleted} from '../services/appTourStorage';

interface AppTourContextValue {
  visible: boolean;
  stepIndex: number;
  stepCount: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
}

const AppTourContext = createContext<AppTourContextValue | null>(null);

interface AppTourProviderProps extends PropsWithChildren {
  username: string;
}

export function AppTourProvider({username, children}: AppTourProviderProps) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const autoShownRef = useRef(false);

  const finishTour = useCallback(async () => {
    await setAppTourCompleted(username);
    setVisible(false);
    setStepIndex(0);
  }, [username]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setVisible(true);
  }, []);

  const skipTour = useCallback(() => {
    void finishTour();
  }, [finishTour]);

  const nextStep = useCallback(() => {
    setStepIndex(prev => Math.min(APP_TOUR_STEP_COUNT - 1, prev + 1));
  }, []);

  const prevStep = useCallback(() => {
    setStepIndex(prev => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    autoShownRef.current = false;
  }, [username]);

  useEffect(() => {
    if (!username.trim() || autoShownRef.current) {
      return;
    }
    let cancelled = false;
    (async () => {
      const completed = await hasCompletedAppTour(username);
      if (cancelled || completed) {
        return;
      }
      autoShownRef.current = true;
      InteractionManager.runAfterInteractions(() => {
        if (!cancelled) {
          setTimeout(() => {
            setStepIndex(0);
            setVisible(true);
          }, 500);
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const value = useMemo<AppTourContextValue>(
    () => ({
      visible,
      stepIndex,
      stepCount: APP_TOUR_STEP_COUNT,
      isFirstStep: stepIndex === 0,
      isLastStep: stepIndex === APP_TOUR_STEP_COUNT - 1,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      finishTour,
    }),
    [visible, stepIndex, startTour, nextStep, prevStep, skipTour, finishTour],
  );

  return <AppTourContext.Provider value={value}>{children}</AppTourContext.Provider>;
}

export function useAppTour(): AppTourContextValue {
  const ctx = useContext(AppTourContext);
  if (ctx == null) {
    throw new Error('useAppTour must be used within AppTourProvider');
  }
  return ctx;
}
