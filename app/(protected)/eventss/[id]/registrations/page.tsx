'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEvent, useEventRegistrations } from '@/hooks/useEvents';
import { EventRegistrationTable } from '@/components/events/EventRegistrationTable';
import { checkInAttendee, undoCheckIn } from '@/lib/api/events';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EventRegistrationsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { data: event, loading: eventLoading } = useEvent(eventId);
  const {
    data: registrations,
    loading: regLoading,
    error: regError,
    refetch,
  } = useEventRegistrations(eventId);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCheckIn = async (userId: string) => {
    try {
      setActionLoading(true);
      setActionError(null);
      await checkInAttendee(eventId, userId);
      refetch();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Gagal check-in peserta');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUndoCheckIn = async (userId: string) => {
    try {
      setActionLoading(true);
      setActionError(null);
      await undoCheckIn(eventId, userId);
      refetch();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Gagal membatalkan check-in');
    } finally {
      setActionLoading(false);
    }
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Event tidak ditemukan atau Anda tidak memiliki akses</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-2">
            <button
              onClick={() => router.push(`/eventss/${eventId}`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kelola Peserta</h1>
              <p className="text-gray-600 mt-1">{event.nama}</p>
            </div>
          </div>
        </div>

        {/* Action Error */}
        {actionError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{actionError}</p>
          </div>
        )}

        {/* Loading State */}
        {regLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-600">Memuat data peserta...</p>
          </div>
        )}

        {/* Error State */}
        {regError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {regError.message}</p>
          </div>
        )}

        {/* Registrations Table */}
        {!regLoading && !regError && (
          <EventRegistrationTable
            registrations={registrations}
            onCheckIn={handleCheckIn}
            onUndoCheckIn={handleUndoCheckIn}
            isLoading={actionLoading}
          />
        )}
      </div>
    </div>
  );
}
