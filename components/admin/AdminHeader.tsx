'use client';

import { UserProfile } from '@/types/user';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { formatUserRole } from '@/lib/api/users';
import { SITE_NAME } from '@/lib/brand';

interface AdminHeaderProps {
  user: UserProfile;
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push(authClient.afterSignOutPath);
  };

  return (
    <header className="bg-brand-brown text-brand-cream shadow-md border-b-2 border-brand-amber">
      {/* Phase 27: the brand brown in both themes (cream text, amber accents). */}
      <div className="flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-brand-amber rounded-lg flex items-center justify-center shadow-md">
            <svg aria-hidden="true" className="h-5 w-5 text-brand-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-cream tracking-wide">
              Admin Panel
            </h2>
            <p className="text-xs text-brand-cream/85 font-medium">
              Kelola sistem {SITE_NAME}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <button type="button" aria-label="Notifikasi" className="relative p-2 text-brand-cream/85 hover:text-brand-cream hover:bg-brand-cream/10 rounded-xl transition-all duration-200 hover:scale-105">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-brand-amber rounded-full animate-pulse border border-brand-brown"></span>
          </button>

          {/* User Info */}
          <div className="flex items-center space-x-2 border-l-2 border-brand-cream/20 pl-3 ml-2">
            <div className="text-right">
              <p className="text-xs font-semibold text-brand-cream">
                {user.full_name}
              </p>
              <p className="text-[10px] text-brand-amber font-medium">
                {formatUserRole(user.role)}
              </p>
            </div>
            
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-9 w-9 rounded-full object-cover border-2 border-brand-amber shadow-lg ring-2 ring-brand-cream/30"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-brand-amber flex items-center justify-center text-brand-brown font-bold text-sm shadow-lg ring-2 ring-brand-cream/30">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            type="button"
            aria-label="Keluar"
            className="p-2 text-brand-cream/85 hover:text-brand-cream hover:bg-brand-cream/10 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 group"
            title="Logout"
          >
            <svg className="h-5 w-5 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
