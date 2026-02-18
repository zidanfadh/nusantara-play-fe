export enum PROTStatus {
  DRAFT = 'DRAFT',
  DIKURASI = 'DIKURASI',
  REVISI = 'REVISI',
  DIVERIFIKASI = 'DIVERIFIKASI',
  ARSIP_NASIONAL = 'ARSIP_NASIONAL'
}

export enum PROTJenis {
  PERMAINAN_RAKYAT = 'PERMAINAN_RAKYAT',
  OLAHRAGA_TRADISIONAL = 'OLAHRAGA_TRADISIONAL'
}

export enum TargetUsia {
  ANAK = 'ANAK',
  REMAJA = 'REMAJA',
  DEWASA = 'DEWASA',
  SEMUA_USIA = 'SEMUA_USIA'
}

export interface Peralatan {
  nama: string;
  deskripsi?: string;
  kisaranHarga?: string;
  fotoAlat?: string[];
  urlPembelian?: string[];
}

export interface PROTEntity {
  id: string;
  nama: string;
  jenis: PROTJenis;
  status: PROTStatus;
  statusAsalUsul?: string;
  provinsiKode?: string;
  kabkotaKode?: string;
  kecamatanKode?: string;
  desaKode?: string;
  alamatLengkap?: string;
  caraBermain?: string;
  nilaiMoral?: string;
  targetUsia: TargetUsia;
  peralatan?: Peralatan[];
  fotoKegiatan?: string[];
  videoKegiatan?: string[];
  dokumenKurikulum?: string[];
  created_by?: string;
  verified_by?: string;
  published_by?: string;
  submitted_at?: string;
  verified_at?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;

  // Optional relations for UI display
  provinsiName?: string;
  kabkotaName?: string;
}

export interface VerifikasiEntity {
  id: string;
  prot_id: string;
  pakar_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_NEEDED';
  catatan?: string;
  saran_perbaikan?: string;
  dokumen_pendukung?: string[];
  verified_at: string;
  created_at: string;
  updated_at: string;
  pakar?: {
    id: string;
    full_name: string;
  };
}

export interface VerifikasiQueue {
  id: string;
  prot_id: string;
  assigned_pakar_id?: string;
  priority: number;
  assigned_at?: string;
  created_at: string;
  updated_at: string;
  prot?: PROTEntity;
}

export interface PROTFilters {
  page?: number;
  limit?: number;
  jenis?: PROTJenis;
  provinsi?: string;
  kabkota?: string;
  kecamatan?: string;
  desa?: string;
  targetUsia?: TargetUsia;
  search?: string;
  status?: PROTStatus;
  created_by?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
