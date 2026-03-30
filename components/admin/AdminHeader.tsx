'use client';

import { UserProfile } from '@/types/user';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatUserRole } from '@/lib/api/users';

interface AdminHeaderProps {
  user: UserProfile;
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="bg-gradient-to-r from-[#1A5F7A] to-[#237A9A] shadow-md border-b-2 border-[#C04A21]">
      <div className="flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-[#D4A017] rounded-lg flex items-center justify-center shadow-md">
            <svg className="h-5 w-5 text-[#2D2D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Admin Panel
            </h2>
            <p className="text-xs text-[#F7F3E8]/80 font-medium">
              Kelola sistem Nusantara Legacy
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <button className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-105">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#C04A21] rounded-full animate-pulse border border-white"></span>
          </button>

          {/* User Info */}
          <div className="flex items-center space-x-2 border-l-2 border-white/20 pl-3 ml-2">
            <div className="text-right">
              <p className="text-xs font-semibold text-white">
                {user.full_name}
              </p>
              <p className="text-[10px] text-[#D4A017] font-medium">
                {formatUserRole(user.role)}
              </p>
            </div>
            
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-9 w-9 rounded-full object-cover border-2 border-[#D4A017] shadow-lg ring-2 ring-white/30"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#C04A21] to-[#D65C2E] flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white/30">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 text-white/80 hover:text-white hover:bg-[#C04A21] rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 group"
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
