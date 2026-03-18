'use client';

import { useState } from 'react';
import { useBlockchainProof } from '@/hooks/useBlockchainProof';
import type { UserRole } from '@/types/user';

interface BlockchainProofCardProps {
  protId: string;
  userRole?: UserRole | null;
}

function shortenHash(hash: string, start = 6, end = 4): string {
  if (hash.length <= start + end + 3) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function formatWIB(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '') + ' WIB';
}

function networkLabel(network: string): string {
  const map: Record<string, string> = {
    'polygon-amoy': 'Polygon Amoy',
    'polygon-mainnet': 'Polygon Mainnet',
    'polygon': 'Polygon Mainnet',
  };
  return map[network] ?? network;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 text-sm border border-border rounded hover:bg-muted transition-colors shrink-0"
    >
      {copied ? 'Disalin!' : 'Salin'}
    </button>
  );
}

export function BlockchainProofCard({ protId, userRole }: BlockchainProofCardProps) {
  const { proof, loading, notFound, reanchoring, reanchor } = useBlockchainProof(protId);
  const isAdmin = userRole === 'admin_kpoti';

  if (loading) {
    return (
      <div className="border border-green-200 bg-green-50/50 rounded-lg p-5 animate-pulse">
        <div className="h-5 bg-green-200/60 rounded w-64 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-green-100 rounded w-full" />
          <div className="h-4 bg-green-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (notFound || !proof) return null;

  // Pending state
  if (proof.status === 'pending') {
    return (
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-5">
        <div className="flex items-center gap-2 text-gray-600">
          <svg className="w-5 h-5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="font-medium">Sedang dianchor ke blockchain...</span>
          {isAdmin && (
            <button
              onClick={reanchor}
              disabled={reanchoring}
              className="ml-auto text-xs underline text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {reanchoring ? 'Memproses...' : 'Reanchor'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Failed state — admin only
  if (proof.status === 'failed') {
    if (!isAdmin) return null;
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Blockchain anchoring gagal</span>
          </div>
          <button
            onClick={reanchor}
            disabled={reanchoring}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {reanchoring ? 'Memproses...' : 'Reanchor'}
          </button>
        </div>
      </div>
    );
  }

  // Confirmed state
  const explorerUrl = `https://amoy.polygonscan.com/tx/${proof.txHash}`;
  const isFullyVerified = proof.integrity.fullyVerified;

  return (
    <div className={`border-2 rounded-lg p-5 bg-background ${isFullyVerified ? 'border-green-800' : 'border-yellow-700'}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {isFullyVerified ? (
            <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-yellow-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span className={`font-semibold text-sm ${isFullyVerified ? 'text-green-800' : 'text-yellow-800'}`}>
            {isFullyVerified
              ? 'Data diverifikasi dan diamankan di blockchain'
              : 'Dikonfirmasi di blockchain — ada inkonsistensi data'}
          </span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${isFullyVerified ? 'border-green-800 text-green-800 bg-white' : 'border-yellow-700 text-yellow-700 bg-white'}`}>
          {networkLabel(proof.network)}
        </span>
      </div>

      {/* Data rows */}
      <div className="space-y-3 mb-4">
        {/* Transaction */}
        {proof.txHash && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-28 shrink-0">Transaction</span>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline font-mono flex-1 min-w-0 truncate"
            >
              {shortenHash(proof.txHash)}
            </a>
            <CopyButton value={proof.txHash} />
          </div>
        )}

        {/* Block */}
        {proof.blockNumber && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-28 shrink-0">Block</span>
            <span className="text-sm text-foreground font-mono">
              #{Number(proof.blockNumber).toLocaleString('id-ID')}
            </span>
          </div>
        )}

        {/* Waktu on-chain */}
        {proof.anchoredAt && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-28 shrink-0">Waktu on-chain</span>
            <span className="text-sm text-foreground">{formatWIB(proof.anchoredAt)}</span>
          </div>
        )}

        {/* Versi */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-28 shrink-0">Versi</span>
          <span className="text-sm text-foreground">v{proof.version}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-800 text-green-800 rounded hover:bg-green-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Lihat di Polygonscan
        </a>
        {isAdmin && proof.status !== 'confirmed' && (
          <button
            onClick={reanchor}
            disabled={reanchoring}
            className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
          >
            {reanchoring ? 'Memproses...' : 'Reanchor'}
          </button>
        )}
      </div>
    </div>
  );
}
