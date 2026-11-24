'use client';

import { BatikBand } from '@/components/brand/Batik';
import { Stamp } from 'lucide-react';
import { KNOWN_PROVINCES } from '@/lib/jelajah/provinces';
import { stampDesign } from '@/lib/jelajah/stamps';
import { ProvinceStamp } from './ProvinceStamp';
import { DemoDialog } from './DemoDialog';

/**
 * Paspor (Phase 12, SIMULATED): every province of the province list (35), stamped ones highlighted.
 * Stamps exist only in this browser tab and are never sent to the backend.
 */
export function PasporModal({
  open,
  onClose,
  stamps,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  stamps: readonly string[];
  onReset: () => void;
}) {
  const stamped = new Set(stamps);
  // Stamped provinces first (each group in name order), so new stamps are visible without scrolling.
  const stampedProvinces = KNOWN_PROVINCES.filter((p) => stamped.has(p.kode));
  const ordered = [...stampedProvinces, ...KNOWN_PROVINCES.filter((p) => !stamped.has(p.kode))];
  const count = stampedProvinces.length;
  return (
    <DemoDialog
      open={open}
      onClose={onClose}
      title="Paspor Jelajah"
      subtitle={
        <>
          {count} dari {KNOWN_PROVINCES.length} provinsi distempel · <strong>Simulasi, tidak disimpan</strong>
        </>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>Stempel didapat dengan membuka stan PROT di desa provinsi.</p>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Atur ulang simulasi
          </button>
        </div>
      }
    >
      <BatikBand className="mb-3" />
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Provinsi di Paspor">
        {ordered.map((p) => {
          const done = stamped.has(p.kode);
          // Phase 22: a stamped province with its own design shows that stamp instead of the generic icon.
          const ownStamp = done && stampDesign(p.kode) !== null;
          return (
            <li
              key={p.kode}
              className={`flex min-h-12 items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                done
                  ? 'border-primary bg-primary/10 font-semibold text-foreground'
                  : 'border-dashed border-border text-muted-foreground'
              }`}
            >
              {ownStamp ? (
                <ProvinceStamp kode={p.kode} size={30} className="-m-0.5 shrink-0" />
              ) : (
                <span
                  aria-hidden
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground/60'
                  }`}
                >
                  <Stamp className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 break-words leading-tight">
                {p.nama}
                <span className="sr-only">{done ? ': sudah distempel' : ': belum distempel'}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </DemoDialog>
  );
}
