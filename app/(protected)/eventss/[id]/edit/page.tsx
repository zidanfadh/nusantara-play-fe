'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EventForm } from '@/components/events/EventForm';
import { useEvent } from '@/hooks/useEvents';
import { updateEvent } from '@/lib/api/events';
import { CreateEventData, EventStatus } from '@/types/events';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { data: event, loading, error } = useEvent(eventId);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateEventData) => {
    try {
      setIsLoading(true);
      setSubmitError(null);
      await updateEvent(eventId, data);
      router.push(`/eventss/${eventId}`);
    } catch (err: any) {
      console.error('Error updating event:', err);
      setSubmitError(err.response?.data?.message || 'Gagal mengupdate event. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/eventss/${eventId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Memuat event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Event tidak ditemukan atau Anda tidak memiliki akses</p>
        </div>
      </div>
    );
  }

  if (event.status !== EventStatus.DRAFT) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">Hanya event dengan status draft yang dapat diedit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-2">
            <button
              onClick={() => router.push(`/eventss/${eventId}`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
          </div>
          <p className="text-gray-600 ml-10">
            Edit informasi event Anda
          </p>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{submitError}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <EventForm
            initialData={event}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
