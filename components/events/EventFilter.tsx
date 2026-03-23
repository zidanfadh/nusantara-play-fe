import { useState } from 'react';
import { EventJenis, EventStatus, EVENT_JENIS_LABELS, EVENT_STATUS_LABELS } from '@/types/events';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface EventFilterProps {
  onFilterChange: (filters: {
    search?: string;
    jenis?: EventJenis | '';
    status?: EventStatus | '';
    daerah_id?: string;
  }) => void;
  showStatusFilter?: boolean;
}

export function EventFilter({ onFilterChange, showStatusFilter = false }: EventFilterProps) {
  const [search, setSearch] = useState('');
  const [jenis, setJenis] = useState<EventJenis | ''>('');
  const [status, setStatus] = useState<EventStatus | ''>('');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ search: value, jenis, status });
  };

  const handleJenisChange = (value: EventJenis | '') => {
    setJenis(value);
    onFilterChange({ search, jenis: value, status });
  };

  const handleStatusChange = (value: EventStatus | '') => {
    setStatus(value);
    onFilterChange({ search, jenis, status: value });
  };

  const handleReset = () => {
    setSearch('');
    setJenis('');
    setStatus('');
    onFilterChange({});
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search */}
        <div className="md:col-span-5">
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Cari Event
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama atau deskripsi event..."
              className="text-foreground/80 block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-card placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Jenis */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Jenis Event
          </label>
          <select
            value={jenis}
            onChange={(e) => handleJenisChange(e.target.value as EventJenis | '')}
            className="block text-foreground/80 w-full px-3 py-2 border border-border rounded-md leading-5 bg-card focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Semua Jenis</option>
            {Object.entries(EVENT_JENIS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Status (optional) */}
        {showStatusFilter && (
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as EventStatus | '')}
              className="block text-foreground/80 w-full px-3 py-2 border border-border rounded-md leading-5 bg-card focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Semua Status</option>
              {Object.entries(EVENT_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reset Button */}
        <div className={`${showStatusFilter ? 'md:col-span-1' : 'md:col-span-4'} flex items-end`}>
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground/80 bg-card hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
