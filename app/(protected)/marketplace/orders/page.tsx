'use client';

import Link from 'next/link';
import { useMyOrders } from '@/hooks/useMarketplace';
import { OrderStatusBadge } from '@/components/marketplace/OrderStatusBadge';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
}

export default function MyOrdersPage() {
  const { data: orders, loading, error } = useMyOrders();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/marketplace" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali ke Marketplace
      </Link>

      <h1 className="text-2xl font-bold mb-6">Pesanan Saya</h1>

      {loading && (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error.message}</p></div>}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg shadow"><p className="text-muted-foreground">Anda belum memiliki pesanan</p></div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/marketplace/orders/${order.id}`}>
              <div className="bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{formatDate(order.created_at)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{order.toko?.nama || 'Toko'}</p>
                    <p className="text-sm text-muted-foreground">{order.items.length} item</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-600">{formatRupiah(order.total_harga)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
