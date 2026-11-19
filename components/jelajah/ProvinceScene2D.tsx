'use client';

/**
 * 2d tier of a province scene (Phase 11): never imports three.js. A simple illustrated header and a
 * grid of the same stands as the 3D scene (same assignment, same panel).
 */
import type { ReactNode } from 'react';
import { ProtPhoto } from '@/components/prot/ProtPhoto';
import type { SceneProt } from '@/lib/jelajah/engine/scene-prot';
import type { StandContent } from '@/lib/jelajah/engine/stands';

interface ProvinceScene2DProps {
  nama: string;
  stands: readonly StandContent<SceneProt>[];
  onOpen: (index: number, trigger: HTMLElement) => void;
  /** Phase 17: shown between the header and the stands (the game pavilion's "Main Congklak" card). */
  extra?: ReactNode;
}

/** Decorative village illustration (river, raised houses, palms); colours follow the site theme. */
function VillageIllustration() {
  return (
    <svg viewBox="0 0 640 200" className="h-auto w-full" aria-hidden focusable="false">
      <rect width="640" height="200" className="fill-accent/15" />
      <rect y="40" width="640" height="34" className="fill-secondary/30" />
      <rect y="74" width="640" height="10" className="fill-accent/30" />
      <rect y="84" width="640" height="116" className="fill-secondary/10" />
      {[
        [70, 150],
        [520, 140],
      ].map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`} className="fill-primary">
          {[-34, -12, 12, 34].map((px) => (
            <rect key={px} x={px - 3} y={-6} width={6} height={26} className="fill-foreground/60" />
          ))}
          <rect x={-46} y={-14} width={92} height={10} className="fill-foreground/70" />
          <rect x={-40} y={-50} width={80} height={38} className="fill-primary/70" />
          <path d="M -60 -46 L 60 -46 L 22 -96 L -22 -96 Z" className="fill-primary" />
          <rect x={-8} y={-40} width={16} height={28} className="fill-foreground/60" />
        </g>
      ))}
      {[
        [190, 120],
        [300, 112],
        [430, 124],
      ].map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M -2 2 Q 4 -30 0 -60 L 5 -60 Q 9 -30 4 2 Z" className="fill-foreground/50" />
          {[
            'M 2 -60 Q -20 -72 -40 -48 Q -18 -62 2 -56 Z',
            'M 2 -60 Q 24 -72 44 -48 Q 22 -62 2 -56 Z',
            'M 2 -60 Q -14 -84 -32 -78 Q -12 -74 2 -58 Z',
            'M 2 -60 Q 18 -84 36 -78 Q 16 -74 2 -58 Z',
            'M 2 -60 Q 0 -86 6 -90 Q 8 -76 4 -58 Z',
          ].map((d) => (
            <path key={d} d={d} className="fill-secondary/70" />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function ProvinceScene2D({ nama, stands, onOpen, extra }: ProvinceScene2DProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <VillageIllustration />
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">Stand PROT {nama}</h2>
          <p className="text-sm text-muted-foreground">Tampilan 2D. Pilih stand untuk melihat PROT-nya.</p>
        </div>
      </div>
      {extra}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stands.map((content, i) => (
          <li key={i}>
            {content.kind === 'empty' ? (
              <div className="flex h-full min-h-24 flex-col justify-center rounded-xl border border-dashed border-border bg-card/60 p-4 text-center">
                <p className="font-semibold text-muted-foreground">Segera hadir</p>
                <p className="mt-1 text-xs text-muted-foreground">Stand {i + 1} menunggu PROT dari provinsi ini.</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => onOpen(i, e.currentTarget)}
                className="flex h-full w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {content.kind === 'prot' && content.prot.foto && (
                    <ProtPhoto src={content.prot.foto} alt="" size="thumb" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {content.kind === 'prot' ? `Stand ${i + 1}` : 'Papan PROT lainnya'}
                  </span>
                  <span className="block break-words font-semibold text-foreground">
                    {content.kind === 'prot' ? content.prot.nama : `${content.prots.length} PROT lainnya`}
                  </span>
                  <span className="text-sm text-primary">Lihat</span>
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
