'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProdukForm } from '@/components/marketplace/ProdukForm';
import { CreateProdukData } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function CreateProdukPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateProdukData) => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.createProduk(data);
      router.push('/marketplace/toko-saya');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan produk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/marketplace/toko-saya" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali ke Toko Saya
      </Link>
      <h1 className="text-2xl font-bold mb-6">Tambah Produk Baru</h1>
      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error}</p></div>}
      <ProdukForm onSubmit={handleSubmit} onCancel={() => router.push('/marketplace/toko-saya')} isLoading={loading} />
    </div>
  );
}
