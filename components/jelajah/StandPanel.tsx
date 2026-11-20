'use client';

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { ProtPhoto } from '@/components/prot/ProtPhoto';
import type { SceneProt } from '@/lib/jelajah/engine/scene-prot';
import { placeToasts } from '@/lib/jelajah/toast-clearance';

export type PanelContent = { kind: 'prot'; prot: SceneProt } | { kind: 'board'; prots: SceneProt[] };

interface StandPanelProps {
  content: PanelContent;
  onClose: () => void;
  /** Board: show one PROT of the list. */
  onSelectProt: (prot: SceneProt) => void;
}

/**
 * PROT details of a stand (Phase 11): side panel on wide screens, bottom sheet on phones. Shared by the
 * 3D scene and the 2d tier. Esc or the close button closes it; the caller returns the focus.
 * All texts are PROT data rendered as plain text, or neutral UI text.
 */
export function StandPanel({ content, onClose, onSelectProt }: StandPanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  });

  useEffect(() => {
    closeRef.current?.focus();
  }, [content]);

  // Phase 23 (Phase 22 observation): a reward toast is often shown in the same tap that opens the panel, i.e.
  // before the panel exists. Re-measure the overlays once the panel is in the page and again after the next
  // frame (layout, fonts), so a toast already on screen moves below the panel's header (title + close).
  useEffect(() => {
    placeToasts();
    const raf = requestAnimationFrame(() => placeToasts());
    return () => {
      cancelAnimationFrame(raf);
      // Closing: the toasts may move back up (the header is gone after this render).
      requestAnimationFrame(() => placeToasts());
    };
  }, [content]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A modal dialog above the panel (Paspor, Misi) handles its own Esc.
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        latestClose.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="absolute inset-x-0 bottom-0 z-30 flex max-h-[72%] flex-col overflow-hidden rounded-t-2xl border border-border bg-card text-card-foreground shadow-2xl md:inset-x-auto md:bottom-3 md:right-3 md:top-3 md:max-h-none md:w-[24rem] md:rounded-2xl"
    >
      {/* The whole header (title and close) is kept clear of toasts (Phase 23; Phase 13 only marked the close button). */}
      <div className="flex items-start gap-3 border-b border-border px-4 py-3" data-toast-avoid data-testid="stand-panel-header">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {content.kind === 'prot' ? 'Stand PROT' : 'Papan PROT lainnya'}
          </p>
          <h2 id={titleId} className="break-words text-lg font-bold leading-snug">
            {content.kind === 'prot' ? content.prot.nama : `${content.prots.length} PROT lainnya`}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {content.kind === 'prot' ? (
          <ProtDetails prot={content.prot} />
        ) : (
          <ul className="space-y-2">
            {content.prots.map((prot) => (
              <li key={prot.id}>
                <button
                  type="button"
                  onClick={() => onSelectProt(prot)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0 break-words">{prot.nama}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function ProtDetails({ prot }: { prot: SceneProt }) {
  return (
    <div className="space-y-4">
      {prot.foto && (
        <div className="aspect-video overflow-hidden rounded-lg bg-muted">
          <ProtPhoto src={prot.foto} alt={`Foto ${prot.nama}`} size="cover" />
        </div>
      )}
      <section>
        <h3 className="text-sm font-semibold">Deskripsi</h3>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {prot.deskripsi || 'Belum ada deskripsi.'}
        </p>
      </section>
      <section>
        <h3 className="text-sm font-semibold">Cara bermain</h3>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {prot.caraBermain || 'Belum ada keterangan cara bermain.'}
        </p>
      </section>
      <Link
        href={`/prot/${encodeURIComponent(prot.id)}`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Lihat detail PROT <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
