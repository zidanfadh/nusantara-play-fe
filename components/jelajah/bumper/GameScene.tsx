'use client';

import { Gamepad2, Play } from 'lucide-react';
import { SceneLayout } from './SceneLayout';

export const GAME_SCENE_TEXT = 'Main congklak langsung di sini, tanpa masuk akun.';
export const GAME_SCENE_BUTTON = 'Main Congklak';

/**
 * Scene 4 (Phase 16 placeholder; Phase 17: the first hosted game). "Main Congklak" ends the bumper and
 * opens /main/congklak (the bumper passes `onPlay`). The button carries `data-bumper-action`, so Enter
 * presses it instead of advancing the bumper.
 */
export function GameScene({ onPlay }: { onPlay?: () => void }) {
  return (
    <SceneLayout
      kicker="Main game tradisional"
      title="Main langsung di browser"
      text={GAME_SCENE_TEXT}
      visual={
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-primary/10 md:h-36 md:w-36">
          <Gamepad2 className="h-14 w-14 text-primary md:h-16 md:w-16" aria-hidden />
        </div>
      }
    >
      {onPlay && (
        <button
          type="button"
          data-bumper-action
          data-testid="bumper-play-congklak"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3 text-base font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring"
        >
          <Play className="h-5 w-5" aria-hidden /> {GAME_SCENE_BUTTON}
        </button>
      )}
    </SceneLayout>
  );
}
