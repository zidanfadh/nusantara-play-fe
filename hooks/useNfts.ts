import { useState, useEffect, useCallback } from 'react';
import { nftsApi } from '@/lib/api/nfts';
import { NftCatalog, NftListResponse } from '@/types/nfts';

type FetchNftsParams = {
  search?: string;
  blockchain_network?: string;
  prot_id?: string;
  page?: number;
  limit?: number;
};

export function useNfts(initialParams?: FetchNftsParams) {
  const [data, setData] = useState<NftListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [params, setParams] = useState<FetchNftsParams>(initialParams || { page: 1, limit: 12 });
  const [refreshSeed, setRefreshSeed] = useState(0);

  const fetchNfts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await nftsApi.getAll(params);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch NFTs'));
    } finally {
      setLoading(false);
    }
  }, [params, refreshSeed]);

  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      fetchNfts();
    }
    
    return () => {
      isMounted = false;
    };
  }, [fetchNfts]);

  const updateParams = (newParams: Partial<FetchNftsParams>) => {
    setParams(prev => ({ ...prev, ...newParams, page: newParams.page || prev.page || 1 }));
  };

  const refresh = () => setRefreshSeed(s => s + 1);

  return {
    nfts: data?.data || [],
    pagination: data?.pagination || null,
    loading,
    error,
    params,
    updateParams,
    refresh
  };
}
