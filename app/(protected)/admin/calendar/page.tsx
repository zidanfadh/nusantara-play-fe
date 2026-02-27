'use client';

import { useState, useEffect } from 'react';
import { useImportantDates } from '@/hooks/useImportantDates';
import { CalendarItemForm } from '@/components/calendar/CalendarItemForm';
import { CalendarItemDetail } from '@/components/calendar/CalendarItemDetail';
import { CalendarItemType } from '@/types/calendar';
import type { CreateImportantDateRequest } from '@/types/calendar';
import { toast } from 'sonner';
import { Calendar, Eye, EyeOff, Trash, Edit, Plus, X } from 'lucide-react';

export default function AdminImportantDatesPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: dates, isLoading, error, create, update, remove, refetch } =
    useImportantDates();

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleCreate = async (data: CreateImportantDateRequest | any) => {
    setIsCreating(true);
    try {
      await create(data as CreateImportantDateRequest);
      setShowForm(false);
      toast.success('Tanggal penting berhasil ditambahkan');
      await refetch();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan tanggal penting');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (data: CreateImportantDateRequest | any) => {
    if (editingItem) {
      setIsUpdating(true);
      try {
        await update(editingItem.id, data as CreateImportantDateRequest);
        setEditingItem(null);
        toast.success('Tanggal penting berhasil diperbarui');
        await refetch();
      } catch (error: any) {
        toast.error(error.message || 'Gagal memperbarui tanggal penting');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleDelete = async (dateId: string) => {
    setIsDeleting(true);
    try {
      await remove(dateId);
      toast.success('Tanggal penting berhasil dihapus');
      await refetch();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus tanggal penting');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate stats
  const stats = {
    total: dates.length,
    public: dates.filter(d => d.visibility === 'public').length,
    internal: dates.filter(d => d.visibility === 'internal').length,
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tanggal Penting</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Kelola tanggal penting dan peringatan budaya
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tambah Tanggal Penting
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Public</p>
                <p className="text-2xl font-bold mt-1">{stats.public}</p>
              </div>
              <Eye className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Internal</p>
                <p className="text-2xl font-bold mt-1">{stats.internal}</p>
              </div>
              <EyeOff className="w-10 h-10 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Dates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Judul
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Visibilitas
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Daerah
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {dates.map((date) => (
                  <tr
                    key={date.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: date.color || '#3B82F6' }}
                        />
                        <div>
                          <div className="font-medium">{date.title}</div>
                          {date.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {date.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(date.start_date)}
                      {date.end_date && (
                        <>
                          <br />→ {formatDate(date.end_date)}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
                        {date.visibility}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {date.daerah_id ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          Daerah
                        </span>
                      ) : (
                        <span className="text-gray-500">Nasional</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedItemId(date.id)}
                          className="p-2 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingItem(date)}
                          className="p-2 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Yakin ingin menghapus tanggal penting ini?')) {
                              handleDelete(date.id);
                            }
                          }}
                          disabled={isDeleting}
                          className="p-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                          title="Hapus"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {dates.length === 0 && (
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Belum Ada Tanggal Penting
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Mulai tambahkan tanggal penting dan peringatan budaya untuk komunitas
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Tambah Tanggal Penting
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showForm || editingItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold">
                {editingItem ? 'Edit Tanggal Penting' : 'Tambah Tanggal Penting'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <CalendarItemForm
                type={CalendarItemType.IMPORTANT_DATE}
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
            const item = dates.find((d) => d.id === selectedItemId);
            if (item) {
              setEditingItem(item);
              setSelectedItemId(null);
            }
          }}
          onDelete={() => {
            if (confirm('Yakin ingin menghapus tanggal penting ini?')) {
              handleDelete(selectedItemId);
              setSelectedItemId(null);
            }
          }}
        />
      )}
    </div>
  );
}
