// Audit Log Types

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'CHANGE_PASSWORD' 
  | 'UPDATE_PROFILE' 
  | 'UPDATE_ROLE' 
  | 'UPDATE_STATUS';

export type EntityType = 
  | 'user' 
  | 'daerah' 
  | 'api'
  | 'content' 
  | 'category'
  | 'comment'
  | 'like';

// Changes is a plain object containing the fields that changed
export type AuditChanges = Record<string, any>;

// Main Audit Log Entity
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: EntityType;
  entity_id: string | null;
  changes: AuditChanges | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Pagination metadata
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// API Response for audit logs
export interface AuditLogsResponse {
  data: AuditLog[];
  pagination: PaginationMeta;
}

// Filter parameters for audit logs
export interface AuditLogFilters {
  user_id?: string;
  entity_type?: EntityType;
  entity_id?: string;
  action?: AuditAction;
  page?: number;
  limit?: number;
}

// For entity-specific audit logs
export interface EntityAuditParams {
  type: EntityType;
  id: string;
  page?: number;
  limit?: number;
}

// For user-specific audit logs
export interface UserAuditParams {
  id: string;
  page?: number;
  limit?: number;
}
