'use client';

import { useEffect } from 'react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { AuditLogFilters } from '@/components/audit/AuditLogFilters';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { Pagination } from '@/components/audit/Pagination';

export default function AuditPage() {
  const {
    data,
    isLoading,
    error,
    updateFilters,
    changePage,
    fetchData,
  } = useAuditLogs({
    type: 'all',
    initialFilters: { page: 1, limit: 20 },
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-2 text-gray-600">
          Riwayat semua aktivitas yang terjadi di sistem
        </p>
      </div>

      <AuditLogFilters
        onFilterChange={updateFilters}
        showUserFilter={true}
        showEntityFilters={true}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">Error:</p>
          <p>{error.message}</p>
        </div>
      )}

      <AuditLogTable logs={data?.data || []} isLoading={isLoading} />

      {data?.pagination && (
        <div className="mt-4">
          <Pagination pagination={data.pagination} onPageChange={changePage} />
        </div>
      )}
    </div>
  );
}
