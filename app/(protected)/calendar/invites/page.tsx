'use client';

import { CalendarInvites } from '@/components/calendar/CalendarInvites';

export default function CalendarInvitesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Undangan Kalender</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola undangan jadwal dan acara yang diterima
        </p>
      </div>

      <CalendarInvites />
    </div>
  );
}
