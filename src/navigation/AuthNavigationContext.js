import React, {createContext, useContext} from 'react';

const AuthNavigationContext = createContext(null);

export function AuthNavigationProvider({value, children}) {
  return <AuthNavigationContext.Provider value={value}>{children}</AuthNavigationContext.Provider>;
}

export function useAuthNavigation() {
  const ctx = useContext(AuthNavigationContext);
  if (ctx == null) {
    throw new Error('useAuthNavigation must be used within AuthNavigationProvider');
  }
  return ctx;
}
