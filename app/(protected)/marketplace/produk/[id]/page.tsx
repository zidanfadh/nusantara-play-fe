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
    <div className="max-w-6xl mx-auto px-6 pt-8 pb-24">
      <Link href="/marketplace" className="inline-flex items-center text-sm text-stone-500 hover:text-[#9e3c24] mb-8 font-medium transition-colors">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Kembali ke Marketplace
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-[#e6e2dc] shadow-sm">
            {produk.images && produk.images.length > 0 ? (
              <img src={produk.images[0]} alt={produk.nama} className="w-full object-cover aspect-square" />
            ) : (
              <div className="w-full bg-gradient-to-br from-[#f7f3ed] to-[#e6e2dc] flex items-center justify-center aspect-square">
                <span className="text-stone-400 text-6xl font-bold">{produk.nama.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          {produk.images && produk.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {produk.images.slice(1).map((img, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-[#e6e2dc]">
                  <img src={img} alt="" className="w-full h-full object-cover aspect-square hover:opacity-80 transition-opacity cursor-pointer" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col h-full">
          <div>
            {produk.kategori && (
              <span className="inline-block px-3 py-1 bg-[#ffdad2] text-[#3c0700] text-[10px] font-bold tracking-widest uppercase rounded-full mb-4">
                {produk.kategori.nama}
              </span>
            )}

            <h1 className="text-4xl font-extrabold text-stone-800 leading-tight">{produk.nama}</h1>
            <p className="text-3xl font-extrabold text-[#9e3c24] tracking-tight mt-4">{formatRupiah(produk.harga)}</p>

            <div className="mt-4">
              {produk.stok > 0 ? (
                <span className="text-xs font-bold text-stone-500 bg-[#f1ede7] px-3 py-1.5 rounded-lg inline-block">STOK: {produk.stok}</span>
              ) : (
                <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-lg inline-block">HABIS</span>
              )}
            </div>

            {produk.deskripsi && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-3">Deskripsi Produk</h3>
                <p className="text-stone-600 font-light leading-relaxed whitespace-pre-wrap">{produk.deskripsi}</p>
              </div>
            )}

            {/* Related PROTs */}
            {produk.prots && produk.prots.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-3">Terkait dengan Warisan</h3>
                <div className="flex flex-wrap gap-2">
                  {produk.prots.map((prot) => (
                    <Link key={prot.id} href={`/prot/${prot.id}`} className="px-4 py-2 bg-[#f7f3ed] text-stone-700 text-sm font-medium rounded-xl hover:bg-[#e6e2dc] transition-colors border border-[#e6e2dc]">
                      {prot.nama}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Toko */}
            {produk.toko && (
              <div className="mt-8 pt-8 border-t border-[#e6e2dc]">
                <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-4">Informasi Penjual</h3>
                <Link href={`/marketplace/toko/${produk.toko.id}`} className="flex items-center p-4 bg-[#f7f3ed] rounded-2xl hover:bg-[#ebe8e2] transition-colors group">
                  <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mr-4 shadow-sm border border-[#e6e2dc]">
                    <BuildingStorefrontIcon className="h-6 w-6 text-[#9e3c24]" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 group-hover:text-[#9e3c24] transition-colors">{produk.toko.nama}</p>
                    {produk.toko.alamat && <p className="text-sm text-stone-500 font-light mt-0.5">{produk.toko.alamat}</p>}
                  </div>
                </Link>
              </div>
            )}
          </div>

          <div className="mt-10 mb-2">
            {/* Buy button */}
            {canBuy && (
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full py-4 bg-[#9e3c24] text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-[#9e3c24]/20 active:scale-[0.98] text-lg"
              >
                Beli Sekarang
              </button>
            )}

            {isOwner && (
              <Link
                href={`/marketplace/toko-saya/produk/${produk.id}/edit`}
                className="block w-full text-center py-4 bg-[#f7f3ed] text-stone-700 font-bold rounded-2xl hover:bg-[#e6e2dc] transition-all active:scale-[0.98] text-lg border border-[#e6e2dc]"
              >
                Edit Produk
              </Link>
            )}
          </div>
        </div>
      </div>

      {showCheckout && <CheckoutForm produk={produk} onClose={() => setShowCheckout(false)} />}
    </div>
  );
}
