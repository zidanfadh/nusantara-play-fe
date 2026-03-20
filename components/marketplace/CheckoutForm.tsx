'use client';

import { useState } from 'react';
import { ShippingAddress, Produk } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';
import { useRouter } from 'next/navigation';

interface CheckoutFormProps {
  produk: Produk;
  onClose: () => void;
}

export function CheckoutForm({ produk, onClose }: CheckoutFormProps) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [address, setAddress] = useState<ShippingAddress>({
    nama_penerima: '',
    phone: '',
    alamat_lengkap: '',
    kota: '',
    provinsi: '',
    kode_pos: '',
  });
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = produk.harga * qty;

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.nama_penerima || !address.phone || !address.alamat_lengkap || !address.kota || !address.provinsi) {
      setError('Lengkapi semua field alamat pengiriman');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const order = await marketplaceApi.createOrder({
        toko_id: produk.toko_id,
        items: [{ produk_id: produk.id, qty }],
        shipping_address: address,
        catatan: catatan || undefined,
      });
      router.push(`/marketplace/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Beli Produk</h2>

        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="font-medium text-gray-900">{produk.nama}</p>
          <p className="text-emerald-600 font-bold">{formatRupiah(produk.harga)} x {qty} = {formatRupiah(total)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Qty */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Jumlah</label>
            <input
              type="number"
              min={1}
              max={produk.stok}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(produk.stok, Number(e.target.value))))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm"
            />
          </div>

          <hr />
          <h3 className="text-sm font-semibold text-gray-700">Alamat Pengiriman</h3>

          {['nama_penerima', 'phone', 'alamat_lengkap', 'kota', 'provinsi', 'kode_pos'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 capitalize">
                {field.replace(/_/g, ' ')}
              </label>
              <input
                type="text"
                value={address[field as keyof ShippingAddress] || ''}
                onChange={(e) => handleAddressChange(field as keyof ShippingAddress, e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm"
                required={field !== 'kode_pos'}
              />
            </div>
          ))}

          {/* Catatan */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Catatan (opsional)</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
              {loading ? 'Memproses...' : `Pesan (${formatRupiah(total)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
