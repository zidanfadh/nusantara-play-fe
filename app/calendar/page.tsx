'use client';

import { useState } from 'react';
import { CalendarViewComponent } from '@/components/calendar/CalendarView';
import { CalendarAgenda } from '@/components/calendar/CalendarAgenda';
import { CalendarItemDetail } from '@/components/calendar/CalendarItemDetail';

export default function CalendarPage() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Kalender Nusantara Play</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Lihat tanggal penting, jadwal, dan event budaya Indonesia
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="mb-4 flex gap-2">
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
    </div>
  );
}
