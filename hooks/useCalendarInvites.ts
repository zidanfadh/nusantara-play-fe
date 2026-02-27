import { useState, useCallback } from 'react';
import {
  getMyInvites,
  getInvites,
  inviteUsers,
  removeInvite,
  respondToInvite,
} from '@/lib/api/calendar';
import type {
  CalendarInvite,
  CalendarInviteWithUser,
  CalendarInviteWithItem,
  InviteUsersRequest,
  RespondToInviteRequest,
} from '@/types/calendar';

export function useCalendarInvites() {
  const [myInvites, setMyInvites] = useState<CalendarInviteWithItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMyInvites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getMyInvites();
      setMyInvites(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch invites'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const respond = useCallback(
    async (inviteId: string, request: RespondToInviteRequest): Promise<void> => {
      try {
        setError(null);
        await respondToInvite(inviteId, request);
        await fetchMyInvites();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to respond to invite');
        setError(error);
        throw error;
      }
    },
    [fetchMyInvites]
  );

  return {
    myInvites,
    isLoading,
    error,
    refetch: fetchMyInvites,
    respond,
  };
}

export function useItemInvites(calendarItemId: string | null) {
  const [invites, setInvites] = useState<CalendarInviteWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvites = useCallback(async () => {
    if (!calendarItemId) {
      setInvites([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await getInvites(calendarItemId);
      setInvites(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch invites'));
    } finally {
      setIsLoading(false);
    }
  }, [calendarItemId]);

  const invite = useCallback(
    async (request: InviteUsersRequest): Promise<CalendarInvite[]> => {
      if (!calendarItemId) {
        throw new Error('Calendar item ID is required');
      }

      try {
        setError(null);
        const result = await inviteUsers(calendarItemId, request);
        await fetchInvites();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to invite users');
        setError(error);
        throw error;
      }
    },
    [calendarItemId, fetchInvites]
  );

  const remove = useCallback(
    async (userId: string): Promise<void> => {
      if (!calendarItemId) {
        throw new Error('Calendar item ID is required');
      }

      try {
        setError(null);
        await removeInvite(calendarItemId, userId);
        await fetchInvites();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to remove invite');
        setError(error);
        throw error;
      }
    },
    [calendarItemId, fetchInvites]
  );

  return {
    invites,
    isLoading,
    error,
    refetch: fetchInvites,
    invite,
    remove,
  };
}
