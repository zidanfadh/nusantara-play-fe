import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Welcome Card */}
        <div className="col-span-full rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Selamat Datang, {user?.user_metadata?.full_name || user?.email}!</h3>
          <p className="text-muted-foreground mb-4">
            Ini adalah pusat kontrol akun Anda. Anda dapat mengelola profil, melihat kontribusi, dan menjelajahi arsip permainan dari sini.
          </p>
          <div className="flex gap-4">
            <Link
              href="/profile"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Lihat Profil
            </Link>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Ke Beranda
            </Link>
          </div>
        </div>

        {/* Quick Stats Placeholder */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
               <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
               </svg>
            </div>
            <h4 className="font-semibold">Kontribusi Arsip</h4>
          </div>
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-muted-foreground">Permainan ditambahkan</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-secondary/10 rounded-full">
               <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
               </svg>
            </div>
            <h4 className="font-semibold">Komunitas</h4>
          </div>
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-muted-foreground">Komunitas diikuti</p>
        </div>
      </div>
    </div>
  );
}
