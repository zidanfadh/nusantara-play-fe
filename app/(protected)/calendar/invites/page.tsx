'use client';

import Link from 'next/link';
import { CalendarInvites } from '@/components/calendar/CalendarInvites';
export default function CalendarInvitesPage() {
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
          <Link href="/calendar" className="text-muted-foreground hover:text-foreground">
            Kalender
          </Link>
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-foreground font-medium">Undangan</span>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Undangan Kalender</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola undangan jadwal dan acara yang diterima
          </p>
        </div>

        <CalendarInvites />
    </>
  );
}
