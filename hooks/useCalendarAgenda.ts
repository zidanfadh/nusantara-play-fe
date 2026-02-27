import { useState, useEffect } from 'react';
import { getCalendarAgenda } from '@/lib/api/calendar';
import type {
  CalendarAgendaResponse,
  CalendarAgendaQueryParams,
} from '@/types/calendar';

export function useCalendarAgenda(params: CalendarAgendaQueryParams) {
  const [data, setData] = useState<CalendarAgendaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgenda = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getCalendarAgenda(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agenda'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgenda();
  }, [
    params.startDate,
    params.endDate,
    params.source,
    params.daerah_id,
    params.search,
    params.page,
    params.limit,
  ]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAgenda,
  };
}
