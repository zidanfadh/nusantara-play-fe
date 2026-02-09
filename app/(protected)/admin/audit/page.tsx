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
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-white to-[#FFF9F0] rounded-xl shadow-sm p-5 border-l-4 border-[#C04A21]">
        <h1 className="text-xl font-bold text-[#2D2D2D]">Audit Logs</h1>
        <p className="mt-1 text-[#6B6B6B] text-xs">
          Riwayat semua aktivitas yang terjadi di sistem
        </p>
      </div>

      <AuditLogFilters
        onFilterChange={updateFilters}
        showUserFilter={true}
        showEntityFilters={true}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <p className="font-medium text-sm">Error:</p>
          <p className="text-xs">{error.message}</p>
        </div>
      )}

      <AuditLogTable logs={data?.data || []} isLoading={isLoading} />

      {data?.pagination && (
        <div>
          <Pagination pagination={data.pagination} onPageChange={changePage} />
        </div>
      )}
    </div>
  );
}
