import { createClient } from '@/lib/supabase/server';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profil Saya</h1>
      </div>

      <ProfileCard user={user} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 rounded-lg border border-border bg-card text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Statistik Kontribusi</h3>
          <p className="text-muted-foreground">Belum ada aktivitas tercatat.</p>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Badge & Sertifikasi</h3>
          <p className="text-muted-foreground">Belum ada badge yang diraih.</p>
        </div>
      </div>
    </div>
  );
}
