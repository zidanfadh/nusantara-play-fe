'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProdukList } from '@/hooks/useMarketplace';
import { ProdukCard } from '@/components/marketplace/ProdukCard';
import { ProdukFilter } from '@/components/marketplace/ProdukFilter';
import { ProdukQueryParams } from '@/types/marketplace';
import { ShoppingBagIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function MarketplacePage() {
  const { user } = useCurrentUser();
  const [filters, setFilters] = useState<ProdukQueryParams>({});
  const { data: produkList, loading, error } = useProdukList(filters);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Marketplace</h1>
              <p className="mt-2 text-gray-600">
                Temukan peralatan dan perlengkapan permainan tradisional Nusantara
              </p>
            </div>
            <div className="flex space-x-3">
              {user && (
                <Link
                  href="/marketplace/orders"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ShoppingBagIcon className="h-5 w-5 mr-2" />
                  Pesanan Saya
                </Link>
              )}
              {user && (
                <Link
                  href="/marketplace/toko-saya"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  <BuildingStorefrontIcon className="h-5 w-5 mr-2" />
                  Toko Saya
                </Link>
              )}
            </div>
          </div>
        </div>

        <ProdukFilter onFilterChange={setFilters} />

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            <p className="mt-2 text-gray-600">Memuat produk...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {error.message}</p>
          </div>
        )}

        {!loading && !error && (
          produkList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">Tidak ada produk yang ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {produkList.map((produk) => (
                <ProdukCard key={produk.id} produk={produk} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
