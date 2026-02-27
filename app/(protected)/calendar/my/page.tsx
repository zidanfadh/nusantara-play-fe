'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePersonalSchedules } from '@/hooks/usePersonalSchedules';
import { CalendarItemForm } from '@/components/calendar/CalendarItemForm';
import { CalendarItemDetail } from '@/components/calendar/CalendarItemDetail';
import { CalendarItemType } from '@/types/calendar';
import type { CreatePersonalScheduleRequest } from '@/types/calendar';
import { ProtNavigation } from '@/components/prot/ProtNavigation';

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
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
          Error: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <ProtNavigation />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Beranda
          </Link>
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/calendar" className="text-muted-foreground hover:text-foreground">
            Kalender
          </Link>
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-foreground font-medium">Jadwal Saya</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Jadwal Pribadi Saya</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola jadwal dan acara pribadi Anda
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Buat Jadwal Baru
        </button>
      </div>

      {/* Schedule List */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="divide-y dark:divide-gray-700">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
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
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {schedule.visibility}
                      </span>
                    </div>

                    {schedule.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {schedule.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => setEditingItem(schedule)}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Yakin ingin menghapus?')) {
                          remove(schedule.id);
                        }
                      }}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {schedules.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Belum ada jadwal pribadi. Klik "Buat Jadwal Baru" untuk memulai.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showForm || editingItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingItem ? 'Edit Jadwal' : 'Buat Jadwal Baru'}
              </h2>
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
      </main>
    </div>
  );
}
