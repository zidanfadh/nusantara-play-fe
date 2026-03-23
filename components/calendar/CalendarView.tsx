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
    view: CalendarView.MONTHLY,
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
        showViewToggle={false}
        showVisibilityFilter={true}
      />

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
          aria-label="Bulan sebelumnya"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{getMonthName(month)} {year}</h2>
          <button
            onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}
            className="px-3 py-1 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            Hari ini
          </button>
        </div>

        <button
          onClick={nextMonth}
          className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
          aria-label="Bulan berikutnya"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
              <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {[...Array(35)].map((_, i) => (
              <div key={i} className={`min-h-[100px] p-2 border-r border-b border-border ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                <div className="w-5 h-3 bg-muted rounded animate-pulse mb-2" />
                {i % 3 === 0 && <div className="w-full h-4 bg-muted rounded animate-pulse" />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0"
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
                  className={`min-h-[100px] p-2 border-r border-b border-border transition-colors ${
                    index % 7 === 6 ? 'border-r-0' : ''
                  } ${!isCurrentMonth ? 'bg-muted/20' : ''} ${isToday ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex justify-start mb-1">
                    {isToday ? (
                      <span className="inline-flex w-6 h-6 items-center justify-center bg-primary text-primary-foreground rounded-full text-xs font-bold">
                        {formatDate(dayItem.date)}
                      </span>
                    ) : (
                      <span className={`text-xs font-medium ${!isCurrentMonth ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {formatDate(dayItem.date)}
                      </span>
                    )}
                  </div>

                  {/* Entries */}
                  <div className="space-y-1">
                    {dayItem.entries.slice(0, 3).map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => onItemClick?.(entry.id)}
                        className="w-full text-left text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: (entry.color || '#3B82F6') + '20',
                          color: entry.color || '#3B82F6',
                          borderLeft: `2px solid ${entry.color || '#3B82F6'}`,
                        }}
                      >
                        <div className="truncate font-medium">
                          {entry.title}
                        </div>
                        {!entry.all_day && (
                          <div className="text-xs opacity-75">
                            {formatTime(entry.start_date)}
                          </div>
                        )}
                      </button>
                    ))}

                    {dayItem.entries.length > 3 && (
                      <div className="text-xs text-muted-foreground">
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
