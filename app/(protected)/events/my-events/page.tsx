'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMyEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { EventFilter } from '@/components/events/EventFilter';
import { EventJenis, EventStatus } from '@/types/events';
import { PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { deleteEvent } from '@/lib/api/events';

export default function MyEventsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<{
    search?: string;
    jenis?: EventJenis | '';
    status?: EventStatus | '';
    page?: number;
  }>({ page: 1 });

  const { data, loading, error } = useMyEvents({
    ...filters,
    jenis: filters.jenis || undefined,
    status: filters.status || undefined,
    limit: 12,
  });

  const handleFilterChange = (newFilters: any) => {
    setFilters((prev) => ({ ...newFilters, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <div className="min-h-screen  py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <button
                  onClick={() => router.back()}
                  className=" hover:text-gray-300"
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h1 className="text-3xl font-bold ">Event Saya</h1>
              </div>
              <p className=" ml-10">
                Kelola event yang Anda buat
              </p>
            </div>
            <Link
              href="/events/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Buat Event Baru
            </Link>
          </div>
        </div>

        {/* Filter */}
        <EventFilter onFilterChange={handleFilterChange} showStatusFilter={true} />

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-muted-foreground">Memuat events...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {error.message}</p>
          </div>
        )}

        {/* Events Grid */}
        {!loading && !error && data && (
          <>
            {data.data.length === 0 ? (
              <div className="text-center py-12  rounded-lg shadow">
                <p className=" mb-4">Anda belum membuat event apapun</p>
                <Link
                  href="/events/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Buat Event Pertama
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.data.map((event) => (
                  <EventCard key={event.id} event={event} showStatus={true} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center space-x-2">
                <button
                  onClick={() => handlePageChange(data.pagination.page - 1)}
                  disabled={!data.pagination.hasPrev}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground/80 bg-card hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-foreground/80">
                  Halaman {data.pagination.page} dari {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(data.pagination.page + 1)}
                  disabled={!data.pagination.hasNext}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground/80 bg-card hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
