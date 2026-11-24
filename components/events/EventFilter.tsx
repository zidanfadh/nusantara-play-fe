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
    <section className="bg-muted dark:bg-card rounded-3xl p-6 md:p-8 mb-12 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Search */}
        <div className={`md:col-span-1 lg:col-span-${showStatusFilter ? '1' : '2'}`}>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Pencarian
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Nama event..."
              className="w-full bg-white dark:bg-muted border-b-2 border-border/20 focus:border-primary px-10 py-3 rounded-t-lg outline-none transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Jenis */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Jenis Event
          </label>
          <select
            value={jenis}
            onChange={(e) => handleJenisChange(e.target.value as EventJenis | '')}
            className="w-full bg-white dark:bg-muted border-b-2 border-border/20 focus:border-primary px-4 py-3 rounded-t-lg outline-none appearance-none transition-all cursor-pointer text-foreground"
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
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as EventStatus | '')}
              className="w-full bg-white dark:bg-muted border-b-2 border-border/20 focus:border-primary px-4 py-3 rounded-t-lg outline-none appearance-none transition-all cursor-pointer text-foreground"
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
        <div className="flex items-end">
          <button
            onClick={handleReset}
            className="w-full bg-primary dark:bg-muted text-primary-foreground dark:text-foreground py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Reset Filter
          </button>
        </div>
      </div>
    </section>
  );
}
