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
