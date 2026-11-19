'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import type { Tier, TierChoice } from '@/lib/jelajah/device-tier';

const LABELS: Record<Tier, string> = {
  full: 'Lengkap (3D)',
  lite: 'Ringan (3D hemat)',
  '2d': 'Peta 2D',
};

interface TierMenuProps {
  choice: TierChoice;
  autoTier: Tier | null;
  onChoose: (choice: TierChoice) => void;
}

/** Small settings menu to override the automatic render tier (remembered in localStorage). */
export function TierMenu({ choice, autoTier, onChoose }: TierMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options: { value: TierChoice; label: string }[] = [
    { value: 'auto', label: `Otomatis${autoTier ? ` (${LABELS[autoTier]})` : ''}` },
    { value: 'full', label: LABELS.full },
    { value: 'lite', label: LABELS.lite },
    { value: '2d', label: LABELS['2d'] },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-toast-avoid
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-card-foreground shadow-sm backdrop-blur transition-colors hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden />
        Tampilan
      </button>
      {open && (
        <fieldset
          id={panelId}
          className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-border bg-card p-2 text-sm text-card-foreground shadow-xl"
        >
          <legend className="sr-only">Mode tampilan peta</legend>
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="jelajah-tier"
                value={o.value}
                checked={choice === o.value}
                onChange={() => {
                  onChoose(o.value);
                  setOpen(false);
                }}
                className="accent-[var(--color-primary)]"
              />
              {o.label}
            </label>
          ))}
          <p className="px-2 pb-1 pt-2 text-[11px] leading-snug text-muted-foreground">
            Pilih Ringan atau 2D bila peta terasa lambat.
          </p>
        </fieldset>
      )}
    </div>
  );
}
