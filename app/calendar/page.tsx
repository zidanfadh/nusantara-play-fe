'use client';

import { useState } from 'react';
import { CalendarViewComponent } from '@/components/calendar/CalendarView';
import { CalendarAgenda } from '@/components/calendar/CalendarAgenda';
import { CalendarItemDetail } from '@/components/calendar/CalendarItemDetail';

export default function CalendarPage() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Kalender Nusantara Play</h1>
        <p className="text-muted-foreground">
          Lihat tanggal penting, jadwal, dan event budaya Indonesia
        </p>
      </div>

      {/* View Mode Toggle — segmented control */}
      <div className="mb-6 flex items-center gap-4">
        <div className="inline-flex bg-muted p-1 rounded-lg">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'calendar'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Kalender
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'agenda'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Agenda
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarViewComponent onItemClick={setSelectedItemId} />
      ) : (
        <CalendarAgenda onItemClick={setSelectedItemId} />
      )}

      {selectedItemId && (
        <CalendarItemDetail
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </>
  );
}
