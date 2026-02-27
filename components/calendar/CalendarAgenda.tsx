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
      private: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
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
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
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
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cari</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul atau deskripsi..."
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Agenda List */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="divide-y dark:divide-gray-700">
            {data?.data.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onItemClick?.(entry.id)}
                className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
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
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {getTypeLabel(entry.type)}
                        </span>
                      </div>
                    </div>

                    {entry.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {entry.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Tidak ada item kalender untuk periode ini
              </div>
            )}
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Halaman {data.pagination.page} dari {data.pagination.totalPages}{' '}
                • Total {data.pagination.total} item
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!data.pagination.hasPrev}
                  className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!data.pagination.hasNext}
                  className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
