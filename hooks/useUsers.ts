'use client';

import { useState, useCallback } from 'react';
import { getAllUsers } from '@/lib/api/users';
import type { UsersListResponse, UserFilters } from '@/types/user';

export function useUsers(initialFilters?: UserFilters) {
    const [data, setData] = useState<UsersListResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [filters, setFilters] = useState<UserFilters>(
        initialFilters || { page: 1, limit: 20 }
    );

    const fetchData = useCallback(async (newFilters?: UserFilters) => {
        const currentFilters = newFilters || filters;
        setIsLoading(true);
        setError(null);

        try {
            const response = await getAllUsers(currentFilters);
            setData(response);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An error occurred'));
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    const updateFilters = useCallback((newFilters: UserFilters) => {
        setFilters(newFilters);
        fetchData(newFilters);
    }, [fetchData]);

    const changePage = useCallback((page: number) => {
        const newFilters = { ...filters, page };
        setFilters(newFilters);
        fetchData(newFilters);
    }, [filters, fetchData]);

    const refresh = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        isLoading,
        error,
        filters,
        updateFilters,
        changePage,
        refresh,
        fetchData,
    };
}
