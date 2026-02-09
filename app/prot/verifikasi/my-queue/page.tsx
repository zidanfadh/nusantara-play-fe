'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { protApi } from '@/lib/api/prot';
import { VerifikasiQueue } from '@/types/prot';
import { VerificationTable } from '@/components/prot/VerificationTable';
import { ProtNavigation } from '@/components/prot/ProtNavigation';

export default function MyVerificationQueuePage() {
  const [items, setItems] = useState<VerifikasiQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyQueue = async () => {
    setLoading(true);
    try {
      // Assuming no pagination needed for personal queue initially, or use default
      const response = await protApi.getMyQueue(1, 50);
      if (response && response.data) {
        setItems(response.data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Error fetching my queue:', err);
      setError('Gagal memuat tugas saya.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyQueue();
  }, []);

  const handleRelease = async (queueId: string) => {
    if (!confirm('Yakin ingin melepas tugas ini kembali ke antrean umum?')) return;

    try {
      await protApi.releaseQueue(queueId);
      fetchMyQueue(); // Refresh list
    } catch (err: any) {
      console.error('Error releasing task:', err);
      alert(err.message || 'Gagal melepas tugas.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ProtNavigation />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Tugas Verifikasi Saya</h1>
          <button
            onClick={fetchMyQueue}
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
          type="assigned"
          loading={loading}
          onRelease={handleRelease}
        />
      </main>
    </div>
  );
}
