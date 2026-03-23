'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TokoForm } from '@/components/marketplace/TokoForm';
import { CreateTokoData } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function CreateTokoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateTokoData) => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.createToko(data);
      router.push('/marketplace/toko-saya');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat toko');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/marketplace" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali
      </Link>
      <h1 className="text-2xl font-bold mb-6">Daftar Sebagai Penjual</h1>
      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error}</p></div>}
      <TokoForm onSubmit={handleSubmit} onCancel={() => router.push('/marketplace')} isLoading={loading} />
    </div>
  );
}
