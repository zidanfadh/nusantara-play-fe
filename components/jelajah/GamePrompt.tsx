'use client';

import Link from 'next/link';
import { forwardRef } from 'react';
import { Gamepad2 } from 'lucide-react';

/** Neutral texts of the game pavilion (Phase 17): no claim about where the game comes from. */
export const PAVILION_TITLE = 'Paviliun permainan';
export const PLAY_CONGKLAK = 'Main Congklak';

/**
 * Prompt near the game pavilion in a province scene (Phase 17), styled like the stand prompt: a title and
 * the "Main Congklak" link (same tab; the game page links back with "Kembali ke desa").
 */
export const GamePrompt = forwardRef<HTMLAnchorElement, { href: string; compact: boolean }>(function GamePrompt(
  { href, compact },
  ref,
) {
  if (compact) {
    // Phones (about 180 px next to the joystick): one full-width button; the title is read by screen readers.
    return (
      <Link
        ref={ref}
        href={href}
        data-testid="game-prompt"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Gamepad2 className="h-4 w-4 shrink-0" aria-hidden />
        <span className="sr-only">{PAVILION_TITLE}: </span>
        {PLAY_CONGKLAK}
      </Link>
    );
  }
  return (
    <div
      className={`flex items-center rounded-xl border border-border bg-card/95 text-card-foreground shadow-lg ${compact ? 'gap-2 px-3 py-2' : 'gap-3 px-4 py-3'}`}
      data-testid="game-prompt"
    >
      <Gamepad2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{PAVILION_TITLE}</p>
      <Link
        ref={ref}
        href={href}
        className={`shrink-0 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${compact ? 'px-3 py-2' : 'px-4 py-2'}`}
      >
        {PLAY_CONGKLAK}
      </Link>
    </div>
  );
});

/** The same entry on the 2d tier: a card above the stand grid. */
export function GameCard({ href }: { href: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center" data-testid="game-card">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10" aria-hidden>
        <Gamepad2 className="h-6 w-6 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-foreground">{PAVILION_TITLE}</h3>
        <p className="text-sm text-muted-foreground">Main congklak langsung di browser, lawan komputer atau berdua.</p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {PLAY_CONGKLAK}
      </Link>
    </div>
  );
}
