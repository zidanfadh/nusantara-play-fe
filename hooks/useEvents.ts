import { useState, useEffect } from 'react';
import type {
  Event,
  EventRegistration,
  EventListParams,
  EventListResponse,
} from '@/types/events';
import * as eventsApi from '@/lib/api/events';

/**
 * Hook to fetch events list
 */
export function useEvents(params?: EventListParams) {
  const [data, setData] = useState<EventListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);
        const result = await eventsApi.listEvents(params);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch events'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchEvents();

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(params)]);

  return { data, loading, error };
}

/**
 * Hook to fetch my created events
 */
export function useMyEvents(params?: EventListParams) {
  const [data, setData] = useState<EventListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMyEvents() {
      try {
        setLoading(true);
        setError(null);
        const result = await eventsApi.getMyEvents(params);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch my events'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchMyEvents();

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(params)]);

  return { data, loading, error };
}

/**
 * Hook to fetch event by ID
 */
export function useEvent(id: string | null) {
  const [data, setData] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchEvent() {
      try {
        setLoading(true);
        setError(null);
        const result = await eventsApi.getEventById(id!);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch event'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { data, loading, error };
}

/**
 * Hook to fetch my registrations
 */
export function useMyRegistrations() {
  const [data, setData] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMyRegistrations() {
      try {
        setLoading(true);
        setError(null);
        const result = await eventsApi.getMyRegistrations();
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch registrations'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchMyRegistrations();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, loading, error };
}

/**
 * Hook to fetch event registrations (for organizer)
 */
export function useEventRegistrations(eventId: string | null) {
  const [data, setData] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!eventId) {
      setData([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchRegistrations() {
      try {
        setLoading(true);
        setError(null);
        const result = await eventsApi.getEventRegistrations(eventId!);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch registrations'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRegistrations();

    return () => {
      isMounted = false;
    };
  }, [eventId, refresh]);

  const refetch = () => setRefresh((prev) => prev + 1);

  return { data, loading, error, refetch };
}
