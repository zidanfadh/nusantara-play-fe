'use client';

import { useState } from 'react';
import { PROTFilters, PROTJenis, PROTStatus, TargetUsia } from '@/types/prot';
import { DaerahSelector } from '@/components/daerah/DaerahSelector';
import { Daerah } from '@/types/daerah';

interface ProtFilterProps {
  filters: PROTFilters;
  onFilterChange: (newFilters: PROTFilters) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export function ProtFilter({ filters, onFilterChange, onReset, isLoading }: ProtFilterProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: localSearch, page: 1 });
  };

  const handleProvinsiChange = (id: string, daerah: Daerah | null) => {
    onFilterChange({
      ...filters,
      provinsi: id,
      kabkota: '', // reset children
      kecamatan: '',
      desa: '',
      page: 1
    });
  };

  const handleKabkotaChange = (id: string, daerah: Daerah | null) => {
    onFilterChange({
      ...filters,
      kabkota: id,
      kecamatan: '', // reset children
      desa: '',
      page: 1
    });
  };

  return (
    <div className="bg-muted/50 rounded-lg p-6 mb-6 border border-border">
      <form onSubmit={handleSearchSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-3 lg:col-span-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama permainan/olahraga..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 bg-gray-50 dark:bg-background border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Jenis Filter */}
          <select
            value={filters.jenis || ''}
            onChange={(e) => onFilterChange({ ...filters, jenis: e.target.value as PROTJenis || undefined, page: 1 })}
            className="px-4 py-2.5 bg-gray-50 border dark:bg-background border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Semua Jenis</option>
            <option value={PROTJenis.PERMAINAN_RAKYAT}>Permainan Rakyat</option>
            <option value={PROTJenis.OLAHRAGA_TRADISIONAL}>Olahraga Tradisional</option>
          </select>

          {/* Target Usia */}
          <select
            value={filters.targetUsia || ''}
            onChange={(e) => onFilterChange({ ...filters, targetUsia: e.target.value as TargetUsia || undefined, page: 1 })}
            className="px-4 py-2.5 bg-gray-50 dark:bg-background border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Semua Usia</option>
            <option value={TargetUsia.ANAK}>Anak-anak</option>
            <option value={TargetUsia.REMAJA}>Remaja</option>
            <option value={TargetUsia.DEWASA}>Dewasa</option>
            <option value={TargetUsia.SEMUA_USIA}>Semua Usia</option>
          </select>

          {/* Status Filter (Optional - maybe only for authorized users) */}
          <select
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value as PROTStatus || undefined, page: 1 })}
            className="px-4 py-2.5 bg-gray-50 dark:bg-background border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Semua Status</option>
            <option value={PROTStatus.ARSIP_NASIONAL}>Arsip Nasional (Public)</option>
            <option value={PROTStatus.DRAFT}>Draft</option>
            <option value={PROTStatus.DIKURASI}>Dikurasi</option>
            <option value={PROTStatus.REVISI}>Revisi</option>
            <option value={PROTStatus.DIVERIFIKASI}>Diverifikasi</option>
          </select>

        </div>

        {/* Daerah Selectors */}
        <div className="mb-4">
           <DaerahSelector
             provinceValue={filters.provinsi}
             kabupatenKotaValue={filters.kabkota}
             onProvinceChange={handleProvinsiChange}
             onKabupatenKotaChange={handleKabkotaChange}
             showKabupatenKota={true}
           />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => {
              setLocalSearch('');
              onReset();
            }}
            className="px-4 py-2.5 bg-background border border-input rounded-md text-sm font-medium hover:bg-muted transition-colors"
            disabled={isLoading}
          >
            Reset Filter
          </button>
          <button
            type="submit"
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium shadow hover:bg-primary/90 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Memuat...' : 'Terapkan'}
          </button>
        </div>
      </form>
    </div>
  );
}
