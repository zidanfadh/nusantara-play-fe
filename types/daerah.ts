// Daerah Level Enum
export type DaerahLevel = 'provinsi' | 'kabupaten' | 'kota';

// Main Daerah Entity
export interface Daerah {
  id: string;
  nama: string;
  kode: string;
  provinsi: string;
  level: DaerahLevel;
  parent_id: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// Pagination metadata (reusing from audit)
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// API Response for daerah list
export interface DaerahListResponse {
  data: Daerah[];
  pagination: PaginationMeta;
}

// Filter parameters for daerah
export interface DaerahFilters {
  level?: DaerahLevel;
  provinsi?: string;
  page?: number;
  limit?: number;
}

// Daerah Statistics Response
export interface DaerahStats {
  total: number;
  provinces: number;
  kabupaten: number;
  kota: number;
}

// Parameters for pagination only
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Parameters for children endpoint
export interface ChildrenParams extends PaginationParams {
  id: string;
}
