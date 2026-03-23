'use client';

import { useMyRegistrations } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function MyRegistrationsPage() {
  const { data: registrations, loading, error } = useMyRegistrations();

  if (loading) {
    return (
      <div className="min-h-screen  py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-2 ">Memuat data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen  py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/events"
            className="inline-flex items-center hover:text-muted-foreground/60 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Kembali ke Semua Event
          </Link>
          <h1 className="text-3xl font-bold ">Event yang Saya Daftar</h1>
          <p className=" mt-2">
            Daftar event yang telah Anda daftarkan
          </p>
        </div>

        {/* Registrations List */}
        {registrations && registrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {registrations.map((registration) => (
              <div key={registration.id} className="relative">
                {/* Registration Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  {registration.status === 'registered' && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                      Terdaftar
                    </span>
                  )}
                  {registration.status === 'checked_in' && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                      Sudah Check-in
                    </span>
                  )}
                  {registration.status === 'cancelled' && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                      Dibatalkan
                    </span>
                  )}
                </div>

                {/* Event Card */}
                {registration.event && (
                  <EventCard event={registration.event} />
                )}

                {/* Registration Info */}
                <div className="mt-2 p-4 bg-card rounded-b-lg border border-border">
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>Tanggal Daftar:</strong>{' '}
                      {new Date(registration.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    {registration.checked_in_at && (
                      <p className="mt-1">
                        <strong>Check-in:</strong>{' '}
                        {new Date(registration.checked_in_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">
              Belum ada event yang didaftar
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Anda belum mendaftar ke event manapun.
            </p>
            <div className="mt-6">
              <Link
                href="/events"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Lihat Semua Event
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
