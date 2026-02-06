'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Daerah } from '@/types/daerah';
import { getDaerahById } from '@/lib/api/daerah';

export function useDaerahById(id: string | null) {
  const [daerah, setDaerah] = useState<Daerah | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDaerah = useCallback(async () => {
    if (!id) {
      setDaerah(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getDaerahById(id);
      setDaerah(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
      setDaerah(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDaerah();
  }, [fetchDaerah]);

  return {
    daerah,
    isLoading,
    error,
    refresh: fetchDaerah,
  };
}
