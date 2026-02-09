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
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-white to-[#FFF9F0] rounded-xl shadow-sm p-5 border-l-4 border-[#C04A21]">
        <h1 className="text-xl font-bold text-[#2D2D2D]">Data Daerah</h1>
        <p className="mt-1 text-[#6B6B6B] text-xs">
          Daftar wilayah/geografis di Indonesia (provinsi, kabupaten, kota)
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-[10px] text-[#6B6B6B] mb-1 uppercase font-semibold tracking-wide">Total Daerah</p>
            <p className="text-2xl font-bold text-[#1A5F7A]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-[10px] text-[#6B6B6B] mb-1 uppercase font-semibold tracking-wide">Provinsi</p>
            <p className="text-2xl font-bold text-green-600">{stats.provinces}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-[10px] text-[#6B6B6B] mb-1 uppercase font-semibold tracking-wide">Kabupaten</p>
            <p className="text-2xl font-bold text-orange-600">{stats.kabupaten}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-[10px] text-[#6B6B6B] mb-1 uppercase font-semibold tracking-wide">Kota</p>
            <p className="text-2xl font-bold text-purple-600">{stats.kota}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-base font-bold mb-3 text-[#2D2D2D]">Filter</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="level" className="block text-xs font-medium text-[#6B6B6B] mb-1">
              Level
            </label>
            <select
              id="level"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as DaerahLevel | '')}
              className="w-full px-3 py-2 text-sm border border-[#E5E0D4] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
            >
              <option value="">Semua Level</option>
              <option value="provinsi">Provinsi</option>
              <option value="kabupaten">Kabupaten</option>
              <option value="kota">Kota</option>
            </select>
          </div>

          <div>
            <label htmlFor="provinsi" className="block text-xs font-medium text-[#6B6B6B] mb-1">
              Provinsi
            </label>
            <input
              type="text"
              id="provinsi"
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              placeholder="Nama provinsi"
              className="w-full px-3 py-2 text-sm border border-[#E5E0D4] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleFilterChange}
              className="flex-1 bg-[#1A5F7A] text-white py-2 px-4 rounded-lg text-sm hover:bg-[#237A9A] focus:outline-none focus:ring-2 focus:ring-[#1A5F7A] transition-colors"
            >
              Terapkan Filter
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-[#E5E0D4] text-[#6B6B6B] rounded-lg text-sm hover:bg-[#D6CDB8] focus:outline-none focus:ring-2 focus:ring-[#D6CDB8] transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <p className="font-medium text-sm">Error:</p>
          <p className="text-xs">{error.message}</p>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1A5F7A] mx-auto"></div>
          <p className="mt-3 text-[#6B6B6B] text-sm">Memuat data daerah...</p>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-[#6B6B6B] text-sm">Tidak ada data daerah ditemukan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
        <div>
          <Pagination pagination={data.pagination} onPageChange={changePage} />
        </div>
      )}
    </div>
  );
}
