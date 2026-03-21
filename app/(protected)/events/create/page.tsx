'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventForm } from '@/components/events/EventForm';
import { createEvent } from '@/lib/api/events';
import { CreateEventData } from '@/types/events';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function CreateEventPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateEventData) => {
    try {
      setIsLoading(true);
      setError(null);
      const newEvent = await createEvent(data);
      // Redirect to event detail page
      router.push(`/events/${newEvent.id}`);
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.response?.data?.message || 'Gagal membuat event. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen  py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-2">
            <button
              onClick={() => router.back()}
              className=" hover:text-gray-300"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-3xl font-bold ">Buat Event Baru</h1>
          </div>
          <p className=" ml-10">
            Isi formulir di bawah untuk membuat event budaya baru
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-card rounded-lg shadow-md p-6">
          <EventForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
