'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GEO_URL, parseProvinceGeo } from './geo';
import type { ProvinceRef } from './provinces';

/** Loads the static province GeoJSON (same origin, not a backend call) and matches it to codes. */
export function useProvinceShapes(provinces: readonly ProvinceRef[]) {
  const [json, setJson] = useState<unknown>(null);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetch(GEO_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((value: unknown) => {
        if (isMounted) setJson(value);
      })
      .catch(() => {
        if (isMounted) setFailed(true);
      });
    return () => {
      isMounted = false;
    };
  }, [refresh]);

  const parsed = useMemo(() => (json ? parseProvinceGeo(json, provinces) : null), [json, provinces]);

  const retry = useCallback(() => {
    setFailed(false);
    setRefresh((n) => n + 1);
  }, []);

  return { parsed, failed, retry };
}
