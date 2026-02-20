'use client';

import { useState } from 'react';
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-medium">Error:</p>
            <p>{error?.message || 'Gagal memuat profil'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold ">Profil Saya</h1>
          <p className="mt-2 ">
            {isEditing ? 'Edit informasi profil Anda' : 'Informasi profil Anda'}
          </p>
        </div>

        {isEditing ? (
          <div className="bg-white rounded-lg shadow p-6">
            <EditProfileForm
              currentUser={user}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : (
          <UserProfileCard
            user={user}
            onEdit={() => setIsEditing(true)}
            isCurrentUser={true}
          />
        )}
      </div>
    </div>
  );
}
