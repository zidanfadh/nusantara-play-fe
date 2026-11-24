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
    <main className="min-h-screen bg-background text-foreground selection:bg-primary-soft selection:text-primary-soft-foreground pb-24 md:pb-0 font-sans">
      <div className="max-w-4xl rounded-md mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex z items-center gap-4 mb-2">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-muted dark:hover:bg-card rounded-full transition-all duration-200"
            >
              <ArrowLeftIcon className="h-6 w-6 text-primary-text" />
            </button>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary-text block">
              Event Management
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mt-2">
            Buat Event Baru
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl">
            Lestarikan warisan melalui kolaborasi. Lengkapi detail event Anda untuk mengundang para penjelajah budaya.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-danger-soft dark:bg-red-900/30 border-l-4 border-danger dark:border-red-500 rounded-md p-4 shadow-sm">
            <p className="text-danger dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Form Container */}
        <EventForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}
