'use client';

import { useState } from 'react';
import { useCalendarAgenda } from '@/hooks/useCalendarAgenda';
import type { CalendarAgendaQueryParams } from '@/types/calendar';

interface CalendarAgendaProps {
  startDate?: string;
  endDate?: string;
  onItemClick?: (itemId: string) => void;
}

export function CalendarAgenda({
  startDate: initialStartDate,
  endDate: initialEndDate,
  onItemClick,
}: CalendarAgendaProps) {
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState(
    initialStartDate || defaultStartDate
  );
  const [endDate, setEndDate] = useState(initialEndDate || defaultEndDate);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const params: CalendarAgendaQueryParams = {
    startDate,
    endDate,
    page,
    limit: 20,
    search: search || undefined,
  };

  const { data, isLoading, error } = useCalendarAgenda(params);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'important_date':
        return 'Tanggal Penting';
      case 'personal_schedule':
        return 'Jadwal Pribadi';
      case 'event':
        return 'Event';
      default:
        return type;
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    const colors = {
      public: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      internal: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      private: 'bg-muted text-muted-foreground',
    };

    return colors[visibility as keyof typeof colors] || colors.private;
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cari</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul atau deskripsi..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Agenda List */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex gap-4">
              <div className="w-1 rounded bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {data?.data.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onItemClick?.(entry.id)}
                className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Color Bar */}
                  <div
                    className="w-1 h-full min-h-[60px] rounded"
                    style={{ backgroundColor: entry.color || '#3B82F6' }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{entry.title}</h3>
                      <div className="flex gap-2 flex-shrink-0">
                        <span
                          className={`text-xs px-2 py-1 rounded ${getVisibilityBadge(
                            entry.visibility
                          )}`}
                        >
                          {entry.visibility}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                          {getTypeLabel(entry.type)}
                        </span>
                      </div>
                    </div>

                    {entry.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {entry.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        📅 {formatDate(entry.start_date)}
                        {!entry.all_day && ` • ${formatTime(entry.start_date)}`}
                      </div>
                      {entry.end_date && (
                        <div>
                          → {formatDate(entry.end_date)}
                          {!entry.all_day && ` • ${formatTime(entry.end_date)}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {data?.data.length === 0 && (
              <div className="p-12 text-center">
                <svg className="w-10 h-10 text-muted-foreground mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-muted-foreground text-sm">Tidak ada item kalender untuk periode ini</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Halaman {data.pagination.page} dari {data.pagination.totalPages}{' '}
                • Total {data.pagination.total} item
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!data.pagination.hasPrev}
                  className="px-3 py-1 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!data.pagination.hasNext}
                  className="px-3 py-1 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
