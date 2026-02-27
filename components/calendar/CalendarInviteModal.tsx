'use client';

import { useState, useEffect } from 'react';
import { useItemInvites } from '@/hooks/useCalendarInvites';
import { useUsers } from '@/hooks/useUsers';
import type { UserProfile } from '@/types/user';

interface CalendarInviteModalProps {
  calendarItemId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CalendarInviteModal({
  calendarItemId,
  onClose,
  onSuccess,
}: CalendarInviteModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { invite, invites, refetch } = useItemInvites(calendarItemId);
  const { data: usersData, fetchData: fetchUsers } = useUsers();

  useEffect(() => {
    refetch();
    fetchUsers({ page: 1, limit: 100 });
  }, []);

  // Filter users yang belum diundang
  const invitedUserIds = new Set(invites.map((inv) => inv.user_id));
  const availableUsers = usersData?.data.filter(
    (user: UserProfile) => !invitedUserIds.has(user.id)
  ) || [];

  // Filter based on search
  const filteredUsers = availableUsers.filter(
    (user: UserProfile) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (selectedUserIds.length === 0) {
      setError('Pilih minimal satu user');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await invite({ user_ids: selectedUserIds });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite users');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold">Undang User</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari user berdasarkan nama atau email..."
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          {/* User List */}
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? 'Tidak ada user yang sesuai pencarian'
                  : 'Semua user sudah diundang'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer dark:border-gray-600"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
                    {user.role}
                  </div>
                </label>
              ))
            )}
          </div>

          {/* Selected Count */}
          {selectedUserIds.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {selectedUserIds.length} user dipilih
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedUserIds.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Mengundang...' : 'Undang'}
          </button>
        </div>
      </div>
    </div>
  );
}
