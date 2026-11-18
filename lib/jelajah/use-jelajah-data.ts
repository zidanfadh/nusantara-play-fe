'use client';

import { useCallback, useEffect, useState } from 'react';
import { emptySummaries, loadJelajahData, type JelajahData } from './data';

export type JelajahDataStatus = 'loading' | 'ready' | 'error';

/**
 * Loads provinces and public PROT. Same pattern as hooks/useEvents.ts (isMounted guard, refresh
 * counter). While loading or after an error, `data.provinces` holds every known province with zero
 * PROT, so the map can still render its shapes.
 */
export function useJelajahData() {
  const [data, setData] = useState<JelajahData>(() => ({
    provinces: emptySummaries(),
    totalProt: 0,
    unassignedProt: 0,
  }));
  const [status, setStatus] = useState<JelajahDataStatus>('loading');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let isMounted = true;
    loadJelajahData()
      .then((result) => {
        if (!isMounted) return;
        setData(result);
        setStatus('ready');
      })
      .catch(() => {
        if (isMounted) setStatus('error');
      });
    return () => {
      isMounted = false;
    };
  }, [refresh]);

  const retry = useCallback(() => {
    setStatus('loading');
    setRefresh((n) => n + 1);
  }, []);

  return { data, status, retry };
}
