'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { authClient } from '@/lib/auth/client';
import type { SignUpInput } from '@/lib/auth/types';
import { AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Session state for the whole app (Phase 29: through the auth facade, `lib/auth/`). Supabase mode does what it
 * did before: subscribe to auth changes and read the session once. Local mode: the same through the local
 * session store (which refreshes once on start when the `np_logged_in` cookie is present).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const read = () =>
      authClient.getSession().then((session) => {
        if (!active) return;
        setSignedIn(Boolean(session));
        setIsLoading(false);
      });
    const unsubscribe = authClient.onChange(() => {
      void read();
    });
    void read();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback((email: string, password: string) => authClient.signIn(email, password), []);
  const signUp = useCallback((input: SignUpInput) => authClient.signUp(input), []);
  const signOut = useCallback(() => authClient.signOut(), []);
  const getAccessToken = useCallback(() => authClient.getAccessToken(), []);

  const value: AuthContextType = {
    mode: authClient.mode,
    signedIn,
    isLoading,
    signIn,
    signUp,
    signOut,
    getAccessToken,
    client: authClient,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
