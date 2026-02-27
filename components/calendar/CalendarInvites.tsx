'use client';

import { useEffect, useState } from 'react';
import { useCalendarInvites } from '@/hooks/useCalendarInvites';
import { CalendarInviteStatus } from '@/types/calendar';

export function CalendarInvites() {
  const { myInvites, isLoading, error, refetch, respond } = useCalendarInvites();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    refetch();
  }, []);

  const handleRespond = async (inviteId: string, status: CalendarInviteStatus.ACCEPTED | CalendarInviteStatus.DECLINED) => {
    setRespondingId(inviteId);
    try {
      await respond(inviteId, { status });
    } catch (err) {
      console.error('Failed to respond:', err);
    } finally {
      setRespondingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: CalendarInviteStatus) => {
    const styles = {
      [CalendarInviteStatus.PENDING]:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      [CalendarInviteStatus.ACCEPTED]:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [CalendarInviteStatus.DECLINED]:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    return styles[status];
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
        Error: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  const pendingInvites = myInvites.filter(
    (invite) => invite.status === CalendarInviteStatus.PENDING
  );
  const otherInvites = myInvites.filter(
    (invite) => invite.status !== CalendarInviteStatus.PENDING
  );

  return (
    <div className="space-y-6">
      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Undangan Baru</h3>
          <div className="space-y-3">
            {pendingInvites
              .filter((invite) => invite.calendarItem && invite.invitedByUser)
              .map((invite) => (
                <div
                  key={invite.id}
                  className="p-4 bg-white dark:bg-gray-800 border-l-4 border-yellow-500 rounded-lg shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-1">
                        {invite.calendarItem?.title || 'Untitled'}
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>
                          📅 {invite.calendarItem?.start_date ? formatDate(invite.calendarItem.start_date) : 'No date'}
                          {invite.calendarItem && !invite.calendarItem.all_day &&
                            invite.calendarItem.start_date && ` • ${formatTime(invite.calendarItem.start_date)}`}
                        </div>
                        <div>
                          👤 Diundang oleh:{' '}
                          <span className="font-medium">
                            {invite.invitedByUser?.full_name || 'Unknown'}
                          </span>
                        </div>
                      <div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${getStatusBadge(
                            invite.status
                          )}`}
                        >
                          {invite.calendarItem?.visibility || 'private'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() =>
                        handleRespond(invite.id, CalendarInviteStatus.ACCEPTED)
                      }
                      disabled={respondingId === invite.id}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      {respondingId === invite.id ? '...' : 'Terima'}
                    </button>
                    <button
                      onClick={() =>
                        handleRespond(invite.id, CalendarInviteStatus.DECLINED)
                      }
                      disabled={respondingId === invite.id}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      {respondingId === invite.id ? '...' : 'Tolak'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Invites */}
      {otherInvites.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Riwayat Undangan</h3>
          <div className="space-y-2">
            {otherInvites
              .filter((invite) => invite.calendarItem && invite.invitedByUser)
              .map((invite) => (
                <div
                  key={invite.id}
                  className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">
                        {invite.calendarItem?.title || 'Untitled'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {invite.calendarItem?.start_date ? formatDate(invite.calendarItem.start_date) : 'No date'} •{' '}
                        {invite.invitedByUser?.full_name || 'Unknown'}
                      </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${getStatusBadge(
                      invite.status
                    )}`}
                  >
                    {invite.status === CalendarInviteStatus.ACCEPTED
                      ? 'Diterima'
                      : 'Ditolak'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {myInvites.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Tidak ada undangan kalender
        </div>
      )}
    </div>
  );
}
