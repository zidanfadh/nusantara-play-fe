'use client';

import { ArrowRight, Sparkles, Stamp } from 'lucide-react';
import type { RefObject } from 'react';
import { SIMULATION_LABEL } from '../RewardHud';
import { SceneLayout } from './SceneLayout';

/**
 * Scene 6: XP and Paspor (still SIMULATED, labelled like the HUD) and the large "Mulai Jelajah" button,
 * which ends the bumper.
 */
export function StartScene({ onStart, startRef }: { onStart: () => void; startRef?: RefObject<HTMLButtonElement | null> }) {
  return (
    <SceneLayout
      kicker="XP dan Paspor"
      title="Kumpulkan XP dan stempel Paspor"
      text="Masuk ke provinsi dan buka stan PROT untuk mengumpulkan XP dan stempel Paspor."
      visual={
        <div className="mx-auto flex items-center justify-center gap-3" aria-hidden>
          <span className="flex h-16 items-center gap-1.5 rounded-2xl bg-primary px-4 text-lg font-extrabold text-primary-foreground md:h-20 md:text-xl">
            <Sparkles className="h-5 w-5" /> +XP
          </span>
          <span className="flex h-16 w-16 -rotate-6 items-center justify-center rounded-2xl border-2 border-dashed border-primary text-primary md:h-20 md:w-20">
            <Stamp className="h-8 w-8 md:h-10 md:w-10" />
          </span>
        </div>
      }
    >
      <p className="mx-auto inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        {SIMULATION_LABEL}
      </p>
      <div className="mt-5">
        <button
          ref={startRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring"
        >
          Mulai Jelajah <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </SceneLayout>
  );
}
