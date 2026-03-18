'use client';

import { useBlockchainProof } from '@/hooks/useBlockchainProof';
import type { UserRole } from '@/types/user';

interface BlockchainBadgeProps {
  protId: string;
  userRole?: UserRole | null;
}

export function BlockchainBadge({ protId, userRole }: BlockchainBadgeProps) {
  const { proof, loading, notFound, reanchoring, reanchor } = useBlockchainProof(protId);

  const isAdmin = userRole === 'admin_kpoti';

  // Tidak ada proof (PROT belum diverifikasi) — sembunyikan
  if (notFound || (!loading && !proof)) return null;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-sm font-medium bg-muted text-muted-foreground border border-border animate-pulse">
        <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
        Blockchain...
      </div>
    );
  }

  if (!proof) return null;

  // Status: failed — hanya tampilkan ke admin dengan tombol reanchor
  if (proof.status === 'failed') {
    if (!isAdmin) return null;
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-sm font-medium bg-red-100 text-red-700 border border-red-200">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Blockchain Gagal
        </div>
        <button
          onClick={reanchor}
          disabled={reanchoring}
          className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50"
        >
          {reanchoring ? 'Memproses...' : 'Reanchor'}
        </button>
      </div>
    );
  }

  // Status: pending
  if (proof.status === 'pending') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Blockchain Pending
        </div>
        {isAdmin && (
          <button
            onClick={reanchor}
            disabled={reanchoring}
            className="text-xs text-gray-600 hover:text-gray-800 underline disabled:opacity-50"
          >
            {reanchoring ? 'Memproses...' : 'Reanchor'}
          </button>
        )}
      </div>
    );
  }

  // Status: confirmed
  const { fullyVerified } = proof.integrity;

  if (!fullyVerified) {
    // Confirmed tapi data mungkin dimodifikasi setelah verifikasi
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 cursor-help"
        title={`Blockchain: dikonfirmasi (v${proof.version}) — namun ada inkonsistensi data. Block: ${proof.blockNumber ?? '-'} | Tx: ${proof.txHash?.slice(0, 10) ?? '-'}...`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Blockchain ⚠
      </div>
    );
  }

  // Fully verified — tampilkan badge hijau dengan link ke Polygonscan
  const explorerUrl = `https://amoy.polygonscan.com/tx/${proof.txHash}`;

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-sm font-medium bg-green-100 text-green-800 border border-green-200 hover:bg-green-200 transition-colors"
      title={`Terverifikasi di Polygon Amoy (v${proof.version}) — Block: ${proof.blockNumber} | Dikonfirmasi: ${proof.anchoredAt ? new Date(proof.anchoredAt).toLocaleDateString('id-ID') : '-'}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      Blockchain Verified
    </a>
  );
}
