'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { protApi } from '@/lib/api/prot';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { PROTEntity, PROTStatus, PROTJenis } from '@/types/prot';

export default function AdminAllProtPage() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const [items, setItems] = useState<PROTEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<PROTStatus | ''>('');
  const [jenisFilter, setJenisFilter] = useState<PROTJenis | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin_kpoti') {
      router.push('/unauthorized');
      return;
    }

    if (user?.role === 'admin_kpoti') {
      loadData();
    }
  }, [user, isLoading, router, statusFilter, jenisFilter, searchQuery, currentPage]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await protApi.getAll({
        status: statusFilter || undefined,
        jenis: jenisFilter || undefined,
        search: searchQuery || undefined,
        page: currentPage,
        limit,
      });
      if (response && response.data) {
        setItems(response.data);
        setTotalCount(response.pagination?.total || response.data.length);
      } else {
        setItems([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStatusFilter('');
    setJenisFilter('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / limit);

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
              <h1 className="text-3xl font-bold text-gray-900">Kelola PROT</h1>
              <p className="text-gray-600 mt-2">Lihat dan kelola semua data PROT</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pencarian
                  </label>
                  <input
                    type="text"
                    placeholder="Cari nama PROT..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as PROTStatus | '');
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Semua Status</option>
                    <option value={PROTStatus.DRAFT}>DRAFT</option>
                    <option value={PROTStatus.DIKURASI}>DIKURASI</option>
                    <option value={PROTStatus.REVISI}>REVISI</option>
                    <option value={PROTStatus.DIVERIFIKASI}>DIVERIFIKASI</option>
                    <option value={PROTStatus.ARSIP_NASIONAL}>ARSIP NASIONAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jenis
                  </label>
                  <select
                    value={jenisFilter}
                    onChange={(e) => {
                      setJenisFilter(e.target.value as PROTJenis | '');
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Semua Jenis</option>
                    <option value={PROTJenis.PERMAINAN_RAKYAT}>PERMAINAN RAKYAT</option>
                    <option value={PROTJenis.OLAHRAGA_TRADISIONAL}>OLAHRAGA TRADISIONAL</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleReset}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Total: <span className="font-semibold text-gray-900">{totalCount}</span> PROT
                </div>
                <div className="text-sm text-gray-600">
                  Halaman {currentPage} dari {totalPages || 1}
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Memuat data...</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada Data</h3>
                <p className="text-gray-600">Tidak ada PROT yang sesuai dengan filter.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nama
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jenis
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Daerah
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{item.nama}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.jenis === PROTJenis.PERMAINAN_RAKYAT
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.jenis.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.status === PROTStatus.ARSIP_NASIONAL
                                ? 'bg-purple-100 text-purple-800'
                                : item.status === PROTStatus.DIVERIFIKASI
                                ? 'bg-green-100 text-green-800'
                                : item.status === PROTStatus.REVISI
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{item.kabkotaName || item.kabkotaKode}</div>
                            <div className="text-sm text-gray-500">{item.provinsiName || item.provinsiKode}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/prot/${item.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Detail
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Menampilkan{' '}
                          <span className="font-medium">{(currentPage - 1) * limit + 1}</span>
                          {' '}-{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * limit, totalCount)}
                          </span>
                          {' '}dari{' '}
                          <span className="font-medium">{totalCount}</span> hasil
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <span className="sr-only">Previous</span>
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          {[...Array(totalPages)].map((_, idx) => (
                            <button
                              key={idx + 1}
                              onClick={() => setCurrentPage(idx + 1)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === idx + 1
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <span className="sr-only">Next</span>
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
