'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { Pagination } from '@/components/audit/Pagination';
import { formatEntityType } from '@/lib/api/audit';
import type { EntityType } from '@/types/audit';

export default function EntityAuditPage() {
  const params = useParams();
  const router = useRouter();
  const entityType = params.type as EntityType;
  const entityId = params.id as string;

  const {
    data,
    isLoading,
    error,
    changePage,
    fetchData,
  } = useAuditLogs({
    type: 'entity',
    entityParams: {
      type: entityType,
      id: entityId,
    },
    initialFilters: { page: 1, limit: 20 },
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Kembali
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">
          Audit Log - {formatEntityType(entityType)}
        </h1>
        <p className="mt-2 text-gray-600">
          Riwayat perubahan untuk entity ID:{' '}
          <span className="font-mono text-sm">{entityId}</span>
        </p>
      </div>

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
