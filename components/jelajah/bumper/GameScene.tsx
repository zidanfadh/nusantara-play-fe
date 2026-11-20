'use client';

import { Gamepad2, Play } from 'lucide-react';
import { GAME_TEXTS, JELAJAH_GAMES, type JelajahGame } from '@/lib/games/links';
import { SceneLayout } from './SceneLayout';

export const GAME_SCENE_TEXT = 'Main congklak, gasing, dan egrang langsung di sini, tanpa masuk akun.';

/**
 * Scene 4 (Phase 16 placeholder; Phase 17: the first hosted game; Phase 23: one button per hosted game). Each
 * button ("Main Congklak", "Main Gasing", "Main Egrang") ends the bumper and opens that game (the bumper passes
 * `onPlay`). Side by side from `sm`, stacked and compact on phones. Every button carries `data-bumper-action`, so
 * Enter presses it instead of advancing the bumper.
 */
export function GameScene({ onPlay }: { onPlay?: (game: JelajahGame) => void }) {
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
        <div className="flex w-full max-w-xs flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center" data-testid="bumper-games">
          {JELAJAH_GAMES.map((game) => (
            <button
              key={game}
              type="button"
              data-bumper-action
              data-testid={`bumper-play-${game}`}
              onClick={(e) => {
                e.stopPropagation();
                onPlay(game);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring sm:px-6 sm:py-3 sm:text-base"
            >
              <Play className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden /> {GAME_TEXTS[game].play}
            </button>
          ))}
        </div>
      )}
    </SceneLayout>
  );
}
