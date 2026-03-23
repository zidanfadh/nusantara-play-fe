import Link from 'next/link';
import { Produk } from '@/types/marketplace';

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
      <div className="bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer">
        {/* Image */}
        {imageUrl ? (
          <img src={imageUrl} alt={produk.nama} className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <span className="text-white text-4xl font-bold">{produk.nama.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-foreground line-clamp-2">{produk.nama}</h3>

          {produk.kategori && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">
              {produk.kategori.nama}
            </span>
          )}

          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{produk.deskripsi}</p>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold text-emerald-600">{formatRupiah(produk.harga)}</span>
            {produk.stok <= 0 ? (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Habis</span>
            ) : (
              <span className="text-xs text-muted-foreground">Stok: {produk.stok}</span>
            )}
          </div>

          {/* Toko */}
          {produk.toko && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{produk.toko.nama}</span>
              </p>
            </div>
          )}

          {/* Related PROTs */}
          {produk.prots && produk.prots.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {produk.prots.map((prot) => (
                <span key={prot.id} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                  {prot.nama}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
