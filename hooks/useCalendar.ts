import { useState, useEffect } from 'react';
import { getCalendar } from '@/lib/api/calendar';
import type { CalendarResponse, CalendarQueryParams } from '@/types/calendar';

export function useCalendar(params: CalendarQueryParams) {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCalendar = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getCalendar(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch calendar'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [
    params.year,
    params.month,
    params.view,
    params.week,
    params.source,
    params.visibility,
    params.daerah_id,
    params.include_events,
    params.search,
  ]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchCalendar,
  };
}
