'use client';

import Link from 'next/link';
import { Edit2, LockKeyhole } from 'lucide-react';
import { formatUserRole, formatUserStatus } from '@/lib/api/users';
import type { UserProfile } from '@/types/user';

interface UserProfileCardProps {
  user: UserProfile;
  onEdit?: () => void;
  isCurrentUser?: boolean;
}

const roleShortLabel: Record<string, string> = {
  admin_kpoti: 'ADMIN',
  kurator_daerah: 'KURATOR',
  pakar: 'PAKAR',
  publik: 'ANGGOTA',
};

export function UserProfileCard({ user, onEdit, isCurrentUser = false }: UserProfileCardProps) {
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* Main card */}
      <div className="bg-warm-card rounded-xl p-8 shadow-[0_24px_40px_-8px_rgba(28,28,24,0.06)] relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />

        <div className="flex flex-col items-center text-center relative z-10">
          {/* Avatar */}
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-xl overflow-hidden shadow-lg -rotate-2 hover:rotate-0 transition-transform duration-500">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl font-black text-primary">{initials}</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-white px-2.5 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase">
              {roleShortLabel[user.role] ?? 'ANGGOTA'}
            </div>
          </div>

          {/* Name + role */}
          <h2 className="text-2xl font-bold text-foreground mb-1">{user.full_name}</h2>
          <p className="text-primary font-semibold text-sm mb-4">{formatUserRole(user.role)}</p>

          {/* Tags */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
              {formatUserStatus(user.status)}
            </span>
            {user.institution && (
              <span className="bg-warm-field text-foreground/60 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase max-w-[140px] truncate">
                {user.institution}
              </span>
            )}
          </div>

          {/* Action buttons */}
          {isCurrentUser && (
            <div className="w-full space-y-3 pt-6 border-t border-border/20">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="w-full py-3.5 bg-primary text-white rounded-md font-bold text-sm tracking-wide shadow-lg shadow-primary/20 hover:scale-[0.98] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Update Profil
                </button>
              )}
              <Link
                href="/change-password"
                className="w-full py-3.5 bg-warm-btn text-warm-neutral rounded-md font-bold text-sm tracking-wide hover:bg-warm-btn-hover transition-colors flex items-center justify-center gap-2"
              >
                <LockKeyhole className="w-4 h-4" />
                Ubah Password
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Expertise card */}
      {user.expertise && user.expertise.length > 0 && (
        <div className="bg-warm-card rounded-xl p-6">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-foreground/50 mb-4">
            Keahlian
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.expertise.map((exp, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg"
              >
                {exp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
