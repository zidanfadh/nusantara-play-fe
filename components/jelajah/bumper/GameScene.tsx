'use client';

import { Gamepad2 } from 'lucide-react';
import { SceneLayout } from './SceneLayout';

export const GAME_SCENE_TEXT = 'Segera hadir: mainkan permainan tradisional langsung di sini.';

/** Scene 4: placeholder until the games exist (owner decision, Phase 16). */
export function GameScene() {
  return (
    <SceneLayout
      kicker="Main game tradisional"
      title="Main langsung di browser"
      text={GAME_SCENE_TEXT}
      visual={
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-primary/10 md:h-36 md:w-36">
          <Gamepad2 className="h-14 w-14 text-primary md:h-16 md:w-16" aria-hidden />
          <span className="absolute -right-3 -top-2 rotate-6 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground shadow">
            Segera hadir
          </span>
        </div>
      }
    />
  );
}
