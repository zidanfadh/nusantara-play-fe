'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProduk } from '@/hooks/useMarketplace';
import { ProdukForm } from '@/components/marketplace/ProdukForm';
import { CreateProdukData } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EditProdukPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: produk, loading: fetchLoading, error: fetchError } = useProduk(id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateProdukData) => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.updateProduk(id, data);
      router.push('/marketplace/toko-saya');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui produk');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  }

  if (fetchError || !produk) {
    return <div className="max-w-2xl mx-auto px-4 py-8"><div className="bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{fetchError?.message || 'Produk tidak ditemukan'}</p></div></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/marketplace/toko-saya" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali ke Toko Saya
      </Link>
      <h1 className="text-2xl font-bold mb-6">Edit Produk: {produk.nama}</h1>
      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error}</p></div>}
      <ProdukForm initialData={produk} onSubmit={handleSubmit} onCancel={() => router.push('/marketplace/toko-saya')} isLoading={loading} />
    </div>
  );
}
