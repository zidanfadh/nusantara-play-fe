'use client';

import { useState } from 'react';
import { useKategoriList } from '@/hooks/useMarketplace';
import { KategoriProduk, CreateKategoriData } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function AdminKategoriPage() {
  const { data: kategoriList, loading, error, refetch } = useKategoriList();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateKategoriData>({ nama: '', slug: '', deskripsi: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ nama: '', slug: '', deskripsi: '' });
    setEditingId(null);
    setShowForm(false);
    setFormError(null);
  };

  const handleEdit = (k: KategoriProduk) => {
    setFormData({ nama: k.nama, slug: k.slug, deskripsi: k.deskripsi || '' });
    setEditingId(k.id);
    setShowForm(true);
  };

  const handleNamaChange = (nama: string) => {
    const slug = editingId ? formData.slug : nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData((prev) => ({ ...prev, nama, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      setFormError(null);
      if (editingId) {
        await marketplaceApi.updateKategori(editingId, formData);
      } else {
        await marketplaceApi.createKategori(formData);
      }
      resetForm();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan kategori');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      await marketplaceApi.deleteKategori(id);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kategori Produk</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700">
            <PlusIcon className="h-5 w-5 mr-2" />
            Tambah Kategori
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama *</label>
            <input type="text" value={formData.nama} onChange={(e) => handleNamaChange(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug *</label>
            <input type="text" value={formData.slug} onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
            <textarea value={formData.deskripsi || ''} onChange={(e) => setFormData((p) => ({ ...p, deskripsi: e.target.value }))} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex space-x-3">
            <button type="submit" disabled={formLoading} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {formLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Batal</button>
          </div>
        </form>
      )}

      {/* Loading */}
      {loading && <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>}

      {error && <div className="bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error.message}</p></div>}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {kategoriList.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Belum ada kategori</td></tr>
              ) : (
                kategoriList.map((k) => (
                  <tr key={k.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{k.nama}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{k.slug}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{k.deskripsi || '-'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleEdit(k)} className="text-indigo-600 hover:text-indigo-900"><PencilIcon className="h-4 w-4 inline" /></button>
                      <button onClick={() => handleDelete(k.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-4 w-4 inline" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
