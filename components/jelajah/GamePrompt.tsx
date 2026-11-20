'use client';

import Link from 'next/link';
import { forwardRef } from 'react';
import { Disc3, Footprints, Gamepad2, Hourglass, type LucideIcon } from 'lucide-react';
import { GAME_SOON_DESCRIPTION, GAME_SOON_TITLE, GAME_TEXTS, type JelajahGame } from '@/lib/games/links';

/** Neutral texts of the game pavilion (Phase 17): no claim about where the game comes from. */
export const PAVILION_TITLE = 'Paviliun permainan';
/** Kept for the Phase 17 callers; the label of every game is in GAME_TEXTS (Phase 22). */
export const PLAY_CONGKLAK = GAME_TEXTS.congklak.play;

/** Phase 22: one icon per game (congklak keeps the Phase 17 icon). */
export const GAME_ICONS: Readonly<Record<JelajahGame, LucideIcon>> = {
  congklak: Gamepad2,
  gasing: Disc3,
  egrang: Footprints,
};

/**
 * Prompt near the game pavilion in a province scene (Phase 17), styled like the stand prompt: a title and
 * the game's "Main …" link (same tab; the game page links back with "Kembali ke desa"). Phase 22: any game.
 */
export const GamePrompt = forwardRef<HTMLAnchorElement, { game: JelajahGame; href: string; compact: boolean }>(function GamePrompt(
  { game, href, compact },
  ref,
) {
  const Icon = GAME_ICONS[game];
  const play = GAME_TEXTS[game].play;
  if (compact) {
    // Phones (about 180 px next to the joystick): one full-width button; the title is read by screen readers.
    return (
      <Link
        ref={ref}
        href={href}
        data-testid="game-prompt"
        data-game={game}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="sr-only">{PAVILION_TITLE}: </span>
        {play}
      </Link>
    );
  }
  return (
    <div
      className={`flex items-center rounded-xl border border-border bg-card/95 text-card-foreground shadow-lg ${compact ? 'gap-2 px-3 py-2' : 'gap-3 px-4 py-3'}`}
      data-testid="game-prompt"
      data-game={game}
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{PAVILION_TITLE}</p>
      <Link
        ref={ref}
        href={href}
        className={`shrink-0 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${compact ? 'px-3 py-2' : 'px-4 py-2'}`}
      >
        {play}
      </Link>
    </div>
  );
});

/** The same entry on the 2d tier: a card above the stand grid. */
export function GameCard({ game, href }: { game: JelajahGame; href: string }) {
  const Icon = GAME_ICONS[game];
  const { play, description } = GAME_TEXTS[game];
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
      data-testid="game-card"
      data-game={game}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10" aria-hidden>
        <Icon className="h-6 w-6 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-foreground">{PAVILION_TITLE}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {play}
      </Link>
    </div>
  );
}

/**
 * Phase 22, 2d tier of a province without a playable game: the same "Game segera hadir" as the sign in the 3D scene.
 * Information only: no button, no link.
 */
export function GameSoonCard() {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 p-4"
      data-testid="game-soon-card"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted" aria-hidden>
        <Hourglass className="h-6 w-6 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-muted-foreground">{GAME_SOON_TITLE}</h3>
        <p className="text-sm text-muted-foreground">{GAME_SOON_DESCRIPTION}</p>
      </div>
    </div>
  );
}
