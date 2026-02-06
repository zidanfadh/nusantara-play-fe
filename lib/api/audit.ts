import { apiClient } from './client';
import type {
  AuditLogsResponse,
  AuditLogFilters,
  EntityAuditParams,
  UserAuditParams,
} from '@/types/audit';

/**
 * Get all audit logs with filters and pagination
 * Authorization: admin_kpoti only
 * 
 * @param filters - Filter parameters (user_id, entity_type, entity_id, action, page, limit)
 * @returns Promise with audit logs and pagination metadata
 */
export async function getAllAuditLogs(
  filters?: AuditLogFilters
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  
  if (filters) {
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.entity_type) params.append('entity_type', filters.entity_type);
    if (filters.entity_id) params.append('entity_id', filters.entity_id);
    if (filters.action) params.append('action', filters.action);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
  }

  const queryString = params.toString();
  const url = queryString ? `/audit?${queryString}` : '/audit';

  return await apiClient.get<AuditLogsResponse>(url);
}

/**
 * Get audit logs for a specific entity with pagination
 * Authorization: admin_kpoti, pakar
 * 
 * @param params - Entity type, ID, page, and limit
 * @returns Promise with audit logs and pagination metadata
 */
export async function getAuditLogsByEntity(
  params: EntityAuditParams
): Promise<AuditLogsResponse> {
  const { type, id, page, limit } = params;
  
  const queryParams = new URLSearchParams();
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());

  const queryString = queryParams.toString();
  const url = queryString 
    ? `/audit/entity/${type}/${id}?${queryString}`
    : `/audit/entity/${type}/${id}`;

  return await apiClient.get<AuditLogsResponse>(url);
}

/**
 * Get audit logs for actions performed by a specific user
 * Authorization: admin_kpoti only
 * 
 * @param params - User ID, page, and limit
 * @returns Promise with audit logs and pagination metadata
 */
export async function getAuditLogsByUser(
  params: UserAuditParams
): Promise<AuditLogsResponse> {
  const { id, page, limit } = params;
  
  const queryParams = new URLSearchParams();
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());

  const queryString = queryParams.toString();
  const url = queryString 
    ? `/audit/user/${id}?${queryString}`
    : `/audit/user/${id}`;

  return await apiClient.get<AuditLogsResponse>(url);
}

/**
 * Helper function to format audit action for display
 */
export function formatAuditAction(action: string): string {
  const actionMap: Record<string, string> = {
    create: 'Dibuat',
    update: 'Diperbarui',
    delete: 'Dihapus',
    change_password: 'Ganti Password',
    update_profile: 'Update Profil',
    update_role: 'Update Role',
    update_status: 'Update Status',
  };

  return actionMap[action] || action;
}

/**
 * Helper function to format entity type for display
 */
export function formatEntityType(entityType: string): string {
  const entityMap: Record<string, string> = {
    user: 'User',
    daerah: 'Daerah',
    content: 'Konten',
    category: 'Kategori',
    comment: 'Komentar',
    like: 'Like',
  };

  return entityMap[entityType] || entityType;
}
