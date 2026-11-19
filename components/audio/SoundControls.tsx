'use client';

/**
 * Sound controls of the concept film and the intro bumper (Phase 21): the sound toggle (44 px,
 * aria-pressed, aria-label "Suara"; 🔊 on / 🔇 off) or, when the browser refused to start audio without
 * a tap, a clear "Nyalakan suara" button. Nothing at all without Web Audio. Clicks never reach the
 * player behind (a tap on the bumper means "next scene").
 */
import { Volume2, VolumeX } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { SoundStatus } from '@/lib/audio/session';

export const SOUND_TEXT = {
  toggle: 'Suara',
  enable: 'Nyalakan suara',
  turnOff: 'Matikan suara',
} as const;

const STYLES = {
  film: 'border border-white/25 bg-black/45 text-white hover:bg-black/60 focus-visible:ring-white',
  site: 'border border-border bg-card/90 text-card-foreground hover:bg-muted focus-visible:ring-ring',
} as const;

export function SoundControls({
  status,
  onToggle,
  onEnable,
  variant,
}: {
  status: SoundStatus;
  onToggle: () => void;
  onEnable: () => void;
  variant: keyof typeof STYLES;
}) {
  if (status === 'unsupported') return null;
  const base = `inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full text-sm font-semibold shadow-sm backdrop-blur-sm transition-colors focus:outline-none focus-visible:ring-2 md:text-base ${STYLES[variant]}`;
  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  if (status === 'blocked') {
    return (
      <button type="button" data-sound-enable onClick={stop(onEnable)} className={`${base} px-4`}>
        <Volume2 className="h-4 w-4" aria-hidden /> {SOUND_TEXT.enable}
      </button>
    );
  }
  const on = status === 'on' || status === 'starting';
  return (
    <button
      type="button"
      data-sound-toggle
      aria-pressed={on}
      aria-label={SOUND_TEXT.toggle}
      title={on ? SOUND_TEXT.turnOff : SOUND_TEXT.enable}
      onClick={stop(onToggle)}
      className={base}
    >
      {on ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
    </button>
  );
}
