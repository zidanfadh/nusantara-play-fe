import { useState, useEffect, useCallback } from 'react';
import { getCalendarItem } from '@/lib/api/calendar';
import type { CalendarItemDetail } from '@/types/calendar';

export function useCalendarItem(id: string | null) {
  const [data, setData] = useState<CalendarItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchItem = useCallback(async () => {
    if (!id) {
      setData(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await getCalendarItem(id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch calendar item'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchItem,
  };
}
