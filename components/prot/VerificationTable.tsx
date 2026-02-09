'use client';

import Link from 'next/link';
import { VerifikasiQueue, PROTStatus } from '@/types/prot';

interface VerificationTableProps {
  items: VerifikasiQueue[];
  type: 'available' | 'assigned';
  onPick?: (queueId: string) => void;
  onRelease?: (queueId: string) => void;
  loading?: boolean;
}

export function VerificationTable({ items, type, onPick, onRelease, loading }: VerificationTableProps) {
  if (loading) {
    return (
      <div className="w-full bg-background border border-border rounded-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-muted-foreground">Memuat antrean...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full bg-background border border-border rounded-lg p-12 text-center">
        <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <h3 className="text-lg font-medium text-foreground">Tidak ada antrean</h3>
        <p className="text-muted-foreground">Saat ini tidak ada data yang perlu diverifikasi.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
          <tr>
            <th className="px-6 py-3">Nama PROT</th>
            <th className="px-6 py-3">Pengaju</th>
            <th className="px-6 py-3">Tanggal Submit</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="bg-background border-b border-border hover:bg-muted/20">
              <td className="px-6 py-4 font-medium text-foreground">
                <Link href={`/prot/${item.prot_id}`} className="hover:underline hover:text-primary">
                  {item.prot?.nama || 'Tanpa Nama'}
                </Link>
                <div className="text-xs text-muted-foreground mt-1">ID: {item.prot_id.substring(0, 8)}...</div>
              </td>
              <td className="px-6 py-4">
                {item.prot?.created_by || 'Unknown User'}
              </td>
              <td className="px-6 py-4">
                {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '-'}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                  ${item.prot?.status === PROTStatus.DIKURASI ? 'bg-blue-100 text-blue-800' :
                    item.prot?.status === PROTStatus.REVISI ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                  {item.prot?.status?.replace(/_/g, ' ') || 'UNKNOWN'}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                {type === 'available' && onPick && (
                  <button
                    onClick={() => onPick(item.id)}
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Ambil Tugas
                  </button>
                )}
                {type === 'assigned' && (
                  <>
                    <Link
                      href={`/prot/verifikasi/${item.prot_id}/review`}
                      className="font-medium text-green-600 hover:text-green-800 mr-4"
                    >
                      Review
                    </Link>
                    {onRelease && (
                      <button
                        onClick={() => onRelease(item.id)}
                        className="font-medium text-red-600 hover:text-red-800"
                      >
                        Lepas Tugas
                      </button>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
