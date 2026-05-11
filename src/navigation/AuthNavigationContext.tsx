import React, {createContext, useContext} from 'react';
import type {PropsWithChildren} from 'react';
import type {AuthNavigationContextValue} from '../types/app';

const AuthNavigationContext = createContext<AuthNavigationContextValue | null>(null);

interface AuthNavigationProviderProps extends PropsWithChildren {
  value: AuthNavigationContextValue;
}

export function AuthNavigationProvider({value, children}: AuthNavigationProviderProps) {
  return <AuthNavigationContext.Provider value={value}>{children}</AuthNavigationContext.Provider>;
}

export function useAuthNavigation() {
  const ctx = useContext(AuthNavigationContext);
  if (ctx == null) {
    throw new Error('useAuthNavigation must be used within AuthNavigationProvider');
  }
  return ctx;
}
