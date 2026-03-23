'use client';

import { useEffect, useState } from 'react';
import { useCalendarItem } from '@/hooks/useCalendarItem';
import { useItemInvites } from '@/hooks/useCalendarInvites';
import { inviteUsers } from '@/lib/api/calendar';
import { CalendarInviteStatus } from '@/types/calendar';

interface CalendarItemDetailProps {
  itemId: string;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CalendarItemDetail({
  itemId,
  onClose,
  onEdit,
  onDelete,
}: CalendarItemDetailProps) {
  const { data: item, isLoading, error, refetch } = useCalendarItem(itemId);
  const {
    invites,
    refetch: refetchInvites,
  } = useItemInvites(itemId);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    refetch();
    refetchInvites();
  }, [itemId]);

  const addEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setInviteError('Format email tidak valid');
      return;
    }
    if (emailList.includes(trimmed)) {
      setInviteError('Email sudah ada dalam daftar');
      return;
    }
    setEmailList((prev) => [...prev, trimmed]);
    setEmailInput('');
    setInviteError(null);
  };

  const removeEmail = (email: string) => {
    setEmailList((prev) => prev.filter((e) => e !== email));
  };

  const handleInviteSubmit = async () => {
    if (emailList.length === 0) {
      setInviteError('Masukkan minimal satu email');
      return;
    }
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await inviteUsers(itemId, { emails: emailList });
      setInviteSuccess(`${emailList.length} undangan berhasil dikirim`);
      setEmailList([]);
      setEmailInput('');
      refetchInvites();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Gagal mengirim undangan');
    } finally {
      setIsInviting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'important_date':
        return 'Tanggal Penting';
      case 'personal_schedule':
        return 'Jadwal Pribadi';
      case 'event':
        return 'Event';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: CalendarInviteStatus) => {
    const styles = {
      [CalendarInviteStatus.PENDING]:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      [CalendarInviteStatus.ACCEPTED]:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [CalendarInviteStatus.DECLINED]:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    return styles[status];
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6">
          <div className="text-red-600 dark:text-red-400">
            Error: {error.message}
          </div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !item) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6">
          <div className="space-y-3">
            <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full mx-4 my-8">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color || '#3B82F6' }}
                />
                <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                  {getTypeLabel(item.type)}
                </span>
                <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                  {item.visibility}
                </span>
              </div>
              <h2 className="text-2xl font-bold">{item.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Description */}
          {item.description && (
            <div>
              <h3 className="font-semibold mb-1">Deskripsi</h3>
              <p className="text-muted-foreground">
                {item.description}
              </p>
            </div>
          )}

          {/* Date & Time */}
          <div>
            <h3 className="font-semibold mb-1">Tanggal & Waktu</h3>
            <div className="text-muted-foreground">
              <div>
                📅 {formatDate(item.start_date)}
                {!item.all_day && ` • ${formatTime(item.start_date)}`}
              </div>
              {item.end_date && (
                <div>
                  → {formatDate(item.end_date)}
                  {!item.all_day && ` • ${formatTime(item.end_date)}`}
                </div>
              )}
              {item.all_day && (
                <div className="text-sm text-muted-foreground mt-1">Sepanjang hari</div>
              )}
            </div>
          </div>

          {/* Creator */}
          {item.creator && (
            <div>
              <h3 className="font-semibold mb-1">Dibuat oleh</h3>
              <p className="text-muted-foreground">
                {item.creator.full_name} ({item.creator.email})
              </p>
            </div>
          )}

          {/* Daerah */}
          {item.daerah && (
            <div>
              <h3 className="font-semibold mb-1">Daerah</h3>
              <p className="text-muted-foreground">
                {item.daerah.nama}
              </p>
            </div>
          )}

          {/* Invites */}
          {item.invites && item.invites.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Undangan</h3>
              <div className="space-y-2">
                {item.invites
                  .filter((invite) => invite.user)
                  .map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {invite.user?.full_name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {invite.user?.email || 'No email'}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStatusBadge(
                          invite.status
                        )}`}
                      >
                        {invite.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground pt-4 border-t border-border space-y-1">
            <div>
              Dibuat: {new Date(item.created_at).toLocaleString('id-ID')}
            </div>
            <div>
              Diubah: {new Date(item.updated_at).toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Inline Invite Form */}
        {item.visibility !== 'public' && (
          <div className="border-t border-border px-6 pt-5 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Undang via Email</h3>
              <button
                onClick={() => {
                  setShowInviteForm((v) => !v);
                  setInviteError(null);
                  setInviteSuccess(null);
                }}
                className="text-sm text-primary hover:underline"
              >
                {showInviteForm ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>

            {showInviteForm && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={addEmail}
                    type="button"
                    className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                  >
                    Tambah
                  </button>
                </div>

                {emailList.length > 0 && (
                  <div className="space-y-1">
                    {emailList.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between px-3 py-1.5 bg-muted/50 rounded-lg text-sm"
                      >
                        <span>{email}</span>
                        <button
                          onClick={() => removeEmail(email)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {inviteError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
                )}
                {inviteSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400">{inviteSuccess}</p>
                )}

                <button
                  onClick={handleInviteSubmit}
                  disabled={isInviting || emailList.length === 0}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isInviting ? 'Mengirim...' : `Kirim Undangan (${emailList.length})`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-6 border-t border-border flex justify-end gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Hapus
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
