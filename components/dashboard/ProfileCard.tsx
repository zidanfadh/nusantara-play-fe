'use client';

import { User } from '@supabase/supabase-js';

interface ProfileCardProps {
  user: User;
}

export function ProfileCard({ user }: ProfileCardProps) {
  // Extract initials for avatar fallback
  const getInitials = () => {
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return user.email?.substring(0, 2).toUpperCase() || 'U';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-border overflow-hidden shadow-sm">
      <div className="h-32 bg-secondary/20 relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      <div className="px-6 pb-6">
        <div className="relative flex justify-between items-end -mt-12 mb-6">
          <div className="flex items-end">
            <div className="w-24 h-24 rounded-full bg-background p-1 border border-border">
              <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-2xl font-bold">
                {user.user_metadata?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>{getInitials()}</span>
                )}
              </div>
            </div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-primary border border-primary/20 rounded-md hover:bg-primary/5 transition-colors">
            Edit Profil
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {user.user_metadata?.full_name || 'Pengguna Nusantara Play'}
            </h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Bergabung Sejak
              </label>
              <p className="mt-1 font-medium">{formatDate(user.created_at)}</p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Status Akun
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium capitalize">{user.role || 'user'}</span>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                ID Pengguna
              </label>
              <p className="mt-1 font-mono text-sm text-muted-foreground truncate" title={user.id}>
                {user.id}
              </p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Provider Login
              </label>
              <p className="mt-1 font-medium capitalize">
                {user.app_metadata?.provider || 'Email'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
