'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { protApi } from '@/lib/api/prot';
import { VerifikasiQueue } from '@/types/prot';
import { VerificationTable } from '@/components/prot/VerificationTable';
import { ProtNavigation } from '@/components/prot/ProtNavigation';

export default function VerificationQueuePage() {
  const router = useRouter();
  const [items, setItems] = useState<VerifikasiQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await protApi.getQueue(pagination.page, pagination.limit);
      if (response && response.data) {
        setItems(response.data);
        if (response.pagination) {
          setPagination(prev => ({ ...prev, ...response.pagination }));
        }
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
      setError('Gagal memuat antrean verifikasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [pagination.page]);

  const handlePick = async (queueId: string) => {
    try {
      await protApi.pickQueue(queueId);
      alert('Tugas berhasil diambil. Silakan cek menu "Tugas Saya".');
      fetchQueue(); // Refresh list
      router.push('/prot/verifikasi/my-queue');
    } catch (err: any) {
      console.error('Error picking task:', err);
      alert(err.message || 'Gagal mengambil tugas.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ProtNavigation />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Antrean Verifikasi Tersedia</h1>
          <button
            onClick={fetchQueue}
            className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <VerificationTable
          items={items}
          type="available"
          loading={loading}
          onPick={handlePick}
        />

        {/* Simple Pagination */}
        {!loading && items.length > 0 && (
          <div className="flex justify-center mt-6 gap-2">
            <button
              disabled={pagination.page === 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-3 py-1">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
