'use client';

import { useState } from 'react';
import type { AuditLog } from '@/types/audit';
import { formatAuditAction, formatEntityType } from '@/lib/api/audit';
import { AuditChangesDisplay } from './AuditChangesDisplay';

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (logId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      change_password: 'bg-yellow-100 text-yellow-800',
      update_profile: 'bg-blue-100 text-blue-800',
      update_role: 'bg-purple-100 text-purple-800',
      update_status: 'bg-orange-100 text-orange-800',
    };
    return colorMap[action] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1A5F7A] mx-auto"></div>
        <p className="mt-3 text-[#6B6B6B] text-sm">Memuat data audit log...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-[#6B6B6B] text-sm">Tidak ada audit log ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Waktu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Detail
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <>
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(
                        log.action
                      )}`}
                    >
                      {formatAuditAction(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatEntityType(log.entity_type)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="font-mono text-xs">
                      {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="font-mono text-xs">
                      {log.user_id ? log.user_id.substring(0, 8) + '...' : 'System'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ip_address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => toggleRow(log.id)}
                      className="text-[#1A5F7A] hover:text-[#237A9A] font-semibold text-xs"
                    >
                      {expandedRows.has(log.id) ? 'Tutup' : 'Lihat'}
                    </button>
                  </td>
                </tr>
                {expandedRows.has(log.id) && (
                  <tr key={`${log.id}-details`}>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Audit Log ID:</span>
                            <p className="font-mono text-xs text-gray-600 mt-1">{log.id}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">User Agent:</span>
                            <p className="text-xs text-gray-600 mt-1 break-all">
                              {log.user_agent || '-'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 block mb-2">
                            Perubahan Data:
                          </span>
                          <AuditChangesDisplay changes={log.changes} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
