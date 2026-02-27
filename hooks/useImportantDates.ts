import { useState, useCallback } from 'react';
import {
  getImportantDates,
  createImportantDate,
  updateImportantDate,
  deleteImportantDate,
} from '@/lib/api/calendar';
import type {
  CalendarItem,
  CreateImportantDateRequest,
  UpdateImportantDateRequest,
} from '@/types/calendar';

export function useImportantDates() {
  const [data, setData] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchImportantDates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getImportantDates();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch important dates'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(
    async (request: CreateImportantDateRequest): Promise<CalendarItem> => {
      try {
        setError(null);
        const result = await createImportantDate(request);
        await fetchImportantDates();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create important date');
        setError(error);
        throw error;
      }
    },
    [fetchImportantDates]
  );

  const update = useCallback(
    async (id: string, request: UpdateImportantDateRequest): Promise<CalendarItem> => {
      try {
        setError(null);
        const result = await updateImportantDate(id, request);
        await fetchImportantDates();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update important date');
        setError(error);
        throw error;
      }
    },
    [fetchImportantDates]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null);
        await deleteImportantDate(id);
        await fetchImportantDates();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete important date');
        setError(error);
        throw error;
      }
    },
    [fetchImportantDates]
  );

  return {
    data,
    isLoading,
    error,
    refetch: fetchImportantDates,
    create,
    update,
    remove,
  };
}
