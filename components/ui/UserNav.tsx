'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/hooks/useAuth';
import { User, LogOut, LayoutDashboard, ChevronDown, Calendar, Mail } from 'lucide-react';

export function UserNav() {
  const { user, isLoading } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
    );
  }

  const isAdmin = user?.role === 'admin_kpoti';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 focus:outline-none group"
      >
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-foreground/70" />
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-card rounded-md shadow-lg py-1 border border-border z-50 ring-1 ring-black/5">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>

          <div className="py-1">
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors w-full text-left"
                onClick={() => setIsOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin Panel
              </Link>
            )}

            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors w-full text-left"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4" />
              Profil Saya
            </Link>

            <Link
              href="/calendar/my"
              className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors w-full text-left"
              onClick={() => setIsOpen(false)}
            >
              <Calendar className="w-4 h-4" />
              Jadwal Saya
            </Link>

            <Link
              href="/calendar/invites"
              className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors w-full text-left"
              onClick={() => setIsOpen(false)}
            >
              <Mail className="w-4 h-4" />
              Undangan Kalender
            </Link>
          </div>

          <div className="py-1 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
