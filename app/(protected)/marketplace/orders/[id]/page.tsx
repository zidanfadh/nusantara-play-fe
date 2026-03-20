'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useOrder } from '@/hooks/useMarketplace';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { OrderStatusBadge } from '@/components/marketplace/OrderStatusBadge';
import { OrderStatus, KirimOrderData } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useCurrentUser();
  const { data: order, loading, error, refetch } = useOrder(id);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Shipping form state
  const [showKirimForm, setShowKirimForm] = useState(false);
  const [kirimData, setKirimData] = useState<KirimOrderData>({ kurir_pengiriman: '', nomor_resi: '' });

  if (loading) return <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  if (error || !order) return <div className="max-w-4xl mx-auto px-4 py-8"><div className="bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error?.message || 'Order tidak ditemukan'}</p></div></div>;

  const isBuyer = user?.id === order.buyer_id;
  const isSeller = user?.id === order.toko?.user_id;

  const handleAction = async (action: () => Promise<unknown>) => {
    try {
      setActionLoading(true);
      setActionError(null);
      await action();
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal memproses');
    } finally {
      setActionLoading(false);
    }
  };

  const handleKirim = () => handleAction(() => marketplaceApi.kirimOrder(id, kirimData));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={isSeller ? '/marketplace/seller-orders' : '/marketplace/orders'} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali
      </Link>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Detail Pesanan</h1>
            <p className="text-sm text-gray-500 mt-1">{formatDate(order.created_at)}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {actionError && <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3"><p className="text-sm text-red-800">{actionError}</p></div>}

        {/* Items */}
        <div className="border rounded-md divide-y mb-6">
          {order.items.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{item.nama_produk}</p>
                <p className="text-sm text-gray-500">{formatRupiah(item.harga_satuan)} x {item.qty}</p>
              </div>
              <p className="font-semibold text-gray-900">{formatRupiah(item.subtotal)}</p>
            </div>
          ))}
          <div className="p-4 flex items-center justify-between bg-gray-50">
            <p className="font-bold text-gray-900">Total</p>
            <p className="text-xl font-bold text-emerald-600">{formatRupiah(order.total_harga)}</p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Alamat Pengiriman</h3>
          <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700">
            <p className="font-medium">{order.shipping_address.nama_penerima}</p>
            <p>{order.shipping_address.phone}</p>
            <p>{order.shipping_address.alamat_lengkap}</p>
            <p>{order.shipping_address.kota}, {order.shipping_address.provinsi} {order.shipping_address.kode_pos}</p>
          </div>
        </div>

        {/* Tracking Info */}
        {order.kurir_pengiriman && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Info Pengiriman</h3>
            <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700">
              <p>Kurir: <span className="font-medium">{order.kurir_pengiriman}</span></p>
              <p>No. Resi: <span className="font-medium">{order.nomor_resi}</span></p>
            </div>
          </div>
        )}

        {order.catatan && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Catatan</h3>
            <p className="text-sm text-gray-600">{order.catatan}</p>
          </div>
        )}

        {/* Toko / Buyer info */}
        {isBuyer && order.toko && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Penjual</h3>
            <Link href={`/marketplace/toko/${order.toko.id}`} className="text-sm text-emerald-600 hover:underline">{order.toko.nama}</Link>
          </div>
        )}
        {isSeller && order.buyer && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Pembeli</h3>
            <p className="text-sm text-gray-700">{order.buyer.full_name} ({order.buyer.email})</p>
          </div>
        )}

        {/* Kirim form */}
        {showKirimForm && (
          <div className="mb-6 p-4 border rounded-md space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Informasi Pengiriman</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Kurir</label>
              <input type="text" value={kirimData.kurir_pengiriman} onChange={(e) => setKirimData((p) => ({ ...p, kurir_pengiriman: e.target.value }))} placeholder="JNE, JNT, SiCepat, dll" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nomor Resi</label>
              <input type="text" value={kirimData.nomor_resi} onChange={(e) => setKirimData((p) => ({ ...p, nomor_resi: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
            </div>
            <div className="flex space-x-2">
              <button onClick={handleKirim} disabled={actionLoading || !kirimData.kurir_pengiriman || !kirimData.nomor_resi} className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {actionLoading ? 'Memproses...' : 'Kirim Pesanan'}
              </button>
              <button onClick={() => setShowKirimForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Batal</button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Seller: konfirmasi */}
          {isSeller && order.status === OrderStatus.MENUNGGU && (
            <button onClick={() => handleAction(() => marketplaceApi.konfirmasiOrder(id))} disabled={actionLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Konfirmasi Pesanan
            </button>
          )}

          {/* Seller: kirim */}
          {isSeller && order.status === OrderStatus.DIKONFIRMASI && !showKirimForm && (
            <button onClick={() => setShowKirimForm(true)} className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700">
              Kirim Pesanan
            </button>
          )}

          {/* Buyer: selesai */}
          {isBuyer && order.status === OrderStatus.DIKIRIM && (
            <button onClick={() => handleAction(() => marketplaceApi.selesaiOrder(id))} disabled={actionLoading} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              Pesanan Diterima
            </button>
          )}

          {/* Buyer cancel (MENUNGGU only) */}
          {isBuyer && order.status === OrderStatus.MENUNGGU && (
            <button onClick={() => handleAction(() => marketplaceApi.batalkanOrder(id))} disabled={actionLoading} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              Batalkan Pesanan
            </button>
          )}

          {/* Seller cancel (MENUNGGU / DIKONFIRMASI) */}
          {isSeller && (order.status === OrderStatus.MENUNGGU || order.status === OrderStatus.DIKONFIRMASI) && (
            <button onClick={() => handleAction(() => marketplaceApi.batalkanOrder(id))} disabled={actionLoading} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              Batalkan Pesanan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
