'use client';

import { useEffect, useState } from 'react';
import { useDaerah } from '@/hooks/useDaerah';
import { getDaerahStats } from '@/lib/api/daerah';
import { formatDaerahLevel } from '@/lib/api/daerah';
import { Pagination } from '@/components/audit/Pagination';
import type { DaerahStats, DaerahLevel } from '@/types/daerah';

export default function DaerahPage() {
  const [stats, setStats] = useState<DaerahStats | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<DaerahLevel | ''>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');

  const {
    data,
    isLoading,
    error,
    updateFilters,
    changePage,
    fetchData,
  } = useDaerah({
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    // Fetch initial data
    fetchData();

    // Fetch stats
    getDaerahStats()
      .then(setStats)
      .catch((err) => console.error('Error loading stats:', err));
  }, [fetchData]);

  const handleFilterChange = () => {
    updateFilters({
      level: selectedLevel || undefined,
      provinsi: selectedProvince || undefined,
      page: 1,
      limit: 20,
    });
  };

  const handleReset = () => {
    setSelectedLevel('');
    setSelectedProvince('');
    updateFilters({ page: 1, limit: 20 });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Data Daerah</h1>
        <p className="mt-2 text-gray-600">
          Daftar wilayah/geografis di Indonesia (provinsi, kabupaten, kota)
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Daerah</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Provinsi</p>
            <p className="text-3xl font-bold text-green-600">{stats.provinces}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Kabupaten</p>
            <p className="text-3xl font-bold text-orange-600">{stats.kabupaten}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Kota</p>
            <p className="text-3xl font-bold text-purple-600">{stats.kota}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h3 className="text-lg font-semibold mb-3">Filter</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              id="level"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as DaerahLevel | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Level</option>
              <option value="provinsi">Provinsi</option>
              <option value="kabupaten">Kabupaten</option>
              <option value="kota">Kota</option>
            </select>
          </div>

          <div>
            <label htmlFor="provinsi" className="block text-sm font-medium text-gray-700 mb-1">
              Provinsi
            </label>
            <input
              type="text"
              id="provinsi"
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              placeholder="Nama provinsi"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleFilterChange}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Terapkan Filter
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">Error:</p>
          <p>{error.message}</p>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data daerah...</p>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Tidak ada data daerah ditemukan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provinsi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Koordinat
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.data.map((daerah) => (
                  <tr key={daerah.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {daerah.nama}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {daerah.kode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        daerah.level === 'provinsi'
                          ? 'bg-green-100 text-green-800'
                          : daerah.level === 'kabupaten'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {formatDaerahLevel(daerah.level)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {daerah.provinsi}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {daerah.latitude && daerah.longitude
                        ? `${daerah.latitude.toFixed(4)}, ${daerah.longitude.toFixed(4)}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && (
        <div className="mt-4">
          <Pagination pagination={data.pagination} onPageChange={changePage} />
        </div>
      )}
    </div>
  );
}
