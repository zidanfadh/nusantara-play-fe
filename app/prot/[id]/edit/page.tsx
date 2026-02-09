'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtForm } from '@/components/prot/ProtForm';
import { ProtNavigation } from '@/components/prot/ProtNavigation';
import { protApi } from '@/lib/api/prot';
import { PROTEntity, PROTStatus } from '@/types/prot';

export default function EditProtPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [initialData, setInitialData] = useState<PROTEntity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const response = await protApi.getById(id);
        if (response) {
            setInitialData(response as PROTEntity);
        }
      } catch (err) {
        console.error('Failed to fetch PROT:', err);
        setError('Gagal memuat data PROT.');
      } finally {
        setIsFetching(false);
      }
    };

    if (id) {
        fetchData();
    }
  }, [id]);

  const handleSubmit = async (data: Partial<PROTEntity>) => {
    setIsLoading(true);
    setError(null);
    try {
      await protApi.update(id, data);
      router.push(`/prot/${id}`);
    } catch (err) {
      console.error('Failed to update PROT:', err);
      setError('Gagal menyimpan perubahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
      return (
          <div className="min-h-screen bg-gray-50">
              <ProtNavigation />
              <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
          </div>
      );
  }

  if (!initialData) {
      return (
        <div className="min-h-screen bg-gray-50">
            <ProtNavigation />
            <div className="pt-20 text-center">
                <h2 className="text-xl font-semibold text-gray-900">Data tidak ditemukan</h2>
                <Link href="/prot" className="text-primary hover:underline mt-4 inline-block">Kembali ke Daftar</Link>
            </div>
        </div>
      );
  }

  // Check permissions: Only DRAFT or REVISI can be edited
  if (initialData.status !== PROTStatus.DRAFT && initialData.status !== PROTStatus.REVISI) {
      return (
        <div className="min-h-screen bg-gray-50">
            <ProtNavigation />
            <div className="pt-20 px-4">
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                    <div className="text-amber-500 mb-4 flex justify-center">
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
                <p className="text-gray-600 mb-6">
                    Data dengan status <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{initialData.status}</span> tidak dapat disunting. Hanya data dengan status Draft atau Revisi yang dapat diubah.
                </p>
                <Link href={`/prot/${id}`} className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Kembali ke Detail
                </Link>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Navigation */}
      <ProtNavigation />

      {/* Breadcrumb Section */}
      <div className="bg-white border-b shadow-sm">
         <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
               <Link href="/" className="hover:text-primary">Beranda</Link>
               <span>/</span>
               <Link href="/prot" className="hover:text-primary">Daftar PROT</Link>
               <span>/</span>
               <Link href={`/prot/${id}`} className="hover:text-primary truncate max-w-[150px]">{initialData.nama}</Link>
               <span>/</span>
               <span className="font-medium text-gray-900">Edit</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Data: {initialData.nama}</h1>
         </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
            </div>
        )}
        <ProtForm
            title="Edit Data PROT"
            initialData={initialData}
            onSubmit={handleSubmit}
            isLoading={isLoading}
        />
      </div>
    </div>
  );
}
