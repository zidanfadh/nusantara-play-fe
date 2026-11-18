'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { DEMO_REWARD_RULES, questProgress, stampTarget, type DemoRewardsState } from '@/lib/jelajah/demo-rewards';
import { DemoDialog } from './DemoDialog';

/** One demo quest per province scene. `protCount` null = not known yet (still loading or failed). */
export interface QuestDef {
  provinsiKode: string;
  nama: string;
  protCount: number | null;
}

/** Misi (Phase 12, SIMULATED): "Buka 3 stan PROT di <provinsi>" with progress. */
export function MisiPanel({
  open,
  onClose,
  quests,
  state,
}: {
  open: boolean;
  onClose: () => void;
  quests: readonly QuestDef[];
  state: DemoRewardsState;
}) {
  return (
    <DemoDialog
      open={open}
      onClose={onClose}
      title="Misi"
      subtitle={<strong>Simulasi, tidak disimpan</strong>}
    >
      <ul className="space-y-3">
        {quests.map((q) => {
          const count = q.protCount;
          const known = count !== null;
          const target = count !== null && count > 0 ? stampTarget(count) : DEMO_REWARD_RULES.stampProtTarget;
          const progress = questProgress(state, q.provinsiKode, count ?? DEMO_REWARD_RULES.stampProtTarget);
          const opened = Math.min(progress.opened, target);
          const pct = Math.round((opened / target) * 100);
          return (
            <li key={q.provinsiKode} className="rounded-xl border border-border px-3 py-3">
              <div className="flex items-start gap-2">
                {progress.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    Buka {target} stan PROT di {q.nama}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hadiah: Stempel Paspor {q.nama} dan +{DEMO_REWARD_RULES.stampXp} XP
                  </p>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={`Kemajuan misi ${q.nama}`}
                    aria-valuemin={0}
                    aria-valuemax={target}
                    aria-valuenow={progress.done ? target : opened}
                  >
                    <div className="h-full bg-primary" style={{ width: `${progress.done ? 100 : pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {progress.done ? 'Selesai' : `${opened} / ${target} stan dibuka`}
                  </p>
                  {known && progress.unavailable && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      PROT {q.nama} sedang dalam proses kurasi, jadi misi ini belum bisa diselesaikan.
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </DemoDialog>
  );
}
