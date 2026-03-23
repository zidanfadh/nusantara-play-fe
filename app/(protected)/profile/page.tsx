'use client';

import { useState } from 'react';
import { Mail, Phone, Building2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UserProfileCard } from '@/components/users/UserProfileCard';
import { EditProfileForm } from '@/components/users/EditProfileForm';
import type { UserProfile } from '@/types/user';

export default function ProfilePage() {
  const { user, isLoading, error, setUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);

  const handleEditSuccess = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setIsEditing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 h-80 bg-muted rounded-xl" />
          <div className="lg:col-span-8 h-80 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
        <p className="font-bold">Error</p>
        <p className="text-sm mt-1">{error?.message || 'Gagal memuat profil'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-primary block mb-2">
          Identitas Anggota
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-foreground mb-4">
          Profil Saya
        </h1>
        <p className="text-foreground/60 max-w-2xl text-lg leading-relaxed">
          Kelola informasi digital Anda sebagai bagian dari komunitas warisan budaya Indonesia.
        </p>
        <div className="w-full h-px bg-border/20 mt-8" />
      </div>

      {/* 12-col editorial grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column — always visible */}
        <div className="lg:col-span-4">
          <UserProfileCard
            user={user}
            onEdit={() => setIsEditing(true)}
            isCurrentUser={true}
          />
        </div>

        {/* Right column — read or edit */}
        <div className="lg:col-span-8 space-y-6">
          {isEditing ? (
            <div className="bg-warm-card p-8 md:p-12 rounded-xl border-b-2 border-primary/10">
              <div className="mb-10">
                <h3 className="text-2xl font-bold tracking-tight mb-2">Update Profil</h3>
                <p className="text-foreground/60">Perbarui informasi identitas digital Anda di komunitas Nusantara.</p>
              </div>
              <EditProfileForm
                currentUser={user}
                onSuccess={handleEditSuccess}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          ) : (
            <>
              {/* Bio + contact info card */}
              <div className="bg-warm-card rounded-xl p-8 md:p-10 relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Bio — spans full width */}
                  {user.bio && (
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-primary block mb-3">
                        Narasi Bio
                      </label>
                      <p className="text-lg font-medium leading-relaxed text-foreground/70">
                        {user.bio}
                      </p>
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-foreground/40 block mb-2">
                      Komunikasi
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-warm-field flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{user.email}</p>
                        <p className="text-xs text-foreground/50">Email Utama</p>
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  {user.phone && (
                    <div>
                      <label className="text-[10px] font-bold tracking-widest uppercase text-foreground/40 block mb-2">
                        Telepon
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-warm-field flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{user.phone}</p>
                          <p className="text-xs text-foreground/50">Kontak Ponsel</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Institution */}
                  {user.institution && (
                    <div>
                      <label className="text-[10px] font-bold tracking-widest uppercase text-foreground/40 block mb-2">
                        Afiliasi
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-warm-field flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{user.institution}</p>
                          <p className="text-xs text-foreground/50">Institusi Utama</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-warm-field/50 p-6 rounded-xl text-center">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-foreground/40 mb-2">
                    Terakhir Login
                  </p>
                  <p className="text-base font-black text-primary leading-snug">
                    {formatDate(user.last_login_at)}
                  </p>
                </div>
                <div className="bg-warm-field/50 p-6 rounded-xl text-center">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-foreground/40 mb-2">
                    Bergabung Sejak
                  </p>
                  <p className="text-base font-black text-primary leading-snug">
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
