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
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="h-5 bg-muted rounded animate-pulse w-1/2 mb-2" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
          </div>
        ))}
      </div>
    );
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
                  className="bg-card border border-border border-l-4 border-l-yellow-500 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-1">
                        {invite.calendarItem?.title || 'Untitled'}
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
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
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <button
                      onClick={() =>
                        handleRespond(invite.id, CalendarInviteStatus.ACCEPTED)
                      }
                      disabled={respondingId === invite.id}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                      {respondingId === invite.id ? 'Memproses...' : 'Terima'}
                    </button>
                    <button
                      onClick={() =>
                        handleRespond(invite.id, CalendarInviteStatus.DECLINED)
                      }
                      disabled={respondingId === invite.id}
                      className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 text-sm font-medium transition-colors text-muted-foreground"
                    >
                      {respondingId === invite.id ? 'Memproses...' : 'Tolak'}
                    </button>
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
                  className="bg-card border border-border rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {invite.calendarItem?.title || 'Untitled'}
                    </div>
                    <div className="text-sm text-muted-foreground">
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
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {myInvites.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-10 h-10 text-muted-foreground mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-muted-foreground text-sm">Tidak ada undangan kalender</p>
        </div>
      )}
    </div>
  );
}
