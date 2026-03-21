import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { KategoriProduk } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';

interface ProdukFilterProps {
  onFilterChange: (filters: { search?: string; kategori_id?: string }) => void;
}

export function ProdukFilter({ onFilterChange }: ProdukFilterProps) {
  const [search, setSearch] = useState('');
  const [kategoriId, setKategoriId] = useState('');
  const [kategoriList, setKategoriList] = useState<KategoriProduk[]>([]);

  useEffect(() => {
    marketplaceApi.listKategori().then(setKategoriList).catch(() => {});
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ search: value, kategori_id: kategoriId || undefined });
  };

  const handleKategoriChange = (value: string) => {
    setKategoriId(value);
    onFilterChange({ search, kategori_id: value || undefined });
  };

  const handleReset = () => {
    setSearch('');
    setKategoriId('');
    onFilterChange({});
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search */}
        <div className="md:col-span-5">
          <label className="block text-sm font-medium text-foreground/80 mb-1">Cari Produk</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama produk..."
              className="text-foreground/80 block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-card placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Kategori */}
        <div className="md:col-span-4">
          <label className="block text-sm font-medium text-foreground/80 mb-1">Kategori</label>
          <select
            value={kategoriId}
            onChange={(e) => handleKategoriChange(e.target.value)}
            className="block text-foreground/80 w-full px-3 py-2 border border-border rounded-md leading-5 bg-card focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          >
            <option value="">Semua Kategori</option>
            {kategoriList.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        <div className="md:col-span-3 flex items-end">
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground/80 bg-card hover:bg-muted/50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
