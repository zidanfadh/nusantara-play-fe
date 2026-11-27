'use client';

import { useState, useEffect, useCallback } from 'react';
import { authClient } from '@/lib/auth/client';
import type { UserProfile } from '@/types/user';

/**
 * The signed-in user from the backend (`GET /users/me`: role, profile), or null. Phase 29: through the auth
 * facade. Supabase mode: session present → `/users/me` (as before). Local mode: the user from the local session
 * (login and refresh return the same object), refreshed when another tab signs in or out.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setUser(await authClient.currentUser());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    // Supabase mode never re-read the user on auth events; keep it that way.
    if (authClient.mode !== 'local') return;
    return authClient.onChange((event) => {
      if (event !== 'refreshed') void fetchUser();
    });
  }, [fetchUser]);

  return {
    user,
    isLoading,
    error,
    refresh: fetchUser,
    setUser,
  };
}
