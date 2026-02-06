'use client';

import { useState, useCallback, useEffect } from 'react';
import type { 
  AuditLogsResponse, 
  AuditLogFilters,
  EntityAuditParams,
  UserAuditParams 
} from '@/types/audit';
import { 
  getAllAuditLogs, 
  getAuditLogsByEntity, 
  getAuditLogsByUser 
} from '@/lib/api/audit';

type AuditLogType = 'all' | 'entity' | 'user';

interface UseAuditLogsOptions {
  type: AuditLogType;
  entityParams?: Omit<EntityAuditParams, 'page' | 'limit'>;
  userParams?: Omit<UserAuditParams, 'page' | 'limit'>;
  initialFilters?: AuditLogFilters;
}

export function useAuditLogs(options: UseAuditLogsOptions) {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>(
    options.initialFilters || { page: 1, limit: 20 }
  );

  const fetchData = useCallback(async (newFilters?: AuditLogFilters) => {
    const currentFilters = newFilters || filters;
    setIsLoading(true);
    setError(null);

    try {
      let response: AuditLogsResponse;

      switch (options.type) {
        case 'all':
          response = await getAllAuditLogs(currentFilters);
          break;

        case 'entity':
          if (!options.entityParams) {
            throw new Error('Entity params are required for entity audit logs');
          }
          response = await getAuditLogsByEntity({
            ...options.entityParams,
            page: currentFilters.page,
            limit: currentFilters.limit,
          });
          break;

        case 'user':
          if (!options.userParams) {
            throw new Error('User params are required for user audit logs');
          }
          response = await getAuditLogsByUser({
            ...options.userParams,
            page: currentFilters.page,
            limit: currentFilters.limit,
          });
          break;

        default:
          throw new Error('Invalid audit log type');
      }

      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [options.type, options.entityParams, options.userParams]);

  const updateFilters = useCallback((newFilters: AuditLogFilters) => {
    setFilters(newFilters);
  }, []);

  const changePage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const refresh = useCallback(() => {
    setFilters(prev => ({ ...prev }));
  }, []);

  // Fetch data ketika filters berubah
  useEffect(() => {
    fetchData(filters);
  }, [filters, fetchData]);

  return {
    data,
    isLoading,
    error,
    filters,
    updateFilters,
    changePage,
    refresh,
    fetchData,
  };
}
