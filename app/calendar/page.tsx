'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarViewComponent } from '@/components/calendar/CalendarView';
import { CalendarAgenda } from '@/components/calendar/CalendarAgenda';
import { CalendarItemDetail } from '@/components/calendar/CalendarItemDetail';

export default function CalendarPage() {
  const router = useRouter();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');

  return (
    <>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Beranda
          </Link>
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-foreground font-medium">Kalender</span>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Kalender Nusantara Play</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Lihat tanggal penting, jadwal, dan event budaya Indonesia
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            Kalender
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            className={`px-4 py-2 rounded ${
              viewMode === 'agenda'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            Agenda
          </button>

          {/* Divider */}
          <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Navigation Buttons */}
          <Link
            href="/calendar/invites"
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Undangan
          </Link>
          <Link
            href="/calendar/my"
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            Jadwal Saya
          </Link>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' ? (
          <CalendarViewComponent onItemClick={setSelectedItemId} />
        ) : (
          <CalendarAgenda onItemClick={setSelectedItemId} />
        )}

        {/* Item Detail Modal */}
        {selectedItemId && (
          <CalendarItemDetail
            itemId={selectedItemId}
            onClose={() => setSelectedItemId(null)}
          />
        )}
    </>
  );
}
