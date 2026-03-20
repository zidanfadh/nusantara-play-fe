'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useToko, useProdukList } from '@/hooks/useMarketplace';
import { ProdukCard } from '@/components/marketplace/ProdukCard';
import { ArrowLeftIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

export default function TokoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: toko, loading: tokoLoading, error: tokoError } = useToko(id);
  const { data: produkList, loading: produkLoading } = useProdukList(toko ? { toko_id: toko.id } : undefined);

  if (tokoLoading) {
    return <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  }

  if (tokoError || !toko) {
    return <div className="max-w-4xl mx-auto px-4 py-8"><div className="bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{tokoError?.message || 'Toko tidak ditemukan'}</p></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/marketplace" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali ke Marketplace
      </Link>

      {/* Toko Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center">
          {toko.logo_url ? (
            <img src={toko.logo_url} alt={toko.nama} className="w-16 h-16 rounded-full object-cover mr-4" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mr-4">
              <BuildingStorefrontIcon className="h-8 w-8 text-emerald-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{toko.nama}</h1>
            {toko.deskripsi && <p className="text-gray-600 mt-1">{toko.deskripsi}</p>}
            {toko.alamat && <p className="text-sm text-gray-500 mt-1">{toko.alamat}</p>}
          </div>
        </div>
        {toko.whatsapp && (
          <a href={`https://wa.me/${toko.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600">
            Hubungi via WhatsApp
          </a>
        )}
      </div>

      {/* Products */}
      <h2 className="text-xl font-bold mb-4">Produk ({produkList.length})</h2>
      {produkLoading ? (
        <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" /></div>
      ) : produkList.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow"><p className="text-gray-500">Toko ini belum memiliki produk</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {produkList.map((produk) => <ProdukCard key={produk.id} produk={produk} />)}
        </div>
      )}
    </div>
  );
}
