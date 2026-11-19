'use client';

/**
 * 2d tier of a province scene (Phase 11): never imports three.js. A simple illustrated header and a
 * grid of the same stands as the 3D scene (same assignment, same panel).
 */
import type { ReactNode } from 'react';
import { ProtPhoto } from '@/components/prot/ProtPhoto';
import type { SceneProt } from '@/lib/jelajah/engine/scene-prot';
import type { StandContent } from '@/lib/jelajah/engine/stands';
import { illustrationLook, type IllustrationLook } from '@/lib/jelajah/engine/illustration';
import type { SceneDefinition } from '@/lib/jelajah/scenes/types';

interface ProvinceScene2DProps {
  nama: string;
  stands: readonly StandContent<SceneProt>[];
  onOpen: (index: number, trigger: HTMLElement) => void;
  /** Phase 22: the scene, for the header illustration (water, roofs, plants, landmarks). */
  scene: SceneDefinition;
  /** Phase 17: shown between the header and the stands (the game pavilion's card; Phase 22: or "Game segera hadir"). */
  extra?: ReactNode;
}

/** Raised house with a roof drawn for the scene's house style. */
function House({ x, y, roof }: { x: number; y: number; roof: IllustrationLook['roof'] }) {
  return (
    <g transform={`translate(${x} ${y})`} className="fill-primary">
      {[-34, -12, 12, 34].map((px) => (
        <rect key={px} x={px - 3} y={-6} width={6} height={26} className="fill-foreground/60" />
      ))}
      <rect x={-46} y={-14} width={92} height={10} className="fill-foreground/70" />
      <rect x={-40} y={-50} width={80} height={38} className="fill-primary/70" />
      {roof === 'limas' && <path d="M -60 -46 L 60 -46 L 22 -96 L -22 -96 Z" className="fill-primary" />}
      {roof !== 'limas' && <GableRoof roof={roof} />}
      <rect x={-8} y={-40} width={16} height={28} className="fill-foreground/60" />
    </g>
  );
}

/** Phase 22 gable roofs: crossed ridge ends (malay), a steep gable with a decorated panel (aceh). */
function GableRoof({ roof }: { roof: Exclude<IllustrationLook['roof'], 'limas'> }) {
  switch (roof) {
    case 'malay':
      return (
        <>
          <path d="M -58 -46 L 58 -46 L 40 -84 L -40 -84 Z" className="fill-primary" />
          <path d="M -48 -94 L -32 -74 M -32 -94 L -48 -74 M 48 -94 L 32 -74 M 32 -94 L 48 -74" className="stroke-foreground/70" strokeWidth={4} />
        </>
      );
    case 'aceh':
      return (
        <>
          <path d="M -62 -44 L 62 -44 L 46 -104 L -46 -104 Z" className="fill-primary" />
          <path d="M -40 -50 L -40 -98 L -58 -50 Z M 40 -50 L 40 -98 L 58 -50 Z" className="fill-accent" />
        </>
      );
  }
}

function Palm({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
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
  );
}

function Bamboo({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[-10, -3, 4, 11].map((dx, i) => (
        <g key={dx}>
          <rect x={dx - 2} y={-70 + i * 6} width={4} height={72 - i * 6} className="fill-secondary/70" />
          <path d={`M ${dx} ${-70 + i * 6} q ${i % 2 ? 14 : -14} -6 ${i % 2 ? 22 : -22} 4`} className="stroke-secondary/70" strokeWidth={3} fill="none" />
        </g>
      ))}
    </g>
  );
}

/**
 * Decorative village illustration; colours follow the site theme. Phase 11: river, raised houses, palms. Phase 22:
 * drawn from the scene's look (IllustrationLook), so each province shows its own water, roofs, plants and landmarks;
 * river + limas + palms is exactly the Phase 11 picture.
 */
function VillageIllustration({ look }: { look: IllustrationLook }) {
  const has = (kind: string) => look.landmarks.includes(kind);
  return (
    <svg viewBox="0 0 640 200" className="h-auto w-full" aria-hidden focusable="false">
      <rect width="640" height="200" className="fill-accent/15" />
      {look.water === 'river' && (
        <>
          <rect y="40" width="640" height="34" className="fill-secondary/30" />
          <rect y="74" width="640" height="10" className="fill-accent/30" />
        </>
      )}
      {look.water === 'sea' && (
        <>
          {has('mountain') && (
            <path d="M 40 30 Q 90 10 140 30 Z M 470 30 Q 540 4 610 30 Z" className="fill-secondary/40" />
          )}
          <rect y="30" width="640" height="44" className="fill-secondary/30" />
          <rect y="30" width="640" height="3" className="fill-secondary/40" />
          <rect y="74" width="640" height="10" className="fill-accent/30" />
        </>
      )}
      {look.water === 'none' && (
        <>
          {has('mountain') && !has('terraces') && (
            <path d="M 0 70 Q 120 20 260 70 Z M 330 70 Q 480 12 640 70 Z" className="fill-accent/30" />
          )}
          {has('mountain') && has('terraces') && (
            <path d="M 170 60 L 300 8 L 344 8 L 480 60 Z M 0 60 Q 80 34 170 60 Z" className="fill-foreground/15" />
          )}
          {has('terraces') ? (
            [0, 1, 2, 3].map((i) => (
              <g key={i}>
                <rect y={52 + i * 8} width="640" height="8" className={i % 2 ? 'fill-secondary/30' : 'fill-secondary/15'} />
                <rect y={58 + i * 8} width="640" height="2" className="fill-foreground/15" />
              </g>
            ))
          ) : (
            <rect y="70" width="640" height="14" className="fill-secondary/10" />
          )}
        </>
      )}
      <rect y="84" width="640" height="116" className="fill-secondary/10" />
      {has('jetty') && (
        <g className="fill-foreground/50">
          <rect x={300} y={40} width={16} height={46} />
          <rect x={232} y={58} width={70} height={7} />
        </g>
      )}
      {[
        [70, 150],
        [520, 140],
      ].map(([x, y]) => (
        <House key={x} x={x} y={y} roof={look.roof} />
      ))}
      {look.centre === 'arena' && (
        <g transform="translate(320 165)">
          <ellipse rx={46} ry={14} className="fill-accent/40" />
          <ellipse rx={46} ry={14} className="stroke-foreground/50" strokeWidth={4} fill="none" />
          <path d="M -54 -40 L 54 -40 L 54 -32 L -54 -24 Z" className="fill-primary/80" />
          <rect x={-50} y={-40} width={5} height={30} className="fill-foreground/60" />
          <rect x={45} y={-40} width={5} height={30} className="fill-foreground/60" />
        </g>
      )}
      {look.centre === 'joglo' && (
        <g transform="translate(320 162)">
          {[-40, -14, 14, 40].map((px) => (
            <rect key={px} x={px - 3} y={-34} width={6} height={34} className="fill-foreground/60" />
          ))}
          <rect x={-56} y={-2} width={112} height={8} className="fill-accent/50" />
          <path d="M -66 -32 L 66 -32 L 26 -50 L -26 -50 Z" className="fill-primary" />
          <rect x={-26} y={-56} width={52} height={6} className="fill-foreground/50" />
          <path d="M -26 -56 L 26 -56 L 8 -86 L -8 -86 Z" className="fill-primary/80" />
        </g>
      )}
      {look.centre === 'meunasah' && (
        <g transform="translate(320 160)">
          {[-26, 0, 26].map((px) => (
            <rect key={px} x={px - 3} y={-46} width={6} height={52} className="fill-foreground/60" />
          ))}
          <rect x={-34} y={-24} width={68} height={7} className="fill-foreground/70" />
          <path d="M -38 -44 L 38 -44 L 0 -86 Z" className="fill-primary" />
          <path d="M -18 -48 L 18 -48 L 0 -70 Z" className="fill-accent" />
        </g>
      )}
      {[
        [190, 120],
        [300, 112],
        [430, 124],
      ]
        .filter(([x]) => !(look.centre !== null && look.centre !== 'pavilion' && x === 300))
        .map(([x, y]) => (look.plants === 'bamboo' ? <Bamboo key={x} x={x} y={y} /> : <Palm key={x} x={x} y={y} />))}
    </svg>
  );
}

export function ProvinceScene2D({ nama, stands, onOpen, scene, extra }: ProvinceScene2DProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <VillageIllustration look={illustrationLook(scene)} />
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
