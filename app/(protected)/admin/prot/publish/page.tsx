'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { protApi } from '@/lib/api/prot';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { PROTEntity, PROTStatus } from '@/types/prot';

export default function AdminPublishPage() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const [items, setItems] = useState<PROTEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin_kpoti') {
      router.push('/unauthorized');
      return;
    }

    if (user?.role === 'admin_kpoti') {
      loadData();
    }
  }, [user, isLoading, router]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await protApi.getAll({ status: PROTStatus.DIVERIFIKASI, limit: 100 });
      if (response && response.data) {
        setItems(response.data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (protId: string, protName: string) => {
    if (!confirm(`Publish "${protName}" ke Arsip Nasional?`)) return;

    setPublishing(protId);
    try {
      await protApi.publish(protId, 'Dipublikasikan ke arsip nasional');
      alert('Berhasil dipublikasikan!');
      loadData(); // Reload
    } catch (err: any) {
      console.error('Error publishing:', err);
      alert(err.message || 'Gagal publish.');
    } finally {
      setPublishing(null);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 ml-64">
          <AdminHeader user={user} />

          <main className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Publish ke Arsip Nasional</h1>
              <p className="text-gray-600 mt-2">PROT yang sudah diverifikasi dan siap untuk dipublish</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-white rounded-lg shadow-sm animate-pulse"></div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada PROT</h3>
                <p className="text-gray-600">Belum ada PROT yang siap untuk dipublish.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{item.nama}</h3>
                          <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                            {item.status.replace(/_/g, ' ')}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                            item.jenis === 'PERMAINAN_RAKYAT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.jenis.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{item.kabkotaName || item.kabkotaKode}, {item.provinsiName || item.provinsiKode}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Terverifikasi: {item.verified_at ? new Date(item.verified_at).toLocaleDateString('id-ID') : '-'}</span>
                          </div>
                        </div>

                        {item.statusAsalUsul && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {item.statusAsalUsul}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 ml-6">
                        <Link
                          href={`/prot/${item.id}`}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          Lihat Detail
                        </Link>
                        <button
                          onClick={() => handlePublish(item.id, item.nama)}
                          disabled={publishing === item.id}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                          {publishing === item.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Publishing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                              Publish
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
