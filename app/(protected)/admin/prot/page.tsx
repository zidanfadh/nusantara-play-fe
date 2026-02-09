'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { protApi } from '@/lib/api/prot';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

interface VerificationStats {
  queue: {
    totalPending: number;
  };
  verifikasi: {
    totalApproved: number;
    totalRejected: number;
    totalRevision: number;
    total: number;
  };
  protByStatus: {
    DRAFT: number;
    DIKURASI: number;
    REVISI: number;
    DIVERIFIKASI: number;
    ARSIP_NASIONAL: number;
  };
}

export default function AdminProtPage() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin_kpoti') {
      router.push('/unauthorized');
      return;
    }

    if (user?.role === 'admin_kpoti') {
      loadStats();
    }
  }, [user, isLoading, router]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await protApi.getStats();
      setStats(data as VerificationStats);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Gagal memuat statistik.');
    } finally {
      setLoading(false);
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
              <h1 className="text-3xl font-bold text-gray-900">Manajemen PROT</h1>
              <p className="text-gray-600 mt-2">Statistik dan manajemen data PROT</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-white rounded-lg shadow-sm animate-pulse"></div>
                ))}
              </div>
            ) : stats ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Menunggu Review</h3>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.queue.totalPending}</div>
                    <p className="text-xs text-gray-500 mt-1">Dalam antrian</p>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Disetujui</h3>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.verifikasi.totalApproved}</div>
                    <p className="text-xs text-gray-500 mt-1">Data terverifikasi</p>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Perlu Revisi</h3>
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.verifikasi.totalRevision}</div>
                    <p className="text-xs text-gray-500 mt-1">Butuh perbaikan</p>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Arsip Nasional</h3>
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.protByStatus.ARSIP_NASIONAL}</div>
                    <p className="text-xs text-gray-500 mt-1">Data published</p>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">PROT by Status</h3>
                    <div className="space-y-3">
                      {Object.entries(stats.protByStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{status.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-semibold text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Verifikasi</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Review</span>
                        <span className="text-sm font-semibold text-gray-900">{stats.verifikasi.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Approved</span>
                        <span className="text-sm font-semibold text-green-600">{stats.verifikasi.totalApproved}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Rejected</span>
                        <span className="text-sm font-semibold text-red-600">{stats.verifikasi.totalRejected}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Revision</span>
                        <span className="text-sm font-semibold text-amber-600">{stats.verifikasi.totalRevision}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/prot/verifikasi/queue"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Lihat Queue
                    </Link>
                    <Link
                      href="/prot/verifikasi/my-queue"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tugas Saya
                    </Link>
                    <Link
                      href="/prot"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      Lihat Semua PROT
                    </Link>
                    <button
                      onClick={loadStats}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
