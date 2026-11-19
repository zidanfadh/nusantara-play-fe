'use client';

import { useSyncExternalStore } from 'react';
import { isDebugSearch } from './perf';

const noopSubscribe = () => () => {};

/**
 * `?debug=1` in the URL of a Jelajah page (Phase 13): turns on the stats overlay. Read after hydration
 * (server snapshot false), so the static pages need no Suspense boundary and nothing extra is mounted
 * without the flag.
 */
export function useDebugFlag(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => isDebugSearch(window.location.search),
    () => false,
  );
}
