# Marketplace Frontend MVP — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the frontend for Nusantara Legacy's marketplace — product browsing, seller
toko management, order placement, and admin category management. Consumes the backend
API built in `docs/plans/2026-03-20-marketplace-backend-mvp.md`.

**Architecture:** Next.js App Router pages under `app/(protected)/marketplace/` and
`app/(protected)/admin/marketplace/`. Data flows through typed API module (`lib/api/marketplace.ts`)
→ custom hooks (`hooks/useMarketplace.ts`) → page/component rendering. Follows exact same
patterns as the existing `events` feature (EventCard, EventForm, useEvents).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, @heroicons/react, pnpm

**Backend design doc:** `../nusantara-play-backend/docs/plans/2026-03-20-marketplace-backend-design.md`

---

## Route Structure

```
app/(protected)/marketplace/
├── page.tsx                          — Browse products (grid + filters)
├── produk/[id]/page.tsx              — Product detail + buy
├── toko/[id]/page.tsx                — Toko public page (products list)
├── toko-saya/
│   ├── page.tsx                      — Seller dashboard (my toko)
│   ├── create/page.tsx               — Register as seller
│   ├── produk/create/page.tsx        — Create product
│   └── produk/[id]/edit/page.tsx     — Edit product
├── orders/
│   ├── page.tsx                      — My orders (buyer)
│   └── [id]/page.tsx                 — Order detail
└── seller-orders/page.tsx            — Incoming orders (seller)

app/(protected)/admin/marketplace/
└── kategori/page.tsx                 — CRUD product categories
```

---

## Task 1: Types

**Files:**
- Create: `types/marketplace.ts`

**Step 1: Create marketplace types**

```typescript
// Marketplace Types

export enum OrderStatus {
  MENUNGGU = 'menunggu',
  DIKONFIRMASI = 'dikonfirmasi',
  DIKIRIM = 'dikirim',
  SELESAI = 'selesai',
  DIBATALKAN = 'dibatalkan',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.MENUNGGU]: 'Menunggu Konfirmasi',
  [OrderStatus.DIKONFIRMASI]: 'Dikonfirmasi',
  [OrderStatus.DIKIRIM]: 'Dikirim',
  [OrderStatus.SELESAI]: 'Selesai',
  [OrderStatus.DIBATALKAN]: 'Dibatalkan',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.MENUNGGU]: 'bg-yellow-100 text-yellow-800',
  [OrderStatus.DIKONFIRMASI]: 'bg-blue-100 text-blue-800',
  [OrderStatus.DIKIRIM]: 'bg-purple-100 text-purple-800',
  [OrderStatus.SELESAI]: 'bg-green-100 text-green-800',
  [OrderStatus.DIBATALKAN]: 'bg-red-100 text-red-800',
};

// --- KategoriProduk ---

export interface KategoriProduk {
  id: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateKategoriData {
  nama: string;
  slug: string;
  deskripsi?: string;
}

export interface UpdateKategoriData extends Partial<CreateKategoriData> {}

// --- Toko ---

export interface Toko {
  id: string;
  user_id: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  logo_url: string | null;
  alamat: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface CreateTokoData {
  nama: string;
  slug: string;
  deskripsi?: string;
  logo_url?: string;
  alamat?: string;
  phone?: string;
  whatsapp?: string;
}

export interface UpdateTokoData extends Partial<CreateTokoData> {}

// --- Produk ---

export interface Produk {
  id: string;
  toko_id: string;
  kategori_id: string | null;
  nama: string;
  slug: string;
  deskripsi: string | null;
  harga: number;
  stok: number;
  images: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  toko?: Toko;
  kategori?: KategoriProduk | null;
  prots?: {
    id: string;
    nama: string;
    jenis: string;
  }[];
}

export interface CreateProdukData {
  nama: string;
  slug: string;
  deskripsi?: string;
  harga: number;
  stok: number;
  images?: string[];
  kategori_id?: string;
}

export interface UpdateProdukData extends Partial<CreateProdukData> {}

export interface ProdukQueryParams {
  toko_id?: string;
  kategori_id?: string;
  prot_id?: string;
  search?: string;
}

// --- Order ---

export interface ShippingAddress {
  nama_penerima: string;
  phone: string;
  alamat_lengkap: string;
  kota: string;
  provinsi: string;
  kode_pos?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  produk_id: string;
  nama_produk: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
  produk?: Produk;
}

export interface Order {
  id: string;
  buyer_id: string;
  toko_id: string;
  status: OrderStatus;
  total_harga: number;
  shipping_address: ShippingAddress;
  catatan: string | null;
  kurir_pengiriman: string | null;
  nomor_resi: string | null;
  created_at: string;
  updated_at: string;
  buyer?: {
    id: string;
    full_name: string;
    email: string;
  };
  toko?: Toko;
  items: OrderItem[];
}

export interface CreateOrderItemData {
  produk_id: string;
  qty: number;
}

export interface CreateOrderData {
  toko_id: string;
  items: CreateOrderItemData[];
  shipping_address: ShippingAddress;
  catatan?: string;
}

export interface KirimOrderData {
  kurir_pengiriman: string;
  nomor_resi: string;
}
```

**Step 2: Commit**

```bash
git add types/marketplace.ts
git commit -m "feat(marketplace): add marketplace TypeScript types"
```

---

## Task 2: API Module

**Files:**
- Create: `lib/api/marketplace.ts`

**Step 1: Create the API module**

```typescript
import { apiClient } from './client';
import type {
  KategoriProduk,
  CreateKategoriData,
  UpdateKategoriData,
  Toko,
  CreateTokoData,
  UpdateTokoData,
  Produk,
  CreateProdukData,
  UpdateProdukData,
  ProdukQueryParams,
  Order,
  CreateOrderData,
  KirimOrderData,
} from '@/types/marketplace';

const BASE = '/marketplace';

function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const filtered = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return filtered ? `?${filtered}` : '';
}

// --- KategoriProduk ---

export async function listKategori(): Promise<KategoriProduk[]> {
  return apiClient.get<KategoriProduk[]>(`${BASE}/kategori`);
}

export async function getKategori(id: string): Promise<KategoriProduk> {
  return apiClient.get<KategoriProduk>(`${BASE}/kategori/${id}`);
}

export async function createKategori(data: CreateKategoriData): Promise<KategoriProduk> {
  return apiClient.post<KategoriProduk>(`${BASE}/kategori`, data);
}

export async function updateKategori(id: string, data: UpdateKategoriData): Promise<KategoriProduk> {
  return apiClient.patch<KategoriProduk>(`${BASE}/kategori/${id}`, data);
}

export async function deleteKategori(id: string): Promise<void> {
  return apiClient.delete<void>(`${BASE}/kategori/${id}`);
}

// --- Toko ---

export async function listToko(): Promise<Toko[]> {
  return apiClient.get<Toko[]>(`${BASE}/toko`);
}

export async function getToko(id: string): Promise<Toko> {
  return apiClient.get<Toko>(`${BASE}/toko/${id}`);
}

export async function getMyToko(): Promise<Toko> {
  return apiClient.get<Toko>(`${BASE}/toko/my`);
}

export async function createToko(data: CreateTokoData): Promise<Toko> {
  return apiClient.post<Toko>(`${BASE}/toko`, data);
}

export async function updateToko(id: string, data: UpdateTokoData): Promise<Toko> {
  return apiClient.patch<Toko>(`${BASE}/toko/${id}`, data);
}

// --- Produk ---

export async function listProduk(params?: ProdukQueryParams): Promise<Produk[]> {
  const qs = buildQueryString(params);
  return apiClient.get<Produk[]>(`${BASE}/produk${qs}`);
}

export async function getProduk(id: string): Promise<Produk> {
  return apiClient.get<Produk>(`${BASE}/produk/${id}`);
}

export async function createProduk(data: CreateProdukData): Promise<Produk> {
  return apiClient.post<Produk>(`${BASE}/produk`, data);
}

export async function updateProduk(id: string, data: UpdateProdukData): Promise<Produk> {
  return apiClient.patch<Produk>(`${BASE}/produk/${id}`, data);
}

export async function deleteProduk(id: string): Promise<void> {
  return apiClient.delete<void>(`${BASE}/produk/${id}`);
}

export async function linkProtToProduk(produkId: string, protId: string): Promise<Produk> {
  return apiClient.post<Produk>(`${BASE}/produk/${produkId}/prot`, { prot_id: protId });
}

export async function unlinkProtFromProduk(produkId: string, protId: string): Promise<void> {
  return apiClient.delete<void>(`${BASE}/produk/${produkId}/prot/${protId}`);
}

// --- Order ---

export async function createOrder(data: CreateOrderData): Promise<Order> {
  return apiClient.post<Order>(`${BASE}/order`, data);
}

export async function getMyOrders(): Promise<Order[]> {
  return apiClient.get<Order[]>(`${BASE}/order`);
}

export async function getSellerOrders(): Promise<Order[]> {
  return apiClient.get<Order[]>(`${BASE}/order/seller`);
}

export async function getOrder(id: string): Promise<Order> {
  return apiClient.get<Order>(`${BASE}/order/${id}`);
}

export async function konfirmasiOrder(id: string): Promise<Order> {
  return apiClient.patch<Order>(`${BASE}/order/${id}/konfirmasi`);
}

export async function kirimOrder(id: string, data: KirimOrderData): Promise<Order> {
  return apiClient.patch<Order>(`${BASE}/order/${id}/kirim`, data);
}

export async function selesaiOrder(id: string): Promise<Order> {
  return apiClient.patch<Order>(`${BASE}/order/${id}/selesai`);
}

export async function batalkanOrder(id: string): Promise<Order> {
  return apiClient.patch<Order>(`${BASE}/order/${id}/batalkan`);
}
```

**Step 2: Commit**

```bash
git add lib/api/marketplace.ts
git commit -m "feat(marketplace): add marketplace API module"
```

---

## Task 3: Hooks

**Files:**
- Create: `hooks/useMarketplace.ts`

**Step 1: Create marketplace hooks**

Follow the exact same `useState + useEffect + isMounted` pattern from `hooks/useEvents.ts`.

```typescript
import { useState, useEffect, useCallback } from 'react';
import type {
  KategoriProduk,
  Toko,
  Produk,
  ProdukQueryParams,
  Order,
} from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';

// --- KategoriProduk ---

export function useKategoriList() {
  const [data, setData] = useState<KategoriProduk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await marketplaceApi.listKategori();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch categories'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// --- Toko ---

export function useMyToko() {
  const [data, setData] = useState<Toko | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchToko() {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);
        const result = await marketplaceApi.getMyToko();
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : '';
          if (message.includes('belum memiliki toko') || message.includes('404')) {
            setNotFound(true);
          } else {
            setError(err instanceof Error ? err : new Error('Failed to fetch toko'));
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchToko();
    return () => { isMounted = false; };
  }, []);

  return { data, loading, error, notFound };
}

export function useToko(id: string | null) {
  const [data, setData] = useState<Toko | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) { setData(null); setLoading(false); return; }
    let isMounted = true;
    async function fetchToko() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.getToko(id!);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch toko'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchToko();
    return () => { isMounted = false; };
  }, [id]);

  return { data, loading, error };
}

// --- Produk ---

export function useProdukList(params?: ProdukQueryParams) {
  const [data, setData] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchProduk() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.listProduk(params);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch products'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchProduk();
    return () => { isMounted = false; };
  }, [JSON.stringify(params)]);

  return { data, loading, error };
}

export function useProduk(id: string | null) {
  const [data, setData] = useState<Produk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) { setData(null); setLoading(false); return; }
    let isMounted = true;
    async function fetchProduk() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.getProduk(id!);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch product'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchProduk();
    return () => { isMounted = false; };
  }, [id]);

  return { data, loading, error };
}

// --- Order ---

export function useMyOrders() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.getMyOrders();
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchOrders();
    return () => { isMounted = false; };
  }, [refresh]);

  return { data, loading, error, refetch: () => setRefresh((p) => p + 1) };
}

export function useSellerOrders() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.getSellerOrders();
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchOrders();
    return () => { isMounted = false; };
  }, [refresh]);

  return { data, loading, error, refetch: () => setRefresh((p) => p + 1) };
}

export function useOrder(id: string | null) {
  const [data, setData] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!id) { setData(null); setLoading(false); return; }
    let isMounted = true;
    async function fetchOrder() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.getOrder(id!);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch order'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchOrder();
    return () => { isMounted = false; };
  }, [id, refresh]);

  return { data, loading, error, refetch: () => setRefresh((p) => p + 1) };
}
```

**Step 2: Commit**

```bash
git add hooks/useMarketplace.ts
git commit -m "feat(marketplace): add marketplace hooks"
```

---

## Task 4: Shared Components

**Files:**
- Create: `components/marketplace/OrderStatusBadge.tsx`
- Create: `components/marketplace/ProdukCard.tsx`
- Create: `components/marketplace/ProdukFilter.tsx`

**Step 1: Create OrderStatusBadge**

`components/marketplace/OrderStatusBadge.tsx`:
```tsx
import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/marketplace';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${ORDER_STATUS_COLORS[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
```

**Step 2: Create ProdukCard**

`components/marketplace/ProdukCard.tsx`:
```tsx
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
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer">
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
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{produk.nama}</h3>

          {produk.kategori && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">
              {produk.kategori.nama}
            </span>
          )}

          <p className="text-sm text-gray-600 line-clamp-2 mt-2">{produk.deskripsi}</p>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold text-emerald-600">{formatRupiah(produk.harga)}</span>
            {produk.stok <= 0 ? (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Habis</span>
            ) : (
              <span className="text-xs text-gray-500">Stok: {produk.stok}</span>
            )}
          </div>

          {/* Toko */}
          {produk.toko && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{produk.toko.nama}</span>
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
```

**Step 3: Create ProdukFilter**

`components/marketplace/ProdukFilter.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { KategoriProduk } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';

interface ProdukFilterProps {
  onFilterChange: (filters: { search?: string; kategori_id?: string }) => void;
}

export function ProdukFilter({ onFilterChange }: ProdukFilterProps) {
  const [search, setSearch] = useState('');
  const [kategoriId, setKategoriId] = useState('');
  const [kategoriList, setKategoriList] = useState<KategoriProduk[]>([]);

  useEffect(() => {
    marketplaceApi.listKategori().then(setKategoriList).catch(() => {});
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ search: value, kategori_id: kategoriId || undefined });
  };

  const handleKategoriChange = (value: string) => {
    setKategoriId(value);
    onFilterChange({ search, kategori_id: value || undefined });
  };

  const handleReset = () => {
    setSearch('');
    setKategoriId('');
    onFilterChange({});
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search */}
        <div className="md:col-span-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cari Produk</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama produk..."
              className="text-gray-700 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Kategori */}
        <div className="md:col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
          <select
            value={kategoriId}
            onChange={(e) => handleKategoriChange(e.target.value)}
            className="block text-gray-700 w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          >
            <option value="">Semua Kategori</option>
            {kategoriList.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        <div className="md:col-span-3 flex items-end">
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add components/marketplace/
git commit -m "feat(marketplace): add shared components (ProdukCard, ProdukFilter, OrderStatusBadge)"
```

---

## Task 5: Browse Products Page

**Files:**
- Modify: `app/(protected)/marketplace/page.tsx` (replace placeholder)

**Step 1: Read the current file then replace it**

```tsx
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
```

**Step 2: Verify in browser**

```bash
pnpm dev
```

Navigate to `/marketplace`. Should see filter bar + empty state (no products yet).

**Step 3: Commit**

```bash
git add app/(protected)/marketplace/page.tsx
git commit -m "feat(marketplace): implement browse products page"
```

---

## Task 6: Product Detail Page

**Files:**
- Create: `app/(protected)/marketplace/produk/[id]/page.tsx`
- Create: `components/marketplace/CheckoutForm.tsx`

**Step 1: Create CheckoutForm**

`components/marketplace/CheckoutForm.tsx`:
```tsx
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
```

**Step 2: Create product detail page**

`app/(protected)/marketplace/produk/[id]/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
      <Link href="/marketplace" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
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

          <h1 className="text-2xl font-bold text-gray-900">{produk.nama}</h1>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{formatRupiah(produk.harga)}</p>

          <div className="mt-2">
            {produk.stok > 0 ? (
              <span className="text-sm text-gray-600">Stok: {produk.stok}</span>
            ) : (
              <span className="text-sm text-red-600 font-medium">Stok Habis</span>
            )}
          </div>

          {produk.deskripsi && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Deskripsi</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{produk.deskripsi}</p>
            </div>
          )}

          {/* Related PROTs */}
          {produk.prots && produk.prots.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Terkait dengan PROT</h3>
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
            <Link href={`/marketplace/toko/${produk.toko.id}`} className="mt-4 flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100">
              <BuildingStorefrontIcon className="h-8 w-8 text-emerald-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{produk.toko.nama}</p>
                {produk.toko.alamat && <p className="text-xs text-gray-500">{produk.toko.alamat}</p>}
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
```

**Step 3: Verify in browser**

Navigate to `/marketplace/produk/<some-uuid>`. Should render product detail.

**Step 4: Commit**

```bash
git add components/marketplace/CheckoutForm.tsx app/(protected)/marketplace/produk/
git commit -m "feat(marketplace): add product detail page with checkout"
```

---

## Task 7: Toko Registration + Dashboard

**Files:**
- Create: `components/marketplace/TokoForm.tsx`
- Create: `app/(protected)/marketplace/toko-saya/page.tsx`
- Create: `app/(protected)/marketplace/toko-saya/create/page.tsx`

**Step 1: Create TokoForm**

`components/marketplace/TokoForm.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { CreateTokoData, Toko } from '@/types/marketplace';

interface TokoFormProps {
  initialData?: Toko;
  onSubmit: (data: CreateTokoData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TokoForm({ initialData, onSubmit, onCancel, isLoading = false }: TokoFormProps) {
  const [formData, setFormData] = useState<CreateTokoData>({
    nama: initialData?.nama || '',
    slug: initialData?.slug || '',
    deskripsi: initialData?.deskripsi || '',
    logo_url: initialData?.logo_url || '',
    alamat: initialData?.alamat || '',
    phone: initialData?.phone || '',
    whatsapp: initialData?.whatsapp || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleNamaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nama = e.target.value;
    const slug = nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData((prev) => ({ ...prev, nama, slug: initialData ? prev.slug : slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.nama.trim()) newErrors.nama = 'Nama toko wajib diisi';
    if (!formData.slug.trim()) newErrors.slug = 'Slug wajib diisi';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nama Toko *</label>
        <input type="text" name="nama" value={formData.nama} onChange={handleNamaChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        {errors.nama && <p className="mt-1 text-sm text-red-600">{errors.nama}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Slug *</label>
        <input type="text" name="slug" value={formData.slug} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
        <textarea name="deskripsi" value={formData.deskripsi || ''} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Alamat</label>
        <input type="text" name="alamat" value={formData.alamat || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">No. Telepon</label>
          <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
          <input type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Batal</button>
        <button type="submit" disabled={isLoading} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Daftar Toko')}
        </button>
      </div>
    </form>
  );
}
```

**Step 2: Create toko registration page**

`app/(protected)/marketplace/toko-saya/create/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TokoForm } from '@/components/marketplace/TokoForm';
import { CreateTokoData } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function CreateTokoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateTokoData) => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.createToko(data);
      router.push('/marketplace/toko-saya');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat toko');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/marketplace" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali
      </Link>
      <h1 className="text-2xl font-bold mb-6">Daftar Sebagai Penjual</h1>
      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error}</p></div>}
      <TokoForm onSubmit={handleSubmit} onCancel={() => router.push('/marketplace')} isLoading={loading} />
    </div>
  );
}
```

**Step 3: Create toko dashboard page**

`app/(protected)/marketplace/toko-saya/page.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMyToko, useProdukList, useSellerOrders } from '@/hooks/useMarketplace';
import { ProdukCard } from '@/components/marketplace/ProdukCard';
import { OrderStatusBadge } from '@/components/marketplace/OrderStatusBadge';
import { PlusIcon, BuildingStorefrontIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

export default function TokoSayaPage() {
  const router = useRouter();
  const { data: toko, loading: tokoLoading, notFound } = useMyToko();
  const { data: produkList, loading: produkLoading } = useProdukList(toko ? { toko_id: toko.id } : undefined);
  const { data: orders, loading: ordersLoading } = useSellerOrders();

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
```

**Step 4: Commit**

```bash
git add components/marketplace/TokoForm.tsx app/(protected)/marketplace/toko-saya/
git commit -m "feat(marketplace): add toko registration and dashboard pages"
```

---

## Task 8: Create & Edit Product Pages

**Files:**
- Create: `components/marketplace/ProdukForm.tsx`
- Create: `app/(protected)/marketplace/toko-saya/produk/create/page.tsx`
- Create: `app/(protected)/marketplace/toko-saya/produk/[id]/edit/page.tsx`

**Step 1: Create ProdukForm**

`components/marketplace/ProdukForm.tsx`:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { CreateProdukData, KategoriProduk, Produk } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';

interface ProdukFormProps {
  initialData?: Produk;
  onSubmit: (data: CreateProdukData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProdukForm({ initialData, onSubmit, onCancel, isLoading = false }: ProdukFormProps) {
  const [formData, setFormData] = useState<CreateProdukData>({
    nama: initialData?.nama || '',
    slug: initialData?.slug || '',
    deskripsi: initialData?.deskripsi || '',
    harga: initialData?.harga || 0,
    stok: initialData?.stok || 0,
    kategori_id: initialData?.kategori_id || undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [kategoriList, setKategoriList] = useState<KategoriProduk[]>([]);

  useEffect(() => {
    marketplaceApi.listKategori().then(setKategoriList).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : 0) : value,
    }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleNamaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nama = e.target.value;
    const slug = nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData((prev) => ({ ...prev, nama, slug: initialData ? prev.slug : slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.nama.trim()) newErrors.nama = 'Nama produk wajib diisi';
    if (!formData.slug.trim()) newErrors.slug = 'Slug wajib diisi';
    if (formData.harga <= 0) newErrors.harga = 'Harga harus lebih dari 0';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nama Produk *</label>
        <input type="text" name="nama" value={formData.nama} onChange={handleNamaChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        {errors.nama && <p className="mt-1 text-sm text-red-600">{errors.nama}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Slug *</label>
        <input type="text" name="slug" value={formData.slug} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Kategori</label>
        <select name="kategori_id" value={formData.kategori_id || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm">
          <option value="">Tanpa Kategori</option>
          {kategoriList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
        <textarea name="deskripsi" value={formData.deskripsi || ''} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Harga (Rp) *</label>
          <input type="number" name="harga" value={formData.harga} onChange={handleChange} min={0} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
          {errors.harga && <p className="mt-1 text-sm text-red-600">{errors.harga}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Stok</label>
          <input type="number" name="stok" value={formData.stok} onChange={handleChange} min={0} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Batal</button>
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Tambah Produk')}
        </button>
      </div>
    </form>
  );
}
```

**Step 2: Create product page**

`app/(protected)/marketplace/toko-saya/produk/create/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProdukForm } from '@/components/marketplace/ProdukForm';
import { CreateProdukData } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function CreateProdukPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateProdukData) => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.createProduk(data);
      router.push('/marketplace/toko-saya');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan produk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/marketplace/toko-saya" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali ke Toko Saya
      </Link>
      <h1 className="text-2xl font-bold mb-6">Tambah Produk Baru</h1>
      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error}</p></div>}
      <ProdukForm onSubmit={handleSubmit} onCancel={() => router.push('/marketplace/toko-saya')} isLoading={loading} />
    </div>
  );
}
```

**Step 3: Edit product page**

`app/(protected)/marketplace/toko-saya/produk/[id]/edit/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProduk } from '@/hooks/useMarketplace';
import { ProdukForm } from '@/components/marketplace/ProdukForm';
import { CreateProdukData } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EditProdukPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: produk, loading: fetchLoading, error: fetchError } = useProduk(id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateProdukData) => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.updateProduk(id, data);
      router.push('/marketplace/toko-saya');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui produk');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  }

  if (fetchError || !produk) {
    return <div className="max-w-2xl mx-auto px-4 py-8"><div className="bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{fetchError?.message || 'Produk tidak ditemukan'}</p></div></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/marketplace/toko-saya" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali ke Toko Saya
      </Link>
      <h1 className="text-2xl font-bold mb-6">Edit Produk: {produk.nama}</h1>
      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error}</p></div>}
      <ProdukForm initialData={produk} onSubmit={handleSubmit} onCancel={() => router.push('/marketplace/toko-saya')} isLoading={loading} />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add components/marketplace/ProdukForm.tsx app/(protected)/marketplace/toko-saya/produk/
git commit -m "feat(marketplace): add create and edit product pages"
```

---

## Task 9: Toko Public Page

**Files:**
- Create: `app/(protected)/marketplace/toko/[id]/page.tsx`

**Step 1: Create toko public page**

```tsx
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
```

**Step 2: Commit**

```bash
git add app/(protected)/marketplace/toko/
git commit -m "feat(marketplace): add toko public detail page"
```

---

## Task 10: My Orders Page (Buyer)

**Files:**
- Create: `app/(protected)/marketplace/orders/page.tsx`

**Step 1: Create buyer orders page**

```tsx
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
      <Link href="/marketplace" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali ke Marketplace
      </Link>

      <h1 className="text-2xl font-bold mb-6">Pesanan Saya</h1>

      {loading && (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error.message}</p></div>}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow"><p className="text-gray-500">Anda belum memiliki pesanan</p></div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/marketplace/orders/${order.id}`}>
              <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{order.toko?.nama || 'Toko'}</p>
                    <p className="text-sm text-gray-600">{order.items.length} item</p>
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
```

**Step 2: Commit**

```bash
git add app/(protected)/marketplace/orders/page.tsx
git commit -m "feat(marketplace): add my orders page (buyer)"
```

---

## Task 11: Order Detail Page

**Files:**
- Create: `app/(protected)/marketplace/orders/[id]/page.tsx`

**Step 1: Create order detail page**

This page is shared for both buyer and seller. Shows order info, items, shipping, and action buttons based on role + status.

```tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const router = useRouter();
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

  const handleAction = async (action: () => Promise<any>) => {
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
```

**Step 2: Commit**

```bash
git add app/(protected)/marketplace/orders/[id]/
git commit -m "feat(marketplace): add order detail page with action buttons"
```

---

## Task 12: Seller Orders Page

**Files:**
- Create: `app/(protected)/marketplace/seller-orders/page.tsx`

**Step 1: Create seller orders page**

```tsx
'use client';

import Link from 'next/link';
import { useSellerOrders } from '@/hooks/useMarketplace';
import { OrderStatusBadge } from '@/components/marketplace/OrderStatusBadge';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

export default function SellerOrdersPage() {
  const { data: orders, loading, error } = useSellerOrders();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/marketplace/toko-saya" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Kembali ke Toko Saya
      </Link>

      <h1 className="text-2xl font-bold mb-6">Pesanan Masuk</h1>

      {loading && <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>}

      {error && <div className="bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error.message}</p></div>}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow"><p className="text-gray-500">Belum ada pesanan masuk</p></div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/marketplace/orders/${order.id}`}>
              <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{order.buyer?.full_name || 'Pembeli'}</p>
                    <p className="text-sm text-gray-600">{order.items.length} item</p>
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
```

**Step 2: Commit**

```bash
git add app/(protected)/marketplace/seller-orders/
git commit -m "feat(marketplace): add seller orders page"
```

---

## Task 13: Admin Categories Page

**Files:**
- Create: `app/(protected)/admin/marketplace/kategori/page.tsx`

**Step 1: Create admin categories page**

```tsx
'use client';

import { useState } from 'react';
import { useKategoriList } from '@/hooks/useMarketplace';
import { KategoriProduk, CreateKategoriData } from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function AdminKategoriPage() {
  const { data: kategoriList, loading, error, refetch } = useKategoriList();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateKategoriData>({ nama: '', slug: '', deskripsi: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ nama: '', slug: '', deskripsi: '' });
    setEditingId(null);
    setShowForm(false);
    setFormError(null);
  };

  const handleEdit = (k: KategoriProduk) => {
    setFormData({ nama: k.nama, slug: k.slug, deskripsi: k.deskripsi || '' });
    setEditingId(k.id);
    setShowForm(true);
  };

  const handleNamaChange = (nama: string) => {
    const slug = editingId ? formData.slug : nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData((prev) => ({ ...prev, nama, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      setFormError(null);
      if (editingId) {
        await marketplaceApi.updateKategori(editingId, formData);
      } else {
        await marketplaceApi.createKategori(formData);
      }
      resetForm();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan kategori');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      await marketplaceApi.deleteKategori(id);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kategori Produk</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700">
            <PlusIcon className="h-5 w-5 mr-2" />
            Tambah Kategori
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama *</label>
            <input type="text" value={formData.nama} onChange={(e) => handleNamaChange(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug *</label>
            <input type="text" value={formData.slug} onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
            <textarea value={formData.deskripsi || ''} onChange={(e) => setFormData((p) => ({ ...p, deskripsi: e.target.value }))} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 sm:text-sm" />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex space-x-3">
            <button type="submit" disabled={formLoading} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {formLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Batal</button>
          </div>
        </form>
      )}

      {/* Loading */}
      {loading && <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>}

      {error && <div className="bg-red-50 border border-red-200 rounded-md p-4"><p className="text-red-800">{error.message}</p></div>}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {kategoriList.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Belum ada kategori</td></tr>
              ) : (
                kategoriList.map((k) => (
                  <tr key={k.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{k.nama}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{k.slug}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{k.deskripsi || '-'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleEdit(k)} className="text-indigo-600 hover:text-indigo-900"><PencilIcon className="h-4 w-4 inline" /></button>
                      <button onClick={() => handleDelete(k.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-4 w-4 inline" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/(protected)/admin/marketplace/
git commit -m "feat(marketplace): add admin categories management page"
```

---

## Task 14: Verify Build

**Step 1: Run lint**

```bash
pnpm lint
```

Expected: no errors.

**Step 2: Run build**

```bash
pnpm build
```

Expected: BUILD SUCCESS — no compilation errors.

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(marketplace): fix lint/build issues"
```

---

## Summary

| Task | What gets built |
|------|----------------|
| 1 | `types/marketplace.ts` — all TypeScript interfaces and enums |
| 2 | `lib/api/marketplace.ts` — API module (28 functions) |
| 3 | `hooks/useMarketplace.ts` — 8 hooks for data fetching |
| 4 | Shared components: ProdukCard, ProdukFilter, OrderStatusBadge |
| 5 | Browse products page (replace placeholder) |
| 6 | Product detail page + CheckoutForm modal |
| 7 | Toko registration + seller dashboard + TokoForm |
| 8 | Create + edit product pages + ProdukForm |
| 9 | Toko public detail page |
| 10 | My orders page (buyer) |
| 11 | Order detail page (buyer + seller actions) |
| 12 | Seller orders page |
| 13 | Admin categories CRUD page |
| 14 | Lint + build verification |

**New files total:** 1 type + 1 API + 1 hooks + 5 components + 12 pages = **20 files**

**Existing files modified:** `app/(protected)/marketplace/page.tsx` only (replaced placeholder)
