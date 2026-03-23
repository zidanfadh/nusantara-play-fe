'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useProduk } from '@/hooks/useMarketplace';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { CheckoutForm } from '@/components/marketplace/CheckoutForm';
import { ArrowLeftIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

export default function ProdukDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useCurrentUser();
  const { data: produk, loading, error } = useProduk(id);
  const [showCheckout, setShowCheckout] = useState(false);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (error || !produk) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error?.message || 'Produk tidak ditemukan'}</p>
        </div>
      </div>
    );
  }

  const isOwner = user && produk.toko?.user_id === user.id;
  const canBuy = user && !isOwner && produk.stok > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/marketplace" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali ke Marketplace
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          {produk.images && produk.images.length > 0 ? (
            <img src={produk.images[0]} alt={produk.nama} className="w-full rounded-lg object-cover aspect-square" />
          ) : (
            <div className="w-full rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center aspect-square">
              <span className="text-white text-6xl font-bold">{produk.nama.charAt(0).toUpperCase()}</span>
            </div>
          )}
          {produk.images && produk.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {produk.images.slice(1).map((img, i) => (
                <img key={i} src={img} alt="" className="w-full rounded-md object-cover aspect-square" />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {produk.kategori && (
            <span className="inline-block px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full mb-2">
              {produk.kategori.nama}
            </span>
          )}

          <h1 className="text-2xl font-bold text-foreground">{produk.nama}</h1>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{formatRupiah(produk.harga)}</p>

          <div className="mt-2">
            {produk.stok > 0 ? (
              <span className="text-sm text-muted-foreground">Stok: {produk.stok}</span>
            ) : (
              <span className="text-sm text-red-600 font-medium">Stok Habis</span>
            )}
          </div>

          {produk.deskripsi && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground/80 mb-1">Deskripsi</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{produk.deskripsi}</p>
            </div>
          )}

          {/* Related PROTs */}
          {produk.prots && produk.prots.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground/80 mb-2">Terkait dengan PROT</h3>
              <div className="flex flex-wrap gap-2">
                {produk.prots.map((prot) => (
                  <Link key={prot.id} href={`/prot/${prot.id}`} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full hover:bg-indigo-200">
                    {prot.nama}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Toko */}
          {produk.toko && (
            <Link href={`/marketplace/toko/${produk.toko.id}`} className="mt-4 flex items-center p-3 bg-muted/50 rounded-md hover:bg-muted">
              <BuildingStorefrontIcon className="h-8 w-8 text-emerald-600 mr-3" />
              <div>
                <p className="font-medium text-foreground">{produk.toko.nama}</p>
                {produk.toko.alamat && <p className="text-xs text-muted-foreground">{produk.toko.alamat}</p>}
              </div>
            </Link>
          )}

          {/* Buy button */}
          {canBuy && (
            <button
              onClick={() => setShowCheckout(true)}
              className="mt-6 w-full px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition"
            >
              Beli Sekarang
            </button>
          )}

          {isOwner && (
            <Link
              href={`/marketplace/toko-saya/produk/${produk.id}/edit`}
              className="mt-6 block w-full text-center px-6 py-3 border border-emerald-600 text-emerald-600 font-semibold rounded-lg hover:bg-emerald-50 transition"
            >
              Edit Produk
            </Link>
          )}
        </div>
      </div>

      {showCheckout && <CheckoutForm produk={produk} onClose={() => setShowCheckout(false)} />}
    </div>
  );
}
