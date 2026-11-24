'use client';

/**
 * First-time tutorial of the gasing page (Phase 20): 3 short steps (tarik, arahkan, lepas) over the arena,
 * skippable at any time ("Lewati", Esc). Shown once per browser (settings.ts, try/catch storage).
 */
import { Crosshair, Hand, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TUTORIAL_STEPS, TUTORIAL_UI } from '@/lib/games/gasing/texts';

const ICONS = [Hand, Crosshair, Sparkles] as const;

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = TUTORIAL_STEPS[i];
  const Icon = ICONS[i] ?? Hand;
  const last = i === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [i]);

  return (
    <div
      className="absolute inset-0 z-10 flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gasing-tutorial-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      data-testid="gasing-tutorial"
    >
      <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">{TUTORIAL_UI.step(i + 1, TUTORIAL_STEPS.length)}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="gasing-tutorial-skip"
          >
            {TUTORIAL_UI.skip}
          </button>
        </div>
        <div className="mt-2 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-text">
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 id="gasing-tutorial-title" className="text-lg font-extrabold text-primary-text">
              {i + 1}. {step.title}
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed">{step.text}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 gap-1.5" aria-hidden>
            {TUTORIAL_STEPS.map((s, k) => (
              <span key={s.title} className={`h-1.5 flex-1 rounded-full ${k <= i ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <button
            ref={nextRef}
            type="button"
            onClick={() => (last ? onClose() : setI(i + 1))}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring"
            data-testid="gasing-tutorial-next"
          >
            {last ? TUTORIAL_UI.done : TUTORIAL_UI.next}
          </button>
        </div>
      </section>
    </div>
  );
}
