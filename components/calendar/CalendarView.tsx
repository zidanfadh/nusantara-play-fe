'use client';

import { useState } from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarView, type CalendarQueryParams } from '@/types/calendar';
import { CalendarFilter, type CalendarFilters } from './CalendarFilter';

interface CalendarViewComponentProps {
  year?: number;
  month?: number;
  onItemClick?: (itemId: string) => void;
}

export function CalendarViewComponent({
  year: initialYear,
  month: initialMonth,
  onItemClick,
}: CalendarViewComponentProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear || now.getFullYear());
  const [month, setMonth] = useState(initialMonth || now.getMonth() + 1);
  const [filters, setFilters] = useState<CalendarFilters>({
    view: CalendarView.MONTHLY,
    include_events: true,
  });

  const params: CalendarQueryParams = {
    year,
    month,
    view: filters.view || CalendarView.MONTHLY,
    source: filters.source,
    visibility: filters.visibility,
    daerah_id: filters.daerah_id,
    include_events: filters.include_events,
    search: filters.search,
  };

  const { data, isLoading, error } = useCalendar(params);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const getMonthName = (m: number) => {
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return months[m - 1];
  };

  const getDayName = (date: string) => {
    const d = new Date(date);
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return days[d.getDay()];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
      {/* Filter */}
      <CalendarFilter
        onFilterChange={setFilters}
        showViewToggle={true}
        showVisibilityFilter={true}
      />

      {/* Month Navigation */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <button
          onClick={prevMonth}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ← Prev
        </button>
        <h2 className="text-xl font-bold">
          {getMonthName(month)} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-700">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
              <div
                key={day}
                className="p-2 text-center font-semibold text-sm border-r border-b dark:border-gray-600 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {data?.items.map((dayItem, index) => {
              const date = new Date(dayItem.date);
              const isToday =
                date.toDateString() === new Date().toDateString();
              const isCurrentMonth = date.getMonth() + 1 === month;

              return (
                <div
                  key={dayItem.date}
                  className={`min-h-[120px] p-2 border-r border-b dark:border-gray-600 ${
                    index % 7 === 6 ? 'border-r-0' : ''
                  } ${
                    !isCurrentMonth
                      ? 'bg-gray-50 dark:bg-gray-900/50'
                      : ''
                  } ${
                    isToday
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  }`}
                >
                  <div
                    className={`text-sm font-semibold mb-1 ${
                      isToday ? 'text-blue-600 dark:text-blue-400' : ''
                    }`}
                  >
                    {formatDate(dayItem.date)}
                  </div>

                  {/* Entries */}
                  <div className="space-y-1">
                    {dayItem.entries.slice(0, 3).map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => onItemClick?.(entry.id)}
                        className="w-full text-left text-xs p-1 rounded hover:opacity-80 transition"
                        style={{
                          backgroundColor: entry.color || '#3B82F6',
                          color: 'white',
                        }}
                      >
                        <div className="truncate font-medium">
                          {entry.title}
                        </div>
                        {!entry.all_day && (
                          <div className="text-xs opacity-90">
                            {formatTime(entry.start_date)}
                          </div>
                        )}
                      </button>
                    ))}

                    {dayItem.entries.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{dayItem.entries.length - 3} lainnya
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
