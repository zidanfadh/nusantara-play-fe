'use client';

import { useState } from 'react';
import {
  CalendarItemVisibility,
  CalendarSourceFilter,
  CalendarView,
} from '@/types/calendar';

interface CalendarFilterProps {
  onFilterChange: (filters: CalendarFilters) => void;
  showViewToggle?: boolean;
  showVisibilityFilter?: boolean;
}

export interface CalendarFilters {
  view?: CalendarView;
  source?: CalendarSourceFilter;
  visibility?: CalendarItemVisibility;
  daerah_id?: string;
  include_events?: boolean;
  search?: string;
}

export function CalendarFilter({
  onFilterChange,
  showViewToggle = true,
  showVisibilityFilter = false,
}: CalendarFilterProps) {
  const [filters, setFilters] = useState<CalendarFilters>({
    view: CalendarView.MONTHLY,
    include_events: true,
  });

  const updateFilter = (key: keyof CalendarFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-card border border-border rounded-xl">

      {/* Source Filter */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium mb-1">Sumber</label>
        <select
          value={filters.source || ''}
          onChange={(e) =>
            updateFilter('source', e.target.value || undefined)
          }
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua</option>
          <option value={CalendarSourceFilter.IMPORTANT_DATE}>
            Tanggal Penting
          </option>
          <option value={CalendarSourceFilter.PERSONAL_SCHEDULE}>
            Jadwal Pribadi
          </option>
          <option value={CalendarSourceFilter.EVENT}>Event</option>
        </select>
      </div>

      {/* Visibility Filter */}
      {showVisibilityFilter && (
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-1">Visibilitas</label>
          <select
            value={filters.visibility || ''}
            onChange={(e) =>
              updateFilter('visibility', e.target.value || undefined)
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Semua</option>
            <option value={CalendarItemVisibility.PUBLIC}>Public</option>
            <option value={CalendarItemVisibility.INTERNAL}>Internal</option>
            <option value={CalendarItemVisibility.PRIVATE}>Private</option>
          </select>
        </div>
      )}

      {/* Include Events Toggle */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.include_events !== false}
            onChange={(e) => updateFilter('include_events', e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">Tampilkan Event</span>
        </label>
      </div>

      {/* Search */}
      <div className="flex-1 min-w-[250px]">
        <label className="block text-sm font-medium mb-1">Cari</label>
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value || undefined)}
          placeholder="Cari judul atau deskripsi..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}
