import { apiClient } from './client';
import type {
  Daerah,
  DaerahListResponse,
  DaerahFilters,
  DaerahStats,
  PaginationParams,
  ChildrenParams,
} from '@/types/daerah';

/**
 * Get all daerah with filters and pagination
 * Public endpoint - no authentication required
 * 
 * @param filters - Filter by level, provinsi, page, and limit
 * @returns Promise with daerah list and pagination metadata
 */
export async function getAllDaerah(
  filters?: DaerahFilters
): Promise<DaerahListResponse> {
  const params = new URLSearchParams();
  
  if (filters) {
    if (filters.level) params.append('level', filters.level);
    if (filters.provinsi) params.append('provinsi', filters.provinsi);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
  }

  const queryString = params.toString();
  const url = queryString ? `/daerah?${queryString}` : '/daerah';

  return await apiClient.get<DaerahListResponse>(url);
}

/**
 * Get all provinces with pagination
 * Public endpoint - no authentication required
 * 
 * @param params - Pagination parameters (page, limit)
 * @returns Promise with provinces list and pagination metadata
 */
export async function getAllProvinces(
  params?: PaginationParams
): Promise<DaerahListResponse> {
  const queryParams = new URLSearchParams();
  
  if (params) {
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString 
    ? `/daerah/provinces?${queryString}` 
    : '/daerah/provinces';

  return await apiClient.get<DaerahListResponse>(url);
}

/**
 * Get daerah statistics
 * Public endpoint - no authentication required
 * 
 * @returns Promise with daerah statistics
 */
export async function getDaerahStats(): Promise<DaerahStats> {
  return await apiClient.get<DaerahStats>('/daerah/stats');
}

/**
 * Get daerah by ID
 * Public endpoint - no authentication required
 * 
 * @param id - Daerah ID (UUID)
 * @returns Promise with daerah details
 * @throws Error if daerah not found (404)
 */
export async function getDaerahById(id: string): Promise<Daerah> {
  return await apiClient.get<Daerah>(`/daerah/${id}`);
}

/**
 * Get children daerah (kabupaten/kota) for a parent daerah (provinsi)
 * Public endpoint - no authentication required
 * 
 * @param params - Parent ID and pagination parameters
 * @returns Promise with children daerah list and pagination metadata
 */
export async function getChildrenDaerah(
  params: ChildrenParams
): Promise<DaerahListResponse> {
  const { id, page, limit } = params;
  
  const queryParams = new URLSearchParams();
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());

  const queryString = queryParams.toString();
  const url = queryString 
    ? `/daerah/${id}/children?${queryString}`
    : `/daerah/${id}/children`;

  return await apiClient.get<DaerahListResponse>(url);
}

/**
 * Helper function to format daerah level for display
 */
export function formatDaerahLevel(level: string): string {
  const levelMap: Record<string, string> = {
    provinsi: 'Provinsi',
    kabupaten: 'Kabupaten',
    kota: 'Kota',
  };

  return levelMap[level] || level;
}

/**
 * Helper function to get daerah display name with level
 * Example: "Kab. Bandung" or "Kota Bandung"
 */
export function getDaerahDisplayName(daerah: Daerah): string {
  if (daerah.level === 'provinsi') {
    return daerah.nama;
  }
  
  const prefix = daerah.level === 'kabupaten' ? 'Kab.' : 'Kota';
  
  // If nama already includes the prefix, return as is
  if (daerah.nama.toLowerCase().includes(prefix.toLowerCase())) {
    return daerah.nama;
  }
  
  return `${prefix} ${daerah.nama}`;
}
