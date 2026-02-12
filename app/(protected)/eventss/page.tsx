'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { EventFilter } from '@/components/events/EventFilter';
import { EventJenis, EventStatus } from '@/types/events';
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

  const handleFilterChange = (newFilters: any) => {
    setFilters((prev) => ({ ...newFilters, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  // Check if user can create events (kurator or admin)
  const canCreateEvent = user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Events Budaya</h1>
              <p className="mt-2 text-gray-600">
                Temukan dan ikuti berbagai acara budaya Nusantara
              </p>
            </div>
            <div className="flex space-x-3">
              {user && (
                <Link
                  href="/eventss/my-registrations"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Event Terdaftar
                </Link>
              )}
              {canCreateEvent && (
                <Link
                  href="/eventss/my-events"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Event Saya
                </Link>
              )}
              {canCreateEvent && (
                <Link
                  href="/eventss/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Buat Event Baru
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Filter */}
        <EventFilter onFilterChange={handleFilterChange} />

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-600">Memuat events...</p>
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
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">Tidak ada event yang ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.data.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center space-x-2">
                <button
                  onClick={() => handlePageChange(data.pagination.page - 1)}
                  disabled={!data.pagination.hasPrev}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Halaman {data.pagination.page} dari {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(data.pagination.page + 1)}
                  disabled={!data.pagination.hasNext}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
