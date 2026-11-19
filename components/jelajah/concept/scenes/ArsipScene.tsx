'use client';

import type { MotionValue } from 'framer-motion';
import { ScrollText } from 'lucide-react';
import type { ArchiveCard } from '@/lib/jelajah/concept/live';
import { BEATS, CONCEPT_TEXT } from '@/lib/jelajah/concept/script';
import { easeInCubic, easeOutBack, easeOutCubic, seg } from '@/lib/jelajah/concept/timeline';
import { BLEED, LIVE, Stage, useStyle, type SceneProps } from '../scene-kit';

const MOTIFS = ['url(#cv-parang)', 'url(#cv-truntum)', 'url(#cv-kawung-tile)'] as const;

/** Where each card flies in from (px, deg): alternating sides, deterministic. */
const FROM: [number, number, number][] = [
  [-520, -180, -28],
  [560, -260, 24],
  [-600, 140, 18],
  [620, 220, -22],
  [-200, 520, -12],
  [260, 560, 16],
];

/** Scene 4 "arsip" (18–25 s): archive cards fly in and settle in a tidy grid; the curator stamp lands. */
export function ArsipScene({ lt, layout, still, cards }: SceneProps & { cards: readonly ArchiveCard[] }) {
  const { stampAt } = BEATS.arsip;
  const time = (t: number) => (still ? 5950 : t);
  const shake = useStyle(lt, (t) => {
    const d = time(t) - stampAt;
    if (d < 0 || d > 420) return { transform: 'translate(0px, 0px)' };
    const a = 7 * Math.exp(-d / 110) * Math.sin(d / 18);
    return { transform: `translate(${a.toFixed(2)}px, ${(a * 0.4).toFixed(2)}px)` };
  });
  const grid =
    layout === 'portrait'
      ? 'inset-x-4 top-[12%] bottom-[33%] grid-cols-2 grid-rows-3 gap-3'
      : layout === 'landscape'
        ? 'inset-x-[9%] top-[13%] bottom-[36%] grid-cols-3 grid-rows-2 gap-3'
        : 'inset-x-[15%] top-[13%] bottom-[31%] grid-cols-3 grid-rows-2 gap-5';

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(100% 80% at 50% 40%, #FBF3E4 0%, #EAD8B9 100%)' }}>
      <Stage layout={layout}>
        <rect {...BLEED} fill="url(#cv-kawung-brown)" opacity="0.55" />
      </Stage>
      <div ref={shake} className={`absolute grid ${grid}`} style={LIVE}>
        {cards.map((card, i) => (
          <Card key={i} card={card} i={i} lt={lt} still={still} layout={layout} />
        ))}
        <Stamp lt={lt} still={still} layout={layout} />
      </div>
    </div>
  );
}

function Card({ card, i, lt, still, layout }: { card: ArchiveCard; i: number; lt: MotionValue<number>; still: boolean; layout: SceneProps['layout'] }) {
  const { cardsFrom, cardStagger, cardFlight } = BEATS.arsip;
  const [fx, fy, fr] = FROM[i % FROM.length];
  const settle = ((i * 7) % 5) - 2; // a small tidy tilt, -2..2 degrees
  const ref = useStyle(lt, (t) => {
    const start = cardsFrom + i * cardStagger;
    const k = seg(still ? 5950 : t, start, start + cardFlight);
    const p = easeOutBack(k);
    const scale = layout === 'portrait' ? 0.55 : 1;
    return {
      transform: `translate(${(fx * scale * (1 - p)).toFixed(1)}px, ${(fy * scale * (1 - p)).toFixed(1)}px) rotate(${(fr * (1 - easeOutCubic(k)) + settle * 0.6).toFixed(2)}deg)`,
      opacity: k > 0 ? 1 : 0,
    };
  });
  const motif = MOTIFS[i % MOTIFS.length];
  const compact = layout !== 'desktop';
  return (
    <div ref={ref} className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#C9A876] bg-[#FFFBF2] shadow-[0_10px_24px_-12px_rgba(60,30,10,0.55)]" style={LIVE}>
      <svg className={`w-full shrink-0 ${compact ? 'h-6' : 'h-10'}`} aria-hidden>
        <rect width="100%" height="100%" fill={motif} />
      </svg>
      <div className={`flex min-h-0 flex-1 flex-col justify-between gap-1 ${compact ? 'p-2' : 'p-4'}`}>
        <div className="flex items-start gap-2">
          <ScrollText className={`shrink-0 text-[#9E3C24] ${compact ? 'mt-0.5 h-3.5 w-3.5' : 'mt-1 h-5 w-5'}`} aria-hidden />
          {card.nama ? (
            <p className={`line-clamp-2 font-bold leading-tight text-[#3B1E0E] ${compact ? 'text-[13px]' : 'text-lg'}`}>{card.nama}</p>
          ) : (
            <span className="mt-1 flex w-full flex-col gap-1.5" aria-hidden>
              <span className={`block rounded bg-[#3B1E0E]/25 ${compact ? 'h-2.5' : 'h-3.5'} w-[85%]`} />
              <span className={`block rounded bg-[#3B1E0E]/15 ${compact ? 'h-2.5' : 'h-3.5'} w-[55%]`} />
            </span>
          )}
        </div>
        {!compact && (
          <span className="flex flex-col gap-1.5 pl-7" aria-hidden>
            <span className="block h-2 w-[92%] rounded bg-[#3B1E0E]/10" />
            <span className="block h-2 w-[78%] rounded bg-[#3B1E0E]/10" />
            <span className="block h-2 w-[64%] rounded bg-[#3B1E0E]/10" />
          </span>
        )}
        <div className={`flex-wrap ${layout === 'landscape' ? 'hidden' : 'flex'} ${compact ? 'gap-1' : 'gap-1.5'}`}>
          {CONCEPT_TEXT.cardFields.map((field) => (
            <span
              key={field}
              className={`rounded-full border border-[#C9A876] bg-[#F6EAD2] font-semibold text-[#7A3E1D] ${
                compact ? 'px-1.5 py-px text-[9px]' : 'px-2.5 py-0.5 text-xs'
              }`}
            >
              {field}
            </span>
          ))}
        </div>
        {card.provinsi ? (
          <p className={`truncate font-medium text-[#7A4A24] ${compact ? 'text-[11px]' : 'text-sm'}`}>{card.provinsi}</p>
        ) : (
          <span className={`block rounded bg-[#7A4A24]/20 ${compact ? 'h-2' : 'h-3'} w-[40%]`} aria-hidden />
        )}
      </div>
    </div>
  );
}

function Stamp({ lt, still, layout }: { lt: MotionValue<number>; still: boolean; layout: SceneProps['layout'] }) {
  const { stampAt, stampDrop } = BEATS.arsip;
  const stamp = useStyle(lt, (t) => {
    const d = (still ? 5950 : t) - stampAt;
    if (d < 0) return { opacity: 0, transform: 'translate(-50%, -50%) rotate(-12deg) scale(2.2)' };
    // Hits the paper at stampDrop: the soundtrack's thump.
    const k = easeInCubic(seg(d, 0, stampDrop));
    return { opacity: 1, transform: `translate(-50%, -50%) rotate(-12deg) scale(${(2.2 - 1.2 * k).toFixed(3)})` };
  });
  const ink = useStyle(lt, (t) => {
    const d = (still ? 5950 : t) - stampAt - 140;
    const k = seg(d, 0, 500);
    return { opacity: d < 0 ? 0 : 0.45 * (1 - k), transform: `translate(-50%, -50%) scale(${(1 + 0.5 * k).toFixed(3)})` };
  });
  const size = layout === 'desktop' ? 'h-44 w-44 text-xl' : 'h-32 w-32 text-[15px]';
  return (
    <>
      <div ref={ink} aria-hidden className={`pointer-events-none absolute left-1/2 top-1/2 rounded-full border-[6px] border-[#B3261E] ${size}`} style={LIVE} />
      <div
        ref={stamp}
        style={LIVE}
        className={`pointer-events-none absolute left-1/2 top-1/2 flex items-center justify-center rounded-full border-[5px] border-double border-[#B3261E] bg-[#FFFBF2]/70 p-3 text-center font-extrabold uppercase leading-tight tracking-wide text-[#B3261E] ${size}`}
      >
        {CONCEPT_TEXT.stamp}
      </div>
    </>
  );
}
