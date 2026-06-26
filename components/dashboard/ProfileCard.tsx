'use client';

import { UserProfile } from '@/types/user';

interface ProfileCardProps {
  user: UserProfile;
}

export function ProfileCard({ user }: ProfileCardProps) {
  // Use proxy for external images (like Google User Content)
  const getProxiedAvatarUrl = (url: string | null) => {
    if (!url || url.trim() === '') return null;

    // If it's a Google User Content or other external URL, use proxy
    if (url.includes('googleusercontent.com') || url.includes('googleapis.com')) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }

    // For other URLs, use directly
    return url;
  };

  // Extract initials for avatar fallback
  const getInitials = () => {
    if (user.full_name) {
      return user.full_name
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
                {(() => {
                  const avatarUrl = getProxiedAvatarUrl(user.avatar_url);
                  return avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="Profile Avatar"
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        // Show initials instead
                        if (target.nextSibling) {
                          (target.nextSibling as HTMLElement).style.display = 'block';
                        }
                      }}
                    />
                  ) : null;
                })()}
                <span
                  className={user.avatar_url && user.avatar_url.trim() !== '' ? 'hidden' : 'block'}
                >
                  {getInitials()}
                </span>
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
              {user.full_name || 'Pengguna Nusantara Virtual'}
            </h2>
            <p className="text-muted-foreground">{user.email}</p>
            {user.bio && (
              <p className="text-sm text-muted-foreground mt-2">{user.bio}</p>
            )}
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
                <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                <span className="font-medium capitalize">{user.status}</span>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Role
              </label>
              <p className="mt-1 font-medium capitalize">{user.role}</p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Terakhir Login
              </label>
              <p className="mt-1 font-medium">{formatDate(user.last_login_at ?? undefined)}</p>
            </div>

            {user.phone && (
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Nomor Telepon
                </label>
                <p className="mt-1 font-medium">{user.phone}</p>
              </div>
            )}

            {user.institution && (
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Institusi
                </label>
                <p className="mt-1 font-medium">{user.institution}</p>
              </div>
            )}

            {user.expertise && (
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Keahlian
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {Array.isArray(user.expertise) ? (
                    user.expertise.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                      {user.expertise}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                ID Pengguna
              </label>
              <p className="mt-1 font-mono text-sm text-muted-foreground truncate" title={user.id}>
                {user.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
