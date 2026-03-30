import Link from 'next/link';
import { Produk } from '@/types/marketplace';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';

interface ProdukCardProps {
  produk: Produk;
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

export function ProdukCard({ produk }: ProdukCardProps) {
  const imageUrl = produk.images?.[0];

  return (
    <Link href={`/marketplace/produk/${produk.id}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#e6e2dc] mb-6">
          {imageUrl ? (
            <img 
               src={imageUrl} 
               alt={produk.nama} 
               className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#f7f3ed] to-[#e6e2dc] flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
              <span className="text-stone-400 text-6xl font-bold">{produk.nama.charAt(0).toUpperCase()}</span>
            </div>
          )}
          {produk.kategori && (
             <span className="absolute top-4 left-4 bg-[#ffdad2] text-[#3c0700] text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
               {produk.kategori.nama}
             </span>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-stone-800 group-hover:text-[#9e3c24] transition-colors leading-snug line-clamp-2">
              {produk.nama}
            </h3>
          </div>
          
          {produk.toko && (
            <p className="text-stone-400 text-sm font-medium flex items-center gap-1">
              <BuildingStorefrontIcon className="w-4 h-4" /> {produk.toko.nama}
            </p>
          )}

          <div className="flex justify-between items-end pt-2">
            <span className="text-lg font-extrabold text-[#9e3c24] tracking-tight">{formatRupiah(produk.harga)}</span>
            {produk.stok <= 0 ? (
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded">HABIS</span>
            ) : (
              <span className="text-[10px] font-bold text-stone-500 bg-[#f1ede7] px-2 py-1 rounded">STOK: {produk.stok}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
