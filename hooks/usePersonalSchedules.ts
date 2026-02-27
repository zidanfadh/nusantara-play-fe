import { useState, useCallback } from 'react';
import {
  getPersonalSchedules,
  createPersonalSchedule,
  updatePersonalSchedule,
  deletePersonalSchedule,
} from '@/lib/api/calendar';
import type {
  CalendarItem,
  CreatePersonalScheduleRequest,
  UpdatePersonalScheduleRequest,
} from '@/types/calendar';

export function usePersonalSchedules() {
  const [data, setData] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getPersonalSchedules();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch personal schedules'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(
    async (request: CreatePersonalScheduleRequest): Promise<CalendarItem> => {
      try {
        setError(null);
        const result = await createPersonalSchedule(request);
        await fetchSchedules();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create personal schedule');
        setError(error);
        throw error;
      }
    },
    [fetchSchedules]
  );

  const update = useCallback(
    async (id: string, request: UpdatePersonalScheduleRequest): Promise<CalendarItem> => {
      try {
        setError(null);
        const result = await updatePersonalSchedule(id, request);
        await fetchSchedules();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update personal schedule');
        setError(error);
        throw error;
      }
    },
    [fetchSchedules]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null);
        await deletePersonalSchedule(id);
        await fetchSchedules();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete personal schedule');
        setError(error);
        throw error;
      }
    },
    [fetchSchedules]
  );

  return {
    data,
    isLoading,
    error,
    refetch: fetchSchedules,
    create,
    update,
    remove,
  };
}
