'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/api/users';
import type { UserProfile } from '@/types/user';

export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setUser(null);
        return;
      }

      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    isLoading,
    error,
    refresh: fetchUser,
    setUser,
  };
}
