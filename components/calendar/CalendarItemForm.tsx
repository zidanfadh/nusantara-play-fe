'use client';

import { useState, useEffect } from 'react';
import {
  CalendarItemType,
  CalendarItemVisibility,
  type CreateImportantDateRequest,
  type CreatePersonalScheduleRequest,
  type CalendarItem,
} from '@/types/calendar';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface CalendarItemFormProps {
  type: CalendarItemType;
  initialData?: CalendarItem;
  onSubmit: (data: CreateImportantDateRequest | CreatePersonalScheduleRequest) => Promise<void>;
  onCancel: () => void;
}

export function CalendarItemForm({
  type,
  initialData,
  onSubmit,
  onCancel,
}: CalendarItemFormProps) {
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    start_date: initialData?.start_date
      ? new Date(initialData.start_date).toISOString().slice(0, 16)
      : '',
    end_date: initialData?.end_date
      ? new Date(initialData.end_date).toISOString().slice(0, 16)
      : '',
    all_day: initialData?.all_day ?? true,
    color: initialData?.color || '#3B82F6',
    visibility: initialData?.visibility || CalendarItemVisibility.PRIVATE,
    daerah_id: initialData?.daerah_id || '',
  });

  const isImportantDate = type === CalendarItemType.IMPORTANT_DATE;
  const isAdmin = user?.role === 'admin_kpoti';
  const isKurator = user?.role === 'kurator_daerah';

  // Visibility options based on role and type
  const getVisibilityOptions = () => {
    if (isImportantDate) {
      return [
        { value: CalendarItemVisibility.PUBLIC, label: 'Public' },
        { value: CalendarItemVisibility.INTERNAL, label: 'Internal' },
      ];
    }

    // Personal schedule
    const options = [
      { value: CalendarItemVisibility.PRIVATE, label: 'Private' },
    ];

    if (user?.role === 'pakar' || isKurator || isAdmin) {
      options.push({ value: CalendarItemVisibility.INTERNAL, label: 'Internal' });
    }

    if (isAdmin) {
      options.push({ value: CalendarItemVisibility.PUBLIC, label: 'Public' });
    }

    return options;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: any = {
        title: formData.title,
        description: formData.description || undefined,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date
          ? new Date(formData.end_date).toISOString()
          : undefined,
        all_day: formData.all_day,
        color: formData.color || undefined,
        visibility: formData.visibility,
      };

      if (isImportantDate && formData.daerah_id) {
        data.daerah_id = formData.daerah_id;
      }

      await onSubmit(data);
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Judul <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Deskripsi</label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      {/* All Day */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="all_day"
          checked={formData.all_day}
          onChange={(e) =>
            setFormData({ ...formData, all_day: e.target.checked })
          }
          className="w-4 h-4"
        />
        <label htmlFor="all_day" className="text-sm font-medium">
          Sepanjang hari
        </label>
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {formData.all_day ? 'Tanggal Mulai' : 'Tanggal & Waktu Mulai'}{' '}
          <span className="text-red-500">*</span>
        </label>
        <input
          type={formData.all_day ? 'date' : 'datetime-local'}
          value={formData.start_date}
          onChange={(e) =>
            setFormData({ ...formData, start_date: e.target.value })
          }
          required
          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      {/* End Date */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {formData.all_day ? 'Tanggal Selesai' : 'Tanggal & Waktu Selesai'}{' '}
          (Opsional)
        </label>
        <input
          type={formData.all_day ? 'date' : 'datetime-local'}
          value={formData.end_date}
          onChange={(e) =>
            setFormData({ ...formData, end_date: e.target.value })
          }
          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium mb-1">Warna</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-12 h-12 border rounded cursor-pointer"
          />
          <input
            type="text"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            placeholder="#3B82F6"
            className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Visibilitas <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.visibility}
          onChange={(e) =>
            setFormData({
              ...formData,
              visibility: e.target.value as CalendarItemVisibility,
            })
          }
          required
          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        >
          {getVisibilityOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Daerah (only for important dates) */}
      {isImportantDate && isAdmin && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Daerah (Opsional)
          </label>
          <input
            type="text"
            value={formData.daerah_id}
            onChange={(e) =>
              setFormData({ ...formData, daerah_id: e.target.value })
            }
            placeholder="UUID daerah (kosongkan untuk nasional)"
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Kosongkan untuk tanggal penting nasional
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Menyimpan...' : initialData ? 'Update' : 'Buat'}
        </button>
      </div>
    </form>
  );
}
