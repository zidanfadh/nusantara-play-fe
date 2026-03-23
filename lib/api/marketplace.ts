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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQueryString(params?: any): string {
  if (!params) return '';
  const filtered = Object.entries(params)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
