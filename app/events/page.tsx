'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { EventFilter } from '@/components/events/EventFilter';
import { EventJenis, EventListParams, EventStatus } from '@/types/events';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function EventsPage() {
  const { user } = useCurrentUser();
  const [filters, setFilters] = useState<{
    search?: string;
    jenis?: EventJenis | '';
    status?: EventStatus | '';
    page?: number;
  }>({ page: 1 });

  const { data, loading, error } = useEvents({
    ...filters,
    jenis: filters.jenis || undefined,
    status: filters.status || undefined,
    limit: 12,
  });

  const handleFilterChange = (
    newFilters: Pick<EventListParams, 'search' | 'jenis' | 'status' | 'daerah_id'>
  ) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  // Check if user can create events (kurator or admin)
  const canCreateEvent = user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);

  return (
    <main className="min-h-screen bg-background dark:bg-[#121212] text-[#1c1c18] dark:text-[#f7f3e8] pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <header className="mb-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-[#1c1c18] dark:text-[#f7f3e8] mb-4 leading-tight">
            Acara Budaya
          </h1>
          <p className="text-lg text-[#747474] dark:text-[#9A8880] max-w-2xl leading-relaxed">
            Eksplorasi ragam festival, kompetisi, dan workshop budaya di seluruh Nusantara.
          </p>
        </header>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex flex-wrap gap-3">
            {user && (
              <Link
                href="/events/my-registrations"
                className="bg-[#ffdad2] dark:bg-[#D65C2E]/20 text-[#3c0700] dark:text-[#f7f3e8] px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#ffb4a2] transition-colors"
              >
                {/* Simplified icon fallback if custom material symbols aren't used */}
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg>
                Event Terdaftar
              </Link>
            )}
            {canCreateEvent && (
              <Link
                href="/events/my-events"
                className="bg-[#e6e2dc] dark:bg-[#2A2A2A] text-[#1c1c18] dark:text-[#f7f3e8] px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#dddad4] dark:hover:bg-[#404040] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                Event Saya
              </Link>
            )}
            {canCreateEvent && (
              <Link
                href="/events/create"
                className="bg-[#9e3c24] dark:bg-[#D65C2E] text-[#ffffff] px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#9e3c24]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <PlusIcon className="h-5 w-5" />
                Buat Event Baru
              </Link>
            )}
          </div>
        </div>

        {/* Filter Section */}
        <EventFilter onFilterChange={handleFilterChange} />

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#9e3c24] dark:border-[#D65C2E]"></div>
            <p className="mt-2 text-[#747474] dark:text-[#9A8880]">Memuat events...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <p className="text-red-800">Error: {error.message}</p>
          </div>
        )}

        {/* Events Grid */}
        {!loading && !error && data && (
          <>
            {data.data.length === 0 ? (
              <div className="text-center py-12 rounded-lg shadow-sm bg-[#ffffff] dark:bg-[#1e1e1e]">
                <p className="text-[#1c1c18] dark:text-[#f7f3e8]">Tidak ada event yang ditemukan</p>
              </div>
            ) : (
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {data.data.map((event) => (
                  <EventCard key={event.id} event={event} showStatus={true} />
                ))}
              </section>
            )}

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <footer className="mt-20 flex flex-col md:flex-row items-center justify-between gap-6 py-8 border-t border-[#e6e2dc] dark:border-[#404040]">
                <button
                  onClick={() => handlePageChange(data.pagination.page - 1)}
                  disabled={!data.pagination.hasPrev}
                  className="flex items-center gap-2 text-stone-600 dark:text-[#f7f3e8] hover:text-[#9e3c24] dark:hover:text-[#D65C2E] transition-colors font-bold group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 bg-[#9e3c24] dark:bg-[#D65C2E] text-[#ffffff] rounded-lg font-bold">
                    {data.pagination.page}
                  </span>
                  <span className="px-4 py-2 text-[#747474] dark:text-[#9A8880]">
                    dari {data.pagination.totalPages}
                  </span>
                </div>

                <button
                  onClick={() => handlePageChange(data.pagination.page + 1)}
                  disabled={!data.pagination.hasNext}
                  className="flex items-center gap-2 text-stone-600 dark:text-[#f7f3e8] hover:text-[#9e3c24] dark:hover:text-[#D65C2E] transition-colors font-bold group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </footer>
            )}
          </>
        )}
      </div>
    </main>
  );
}
