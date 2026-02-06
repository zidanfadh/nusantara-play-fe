'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Daerah, DaerahListResponse, DaerahFilters } from '@/types/daerah';
import { getAllDaerah } from '@/lib/api/daerah';

export function useDaerah(initialFilters?: DaerahFilters) {
  const [data, setData] = useState<DaerahListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<DaerahFilters>(
    initialFilters || { page: 1, limit: 20 }
  );

  const fetchData = useCallback(async (newFilters?: DaerahFilters) => {
    const currentFilters = newFilters || filters;
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAllDaerah(currentFilters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((newFilters: DaerahFilters) => {
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
