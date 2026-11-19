'use client';

import { useCallback, useState } from 'react';
import { ListChecks, Stamp } from 'lucide-react';
import { toast } from 'sonner';
import { demoRewardsStore, levelProgress, type DemoRewardsState, type RewardResult } from '@/lib/jelajah/demo-rewards';
import { KNOWN_PROVINCES } from '@/lib/jelajah/provinces';
import { placeToasts } from '@/lib/jelajah/toast-clearance';
import { stampDesign } from '@/lib/jelajah/stamps';
import { useDemoRewards } from '@/lib/jelajah/use-demo-rewards';
import { MisiPanel, type QuestDef } from './MisiPanel';
import { ProvinceStamp } from './ProvinceStamp';
import { PasporModal } from './PasporModal';

export const SIMULATION_LABEL = 'Simulasi · tidak disimpan';

const provinceName = (kode: string) => KNOWN_PROVINCES.find((p) => p.kode === kode)?.nama ?? kode;

/**
 * Toasts for a SIMULATED reward result: one for the XP gained (with what earned it) and a short one for a
 * level-up. sonner turns its animations off with prefers-reduced-motion.
 */
export function announceRewards(res: RewardResult): void {
  if (res.xpGained <= 0) return;
  const reasons = res.events.map((e) => {
    if (e.kind === 'enter') return `Masuk desa ${provinceName(e.provinsiKode)}`;
    if (e.kind === 'open-prot') return 'Membuka stan PROT';
    return `Stempel Paspor ${provinceName(e.provinsiKode)}`;
  });
  // The site-wide Toaster (app/layout.tsx) is top centre; keep the toast clear of the overlays (Phase 13).
  placeToasts();
  // Phase 22: a new Paspor stamp shows the province's own stamp design as the toast icon.
  const stamp = res.events.find((e) => e.kind === 'stamp');
  const icon = stamp && stampDesign(stamp.provinsiKode) ? <ProvinceStamp kode={stamp.provinsiKode} size={22} /> : null;
  toast.success(`+${res.xpGained} XP`, {
    description: `${reasons.join(' · ')} (${SIMULATION_LABEL})`,
    duration: stamp ? 3600 : 2600,
    ...(icon ? { icon } : {}),
  });
  if (res.levelAfter > res.levelBefore) {
    toast(`Naik ke Level ${res.levelAfter}!`, { description: SIMULATION_LABEL, duration: 2200 });
  }
}

/** Applies a SIMULATED reward rule to this tab's store and announces the result. */
export function grantDemoReward(rule: (s: DemoRewardsState) => RewardResult): RewardResult {
  const res = demoRewardsStore.apply(rule);
  announceRewards(res);
  return res;
}

/**
 * Compact HUD of the SIMULATED rewards (Phase 12): level badge, XP bar, Paspor and Misi. Placed by the
 * caller; it is small enough to stay clear of the back button, the joystick and the stand panel.
 */
export function RewardHud({
  quests,
  onOverlayChange,
  className = '',
}: {
  quests: readonly QuestDef[];
  /** Paspor or Misi opened (true) or closed (false): the scene pauses movement keys meanwhile. */
  onOverlayChange?: (open: boolean) => void;
  className?: string;
}) {
  const state = useDemoRewards();
  const progress = levelProgress(state.xp);
  const [overlay, setOverlay] = useState<'paspor' | 'misi' | null>(null);
  const show = (which: 'paspor' | 'misi') => {
    setOverlay(which);
    onOverlayChange?.(true);
  };
  const close = useCallback(() => {
    setOverlay(null);
    onOverlayChange?.(false);
  }, [onOverlayChange]);

  const button =
    'inline-flex items-center gap-1 rounded-lg border border-border bg-background/80 px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div
      className={`pointer-events-auto w-[14.5rem] rounded-xl border border-border bg-card/90 px-2.5 py-2 text-card-foreground shadow-sm backdrop-blur ${className}`}
      data-testid="reward-hud"
      data-toast-avoid
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
          Lv {progress.level}
        </span>
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`XP menuju Level ${progress.level + 1} (simulasi)`}
          aria-valuemin={progress.levelStartXp}
          aria-valuemax={progress.nextLevelXp}
          aria-valuenow={progress.xp}
          aria-valuetext={`${progress.xp} dari ${progress.nextLevelXp} XP`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${Math.round(progress.fraction * 100)}%` }}
          />
        </div>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-[11px] leading-tight">
        <span className="font-semibold tabular-nums">
          {progress.xp} / {progress.nextLevelXp} XP
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">{SIMULATION_LABEL}</span>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <button type="button" className={button} onClick={() => show('paspor')} aria-haspopup="dialog">
          <Stamp className="h-3.5 w-3.5 text-primary" aria-hidden /> Paspor
          <span className="font-normal tabular-nums text-muted-foreground">
            {state.stamps.length}/{KNOWN_PROVINCES.length}
          </span>
        </button>
        <button type="button" className={button} onClick={() => show('misi')} aria-haspopup="dialog">
          <ListChecks className="h-3.5 w-3.5 text-primary" aria-hidden /> Misi
        </button>
      </div>
      <PasporModal open={overlay === 'paspor'} onClose={close} stamps={state.stamps} onReset={() => demoRewardsStore.reset()} />
      <MisiPanel open={overlay === 'misi'} onClose={close} quests={quests} state={state} />
    </div>
  );
}
