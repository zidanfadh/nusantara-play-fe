'use client';

import { useSyncExternalStore } from 'react';
import { demoRewardsStore, EMPTY_DEMO_REWARDS, type DemoRewardsState } from './demo-rewards';

/** The SIMULATED rewards of this tab (Phase 12). Server snapshot and first client render: empty. */
export function useDemoRewards(): DemoRewardsState {
  return useSyncExternalStore(demoRewardsStore.subscribe, demoRewardsStore.getSnapshot, () => EMPTY_DEMO_REWARDS);
}
