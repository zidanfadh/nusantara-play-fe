'use client';

import { useState, useEffect } from 'react';
import { CreateProdukData, KategoriProduk, Produk } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';

interface ProdukFormProps {
  initialData?: Produk;
  onSubmit: (data: CreateProdukData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProdukForm({ initialData, onSubmit, onCancel, isLoading = false }: ProdukFormProps) {
  const [formData, setFormData] = useState<CreateProdukData>({
    nama: initialData?.nama || '',
    slug: initialData?.slug || '',
    deskripsi: initialData?.deskripsi || '',
    harga: initialData?.harga || 0,
    stok: initialData?.stok || 0,
    kategori_id: initialData?.kategori_id || undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [kategoriList, setKategoriList] = useState<KategoriProduk[]>([]);

  useEffect(() => {
    marketplaceApi.listKategori().then(setKategoriList).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : 0) : value,
    }));
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
    if (!formData.nama.trim()) newErrors.nama = 'Nama produk wajib diisi';
    if (!formData.slug.trim()) newErrors.slug = 'Slug wajib diisi';
    if (formData.harga <= 0) newErrors.harga = 'Harga harus lebih dari 0';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-lg shadow-md">
      <div>
        <label className="block text-sm font-medium text-foreground/80">Nama Produk *</label>
        <input type="text" name="nama" value={formData.nama} onChange={handleNamaChange} className="mt-1 block w-full px-3 py-2 border border-border rounded-md text-foreground/80 sm:text-sm" />
        {errors.nama && <p className="mt-1 text-sm text-red-600">{errors.nama}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground/80">Slug *</label>
        <input type="text" name="slug" value={formData.slug} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-border rounded-md text-foreground/80 sm:text-sm" />
        {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground/80">Kategori</label>
        <select name="kategori_id" value={formData.kategori_id || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-border rounded-md text-foreground/80 sm:text-sm">
          <option value="">Tanpa Kategori</option>
          {kategoriList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground/80">Deskripsi</label>
        <textarea name="deskripsi" value={formData.deskripsi || ''} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-border rounded-md text-foreground/80 sm:text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80">Harga (Rp) *</label>
          <input type="number" name="harga" value={formData.harga} onChange={handleChange} min={0} className="mt-1 block w-full px-3 py-2 border border-border rounded-md text-foreground/80 sm:text-sm" />
          {errors.harga && <p className="mt-1 text-sm text-red-600">{errors.harga}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80">Stok</label>
          <input type="number" name="stok" value={formData.stok} onChange={handleChange} min={0} className="mt-1 block w-full px-3 py-2 border border-border rounded-md text-foreground/80 sm:text-sm" />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground/80 bg-card hover:bg-muted/50">Batal</button>
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Tambah Produk')}
        </button>
      </div>
    </form>
  );
}
