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
    <div className="bg-[#f7f3ed] rounded-2xl p-6 mb-12 flex flex-col lg:flex-row gap-6 items-center">
      <div className="w-full lg:flex-1 relative">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Cari produk kerajinan..."
          className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border-none focus:ring-1 focus:ring-[#9e3c24]/20 text-stone-700 placeholder-stone-400"
        />
      </div>

      <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full lg:w-auto">
        <div className="relative group min-w-[200px]">
          <select
            value={kategoriId}
            onChange={(e) => handleKategoriChange(e.target.value)}
            className="w-full px-4 py-4 bg-white rounded-xl border-none focus:ring-1 focus:ring-[#9e3c24]/20 text-stone-500 text-sm font-medium pr-10 appearance-auto"
          >
            <option value="">Semua Kategori</option>
            {kategoriList.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleReset}
          className="w-full lg:w-auto px-6 py-4 rounded-xl font-medium text-stone-500 bg-white hover:bg-stone-50 border-none shadow-sm transition-all"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
