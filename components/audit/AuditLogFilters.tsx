'use client';

import { useState } from 'react';
import type { AuditLogFilters, AuditAction, EntityType } from '@/types/audit';

interface AuditLogFiltersProps {
  onFilterChange: (filters: AuditLogFilters) => void;
  showUserFilter?: boolean;
  showEntityFilters?: boolean;
}

export function AuditLogFilters({ 
  onFilterChange,
  showUserFilter = true,
  showEntityFilters = true,
}: AuditLogFiltersProps) {
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });

  const handleFilterChange = (key: keyof AuditLogFilters, value: string | number) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined,
      page: 1, // Reset to first page when filters change
    };
    
    // Remove empty string values
    if (value === '') {
      delete newFilters[key];
    }
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: AuditLogFilters = {
      page: 1,
      limit: 20,
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const actions: AuditAction[] = [
    'create',
    'update',
    'delete',
    'change_password',
    'update_profile',
    'update_role',
    'update_status',
  ];

  const entityTypes: EntityType[] = [
    'user',
    'daerah',
    'content',
    'category',
    'comment',
    'like',
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h3 className="text-lg font-semibold mb-3">Filter</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {showUserFilter && (
          <div>
            <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              id="user_id"
              value={filters.user_id || ''}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              placeholder="UUID User"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {showEntityFilters && (
          <>
            <div>
              <label htmlFor="entity_type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipe Entity
              </label>
              <select
                id="entity_type"
                value={filters.entity_type || ''}
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="entity_id" className="block text-sm font-medium text-gray-700 mb-1">
                Entity ID
              </label>
              <input
                type="text"
                id="entity_id"
                value={filters.entity_id || ''}
                onChange={(e) => handleFilterChange('entity_id', e.target.value)}
                placeholder="UUID Entity"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">
            Aksi
          </label>
          <select
            id="action"
            value={filters.action || ''}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-1">
            Items per Halaman
          </label>
          <select
            id="limit"
            value={filters.limit || 20}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
}
