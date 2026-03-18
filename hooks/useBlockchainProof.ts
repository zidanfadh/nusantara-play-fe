'use client';

import { useState, useEffect, useCallback } from 'react';
import { protApi } from '@/lib/api/prot';
import type { BlockchainProof } from '@/types/prot';

export function useBlockchainProof(protId: string | null) {
  const [proof, setProof] = useState<BlockchainProof | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reanchoring, setReanchoring] = useState(false);

  const fetchProof = useCallback(async () => {
    if (!protId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await protApi.getBlockchainProof(protId);
      setProof(data);
    } catch (err: unknown) {
      // 404 = belum ada proof (PROT belum pernah diverifikasi)
      if (err instanceof Error && err.message?.includes('404')) {
        setNotFound(true);
      }
      setProof(null);
    } finally {
      setLoading(false);
    }
  }, [protId]);

  useEffect(() => {
    fetchProof();
  }, [fetchProof]);

  const reanchor = useCallback(async () => {
    if (!protId) return;
    setReanchoring(true);
    try {
      await protApi.reanchorBlockchain(protId);
      // Setelah reanchor berhasil di-trigger, refresh proof setelah 3 detik
      setTimeout(() => fetchProof(), 3000);
    } finally {
      setReanchoring(false);
    }
  }, [protId, fetchProof]);

  return { proof, loading, notFound, reanchoring, reanchor, refresh: fetchProof };
}
