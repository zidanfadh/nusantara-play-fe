'use client';

import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { UserProfile } from '@/types/user';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        setLoading(true);
        setError(null);

        // Check if user is authenticated first
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch user profile from API
        const profile = await apiClient.get<UserProfile>('/users/me');
        setUserProfile(profile);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profil Saya</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profil Saya</h1>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profil Saya</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Profile data not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profil Saya</h1>
      </div>

      <ProfileCard user={userProfile} />

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
