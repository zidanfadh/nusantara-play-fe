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
    <main className="min-h-screen bg-[#fdf9f3] dark:bg-[#121212] text-[#1c1c18] dark:text-[#f7f3e8] selection:bg-[#ffdad2] selection:text-[#3c0700] pb-24 md:pb-0 font-sans">
      <div className="max-w-4xl rounded-md mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex z items-center gap-4 mb-2">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-[#f1ede7] dark:hover:bg-[#1e1e1e] rounded-full transition-all duration-200"
            >
              <ArrowLeftIcon className="h-6 w-6 text-[#9e3c24] dark:text-[#D65C2E]" />
            </button>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#9e3c24] dark:text-[#D65C2E] block">
              Event Management
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1c1c18] dark:text-[#f7f3e8] mt-2">
            Buat Event Baru
          </h1>
          <p className="text-[#636262] dark:text-[#9A8880] mt-4 max-w-xl">
            Lestarikan warisan melalui kolaborasi. Lengkapi detail event Anda untuk mengundang para penjelajah budaya.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-[#ffdad6] dark:bg-red-900/30 border-l-4 border-[#93000a] dark:border-red-500 rounded-md p-4 shadow-sm">
            <p className="text-[#93000a] dark:text-red-200">{error}</p>
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
