import { useState, useEffect, useCallback } from 'react';
import { nftsApi } from '@/lib/api/nfts';
import { NftCatalog } from '@/types/nfts';

export function useNft(identifier: string, type: 'id' | 'slug' = 'id') {
  const [data, setData] = useState<NftCatalog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);

  const fetchNft = useCallback(async () => {
    if (!identifier) return;
    try {
      setLoading(true);
      setError(null);
      const res = type === 'slug' 
        ? await nftsApi.getBySlug(identifier)
        : await nftsApi.getById(identifier);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch NFT detail'));
    } finally {
      setLoading(false);
    }
  }, [identifier, type, refreshSeed]);

  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      fetchNft();
    }
    
    return () => {
      isMounted = false;
    };
  }, [fetchNft]);

  const refresh = () => setRefreshSeed(s => s + 1);

  return { nft: data, loading, error, refresh };
}
