'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { ProtPhoto } from '@/components/prot/ProtPhoto';
import type { ProvinceSummary } from '@/lib/jelajah/data';
import { enterableByKode, PILOT_PROVINCE } from '@/lib/jelajah/provinces';
import type { JelajahDataStatus } from '@/lib/jelajah/use-jelajah-data';

interface ProvinceCardProps {
  summary: ProvinceSummary;
  status: JelajahDataStatus;
  onClose: () => void;
}

/**
 * Province details as a DOM overlay (not 3D text). Non-modal dialog: focus moves to it when it
 * opens, Escape closes it, and focus returns to where it was.
 */
export function ProvinceCard({ summary, status, onClose }: ProvinceCardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isPilot = summary.kode === PILOT_PROVINCE.kode;
  // Phase 22: every enterable province has a village to enter (before: the pilot only).
  const enterable = enterableByKode(summary.kode);
  const titleId = `jelajah-card-${summary.kode}`;
  const extra = summary.protCount - summary.prots.length;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();
    return () => {
      if (previous && document.contains(previous) && previous !== document.body) previous.focus();
    };
  }, [summary.kode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="absolute inset-x-3 bottom-3 z-30 max-h-[60%] overflow-y-auto rounded-xl border border-border bg-card text-card-foreground shadow-xl md:inset-x-auto md:bottom-auto md:right-4 md:top-16 md:max-h-[calc(100%-5rem)] md:w-80"
    >
      <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-card px-4 pb-3 pt-4">
        <div>
          {enterable && (
            <span className="mb-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-text">
              {isPilot ? 'Provinsi pilot' : 'Desa virtual'}
            </span>
          )}
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="text-lg font-bold leading-tight outline-none">
            {summary.nama}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {status === 'loading' ? 'Memuat PROT…' : `${summary.protCount} PROT publik`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="space-y-3 px-4 py-3">
        {summary.prots.length > 0 ? (
          <ul className="space-y-2">
            {summary.prots.map((prot) => (
              <li key={prot.id}>
                <Link
                  href={`/prot/${prot.id}`}
                  className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
                    {prot.foto && (
                      <ProtPhoto src={prot.foto} alt="" size="thumb" />
                    )}
                  </span>
                  <span className="line-clamp-2 text-sm font-medium">{prot.nama}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          status !== 'loading' && (
            <p className="text-sm text-muted-foreground">
              Belum ada PROT berstatus Arsip Nasional di provinsi ini.
            </p>
          )
        )}
        {extra > 0 && <p className="text-xs text-muted-foreground">dan {extra} PROT lainnya</p>}

        {enterable && (
          <Link
            href={`/jelajah/${enterable.slug}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Masuk
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
