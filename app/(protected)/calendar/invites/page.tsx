'use client';

import { CalendarInvites } from '@/components/calendar/CalendarInvites';

export default function CalendarInvitesPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Undangan Kalender</h1>
        <p className="text-muted-foreground">
          Kelola undangan jadwal dan acara yang diterima
        </p>
      </div>
      <CalendarInvites />
    </>
  );
}
