'use client';

import Link from 'next/link';
import { useMyToko, useProdukList, useSellerOrders } from '@/hooks/useMarketplace';
import { ProdukCard } from '@/components/marketplace/ProdukCard';
import { PlusIcon, BuildingStorefrontIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

export default function TokoSayaPage() {
  const { data: toko, loading: tokoLoading, notFound } = useMyToko();
  const { data: produkList, loading: produkLoading } = useProdukList(toko ? { toko_id: toko.id } : undefined);
  const { data: orders } = useSellerOrders();

  if (tokoLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <BuildingStorefrontIcon className="mx-auto h-16 w-16 text-gray-400" />
        <h2 className="mt-4 text-xl font-bold text-gray-900">Anda belum memiliki toko</h2>
        <p className="mt-2 text-gray-600">Daftarkan toko Anda untuk mulai menjual produk.</p>
        <Link
          href="/marketplace/toko-saya/create"
          className="mt-6 inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Daftar Sebagai Penjual
        </Link>
      </div>
    );
  }

  if (!toko) return null;

  const pendingOrders = orders.filter((o) => o.status === 'menunggu');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Toko Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{toko.nama}</h1>
            <p className="text-sm text-gray-500 mt-1">{toko.deskripsi || 'Belum ada deskripsi'}</p>
          </div>
          <Link href="/marketplace/seller-orders" className="relative inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ShoppingBagIcon className="h-5 w-5 mr-2" />
            Pesanan Masuk
            {pendingOrders.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Products */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Produk Saya</h2>
        <Link
          href="/marketplace/toko-saya/produk/create"
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Tambah Produk
        </Link>
      </div>

      {produkLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
        </div>
      ) : produkList.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <p className="text-gray-500">Belum ada produk. Tambahkan produk pertama Anda!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {produkList.map((produk) => (
            <ProdukCard key={produk.id} produk={produk} />
          ))}
        </div>
      )}
    </div>
  );
}
