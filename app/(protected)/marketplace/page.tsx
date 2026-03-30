'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProdukList } from '@/hooks/useMarketplace';
import { ProdukCard } from '@/components/marketplace/ProdukCard';
import { ProdukFilter } from '@/components/marketplace/ProdukFilter';
import { ProdukQueryParams } from '@/types/marketplace';
import { ShoppingBagIcon, BuildingStorefrontIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function MarketplacePage() {
  const { user } = useCurrentUser();
  const [filters, setFilters] = useState<ProdukQueryParams>({});
  const { data: produkList, loading, error } = useProdukList(filters);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-12 pb-24">
      <Link href="/menu" className="inline-flex items-center text-sm text-stone-500 hover:text-[#9e3c24] mb-8 font-medium transition-colors">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Kembali ke Menu
      </Link>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Marketplace
          </h1>
          <p className="text-stone-500 max-w-md text-lg font-light leading-relaxed">
            Temukan peralatan dan perlengkapan permainan tradisional Nusantara
          </p>
        </div>
        <div className="flex gap-4">
          {user && (
            <Link
              href="/marketplace/orders"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f7f3ed] text-stone-700 font-medium hover:bg-[#ebe8e2] transition-all active:scale-95"
            >
              <ShoppingBagIcon className="w-5 h-5" />
              Pesanan Saya
            </Link>
          )}
          {user && (
            <Link
              href="/marketplace/toko-saya"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#9e3c24] text-white font-medium hover:opacity-90 shadow-lg shadow-[#9e3c24]/10 transition-all active:scale-95"
            >
              <BuildingStorefrontIcon className="w-5 h-5" />
              Toko Saya
            </Link>
          )}
        </div>
      </div>

      <ProdukFilter onFilterChange={setFilters} />

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#9e3c24]" />
          <p className="mt-2 text-muted-foreground">Memuat produk...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <p className="text-red-800 font-medium">Error: {error.message}</p>
        </div>
      )}

      {!loading && !error && (
        produkList.length === 0 ? (
          <div className="text-center py-12 bg-[#f7f3ed] rounded-2xl shadow-sm">
            <p className="text-stone-500 font-medium">Tidak ada produk yang ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {produkList.map((produk) => (
              <ProdukCard key={produk.id} produk={produk} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
