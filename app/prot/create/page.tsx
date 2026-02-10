'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtForm } from '@/components/prot/ProtForm';
import { ProtNavigation } from '@/components/prot/ProtNavigation';
import { protApi } from '@/lib/api/prot';
import { PROTEntity } from '@/types/prot';

export default function CreateProtPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Partial<PROTEntity>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await protApi.create(data);
      if (response && response.id) {
        router.push(`/prot/${response.id}`);
      } else {
        router.push('/prot');
      }
    } catch (err) {
      console.error('Failed to create PROT:', err);
      setError('Gagal membuat data PROT. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header Navigation */}
      <ProtNavigation />

      {/* Breadcrumb */}
      <div className="bg-background border-b shadow-sm">
         <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
               <Link href="/" className="hover:text-primary">Beranda</Link>
               <span>/</span>
               <Link href="/prot" className="hover:text-primary">Daftar PROT</Link>
               <span>/</span>
               <span className="font-medium text-gray-900">Tambah Baru</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Tambah Permainan & Olahraga Tradisional</h1>
         </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
            </div>
        )}
        <ProtForm
            title="Form Data Baru"
            onSubmit={handleSubmit}
            isLoading={isLoading}
        />
      </div>
    </div>
  );
}
