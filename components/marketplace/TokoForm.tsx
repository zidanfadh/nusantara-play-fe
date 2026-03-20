'use client';

import { useState } from 'react';
import { CreateTokoData, Toko } from '@/types/marketplace';

interface TokoFormProps {
  initialData?: Toko;
  onSubmit: (data: CreateTokoData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TokoForm({ initialData, onSubmit, onCancel, isLoading = false }: TokoFormProps) {
  const [formData, setFormData] = useState<CreateTokoData>({
    nama: initialData?.nama || '',
    slug: initialData?.slug || '',
    deskripsi: initialData?.deskripsi || '',
    logo_url: initialData?.logo_url || '',
    alamat: initialData?.alamat || '',
    phone: initialData?.phone || '',
    whatsapp: initialData?.whatsapp || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleNamaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nama = e.target.value;
    const slug = nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData((prev) => ({ ...prev, nama, slug: initialData ? prev.slug : slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.nama.trim()) newErrors.nama = 'Nama toko wajib diisi';
    if (!formData.slug.trim()) newErrors.slug = 'Slug wajib diisi';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nama Toko *</label>
        <input type="text" name="nama" value={formData.nama} onChange={handleNamaChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        {errors.nama && <p className="mt-1 text-sm text-red-600">{errors.nama}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Slug *</label>
        <input type="text" name="slug" value={formData.slug} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
        <textarea name="deskripsi" value={formData.deskripsi || ''} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Alamat</label>
        <input type="text" name="alamat" value={formData.alamat || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">No. Telepon</label>
          <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
          <input type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Batal</button>
        <button type="submit" disabled={isLoading} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Daftar Toko')}
        </button>
      </div>
    </form>
  );
}
