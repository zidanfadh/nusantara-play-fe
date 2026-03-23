'use client';

import { useState, useEffect } from 'react';
import { usePersonalSchedules } from '@/hooks/usePersonalSchedules';
import { CalendarItemForm } from '@/components/calendar/CalendarItemForm';
import { CalendarItemDetail } from '@/components/calendar/CalendarItemDetail';
import { CalendarItemType } from '@/types/calendar';
import type { CreatePersonalScheduleRequest } from '@/types/calendar';

export default function MyCalendarPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: schedules, isLoading, error, create, update, remove, refetch } =
    usePersonalSchedules();

  useEffect(() => {
    refetch();
  }, []);

  const handleCreate = async (data: CreatePersonalScheduleRequest) => {
    await create(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: CreatePersonalScheduleRequest) => {
    if (editingItem) {
      await update(editingItem.id, data);
      setEditingItem(null);
    }
  };

  const handleDelete = async () => {
    if (selectedItemId) {
      if (confirm('Yakin ingin menghapus jadwal ini?')) {
        await remove(selectedItemId);
        setSelectedItemId(null);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
        Error: {error.message}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Jadwal Pribadi Saya</h1>
          <p className="text-muted-foreground">
            Kelola jadwal dan acara pribadi Anda
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Buat Jadwal Baru
        </button>
      </div>

      {/* Schedule List */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 flex gap-4">
              <div className="w-1 rounded bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Color Bar */}
                  <div
                    className="w-1 h-full min-h-[60px] rounded"
                    style={{ backgroundColor: schedule.color || '#3B82F6' }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{schedule.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {schedule.visibility}
                      </span>
                    </div>

                    {schedule.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {schedule.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        📅 {formatDate(schedule.start_date)}
                        {!schedule.all_day &&
                          ` • ${formatTime(schedule.start_date)}`}
                      </div>
                      {schedule.end_date && (
                        <div>
                          → {formatDate(schedule.end_date)}
                          {!schedule.all_day &&
                            ` • ${formatTime(schedule.end_date)}`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedItemId(schedule.id)}
                      className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => setEditingItem(schedule)}
                      className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Yakin ingin menghapus?')) {
                          remove(schedule.id);
                        }
                      }}
                      className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {schedules.length === 0 && (
              <div className="p-12 text-center">
                <svg className="w-10 h-10 text-muted-foreground mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-muted-foreground text-sm mb-4">Belum ada jadwal pribadi</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  + Buat Jadwal Baru
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showForm || editingItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {editingItem ? 'Edit Jadwal' : 'Buat Jadwal Baru'}
                </h2>
                <button
                  onClick={() => { setShowForm(false); setEditingItem(null); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CalendarItemForm
                type={CalendarItemType.PERSONAL_SCHEDULE}
                initialData={editingItem}
                onSubmit={editingItem ? handleUpdate : handleCreate}
                onCancel={() => {
                  setShowForm(false);
                  setEditingItem(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItemId && (
        <CalendarItemDetail
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
          onEdit={() => {
            const item = schedules.find((s) => s.id === selectedItemId);
            if (item) {
              setEditingItem(item);
              setSelectedItemId(null);
            }
          }}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
