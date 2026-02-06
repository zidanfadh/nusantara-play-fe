'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/api/users';
import type { UserProfile } from '@/types/user';

export function useCurrentUser() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchUser = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const userData = await getCurrentUser();
            setUser(userData);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch user'));
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    return {
        user,
        isLoading,
        error,
        refresh: fetchUser,
        setUser, // For updating after edit
    };
}
