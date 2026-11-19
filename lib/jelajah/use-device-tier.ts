'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  readTierChoice,
  resolveAutoTier,
  writeCachedAutoTier,
  writeTierChoice,
  type Tier,
  type TierChoice,
} from './device-tier';

/**
 * Effective tier = the user's choice, or the automatic tier. `tier` is null until known (the page
 * renders neither map before that, so three.js is not fetched for a device that ends up on 2d).
 */
export function useDeviceTier() {
  const [choice, setChoice] = useState<TierChoice | null>(null);
  const [autoTier, setAutoTier] = useState<Tier | null>(null);

  useEffect(() => {
    let isMounted = true;
    const stored = readTierChoice();
    // Reading localStorage is only possible after mount; one extra render is intended here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(stored ?? 'auto');
    resolveAutoTier().then((tier) => {
      if (isMounted) setAutoTier(tier);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const choose = useCallback((next: TierChoice) => {
    writeTierChoice(next);
    setChoice(next);
  }, []);

  /**
   * Automatic fallback (Phase 13): a lower automatic tier, remembered like the measured one. Ignored when
   * the user chose a tier manually.
   */
  const fallBack = useCallback(
    (next: Tier) => {
      if (choice !== 'auto') return false;
      writeCachedAutoTier(next);
      setAutoTier(next);
      return true;
    },
    [choice],
  );

  const tier: Tier | null = choice === null ? null : choice === 'auto' ? autoTier : choice;
  return { tier, choice: choice ?? 'auto', autoTier, choose, fallBack };
}
