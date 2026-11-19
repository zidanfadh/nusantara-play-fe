'use client';

import { forwardRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { SceneProt } from '@/lib/jelajah/engine/scene-prot';
import type { StandContent } from '@/lib/jelajah/engine/stands';

/** Full neutral text of an empty stand (desktop prompt; on phones after a tap). */
export const emptyStandMessage = (provinsiNama: string) => `Segera hadir. Stand ini menunggu PROT dari ${provinsiNama}.`;
/** Short phone prompt of an empty stand (Phase 13: at most two lines at 360 px width). */
export const EMPTY_STAND_SHORT = 'Segera hadir';

interface StandPromptProps {
  content: StandContent<SceneProt>;
  provinsiNama: string;
  /** Phone layout: the prompt sits right of the joystick, about 180 px wide on a 360 px screen. */
  compact: boolean;
  onOpen: (trigger: HTMLButtonElement) => void;
}

/**
 * The prompt near a stand (Phase 11; Phase 13 phone polish). PROT stand or notice board: name + "Lihat"
 * (name clamped to two lines). Empty stand: the full neutral message on desktop; on phones a short
 * "Segera hadir" that shows the full message only when tapped. The parent remounts it per stand (key), so
 * the tapped state never carries over to another stand.
 */
export const StandPrompt = forwardRef<HTMLButtonElement, StandPromptProps>(function StandPrompt(
  { content, provinsiNama, compact, onOpen },
  lihatRef,
) {
  const [expanded, setExpanded] = useState(false);
  const box = 'rounded-xl border border-border bg-card/95 text-card-foreground shadow-lg';

  if (content.kind === 'empty') {
    if (!compact) return <p className={`${box} px-4 py-3 text-center text-sm`}>{emptyStandMessage(provinsiNama)}</p>;
    // The prompt itself stays one line; the full message opens in a bubble above it (never over the joystick).
    return (
      <div className="relative">
        {expanded && (
          <p role="status" className={`${box} absolute bottom-full right-0 mb-2 w-full px-3 py-2 text-xs leading-snug`}>
            {emptyStandMessage(provinsiNama)}
          </p>
        )}
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? 'Sembunyikan keterangan stand' : `${EMPTY_STAND_SHORT}: tampilkan keterangan stand`}
          onClick={() => setExpanded((e) => !e)}
          className={`${box} flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
          {EMPTY_STAND_SHORT} <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </button>
      </div>
    );
  }

  const title = content.kind === 'prot' ? content.prot.nama : `${content.prots.length} PROT lainnya`;
  return (
    <div className={`${box} flex items-center ${compact ? 'gap-2 px-3 py-2' : 'gap-3 px-4 py-3'}`}>
      <p className={`min-w-0 flex-1 text-sm font-semibold leading-snug ${compact ? 'line-clamp-2 break-words' : 'truncate'}`} title={title}>
        {title}
      </p>
      <button
        ref={lihatRef}
        type="button"
        onClick={(e) => onOpen(e.currentTarget)}
        className={`shrink-0 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${compact ? 'px-3 py-2' : 'px-4 py-2'}`}
      >
        Lihat
      </button>
    </div>
  );
});
