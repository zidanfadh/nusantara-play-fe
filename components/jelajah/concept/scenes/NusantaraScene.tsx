'use client';

import { motion, type MotionValue } from 'framer-motion';
import { BEATS, CONCEPT_TEXT } from '@/lib/jelajah/concept/script';
import { easeInOutCubic, easeOutCubic, seg } from '@/lib/jelajah/concept/timeline';
import { CONCEPT_MAP_VIEW, CONCEPT_PROVINCE_PATHS, mapTransformAttr } from '../art/MapArt';
import { BLEED, Stage, useDerived, useStyle, type SceneProps } from '../scene-kit';

const NIGHT = '#120F2A';

/**
 * Scene 3 "nusantara" (11–18 s): the dust flows back (particle canvas) and gathers into the outline of
 * Indonesia; provinces light up west to east with a batik glow; the wordmark resolves in the centre.
 */
export function NusantaraScene({ lt, layout, still, canvas }: SceneProps) {
  const { gatherFrom, gatherTo, wordmarkAt } = BEATS.nusantara;
  const time = (t: number) => (still ? 6440 : t);
  // Without particles the outline itself fades in (the SVG-only fallback).
  const outline = useDerived(lt, (t) =>
    canvas && !still ? 0.55 * seg(time(t), gatherTo - 900, gatherTo + 300) : 0.55 * seg(time(t), gatherFrom, gatherTo),
  );
  const drift = useStyle(lt, (t) => ({ transform: `translate(${(-time(t) * 0.006).toFixed(2)}px, ${(time(t) * 0.004).toFixed(2)}px)` }));
  const halo = useDerived(lt, (t) => 0.9 * easeOutCubic(seg(time(t), wordmarkAt - 300, wordmarkAt + 600)));

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `radial-gradient(90% 70% at 50% 45%, #2A2152 0%, ${NIGHT} 70%)` }}>
      <div ref={drift} className="absolute -inset-10">
        <svg className="h-full w-full" aria-hidden>
          <rect width="100%" height="100%" fill="url(#cv-kawung-gold)" opacity="0.08" />
        </svg>
      </div>
      <Stage layout={layout}>
        <rect {...BLEED} fill="transparent" />
        <g transform={mapTransformAttr(layout)} data-cv-anchor="map">
          <motion.g style={{ opacity: outline }} fill="none" stroke="#FBEFD5" strokeWidth={1.4} strokeLinejoin="round">
            {CONCEPT_PROVINCE_PATHS.map((p) => (
              <path key={p.kode} d={p.d} />
            ))}
          </motion.g>
          {CONCEPT_PROVINCE_PATHS.map((p) => (
            <LitProvince key={p.kode} d={p.d} cx={p.cx} lt={lt} still={still} />
          ))}
        </g>
      </Stage>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[46vmin] w-[92vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ opacity: halo, background: `radial-gradient(closest-side, ${NIGHT}E6, ${NIGHT}00)` }}
      />
      <Wordmark lt={lt} still={still} layout={layout} />
    </div>
  );
}

/** One province: a wide amber glow stroke under a batik-gold fill, faded in at its west-to-east moment. */
function LitProvince({ d, cx, lt, still }: { d: string; cx: number; lt: MotionValue<number>; still: boolean }) {
  const { lightFrom, lightTo } = BEATS.nusantara;
  const at = lightFrom + (cx / CONCEPT_MAP_VIEW.width) * (lightTo - lightFrom - 600);
  const lit = useDerived(lt, (t) => easeInOutCubic(seg(still ? 6440 : t, at, at + 600)));
  const flash = useDerived(lt, (t) => {
    const k = seg(still ? 6440 : t, at, at + 900);
    return 0.65 * Math.sin(Math.PI * k);
  });
  return (
    <g>
      <motion.path d={d} fill="none" stroke="#F7C95C" strokeWidth={9} strokeLinejoin="round" style={{ opacity: flash }} />
      <motion.g style={{ opacity: lit }}>
        <path d={d} fill="url(#cv-glow-fill)" stroke="#FFE6A8" strokeWidth={1.2} strokeLinejoin="round" />
        <path d={d} fill="url(#cv-kawung-brown)" />
      </motion.g>
    </g>
  );
}

function Wordmark({ lt, still, layout }: { lt: MotionValue<number>; still: boolean; layout: SceneProps['layout'] }) {
  const letters = [...CONCEPT_TEXT.wordmark];
  const { wordmarkAt } = BEATS.nusantara;
  const rule = useStyle(lt, (t) => {
    const k = easeOutCubic(seg(still ? 6440 : t, wordmarkAt + 500, wordmarkAt + 1300));
    return { transform: `scaleX(${k.toFixed(3)})`, opacity: k };
  });
  const size =
    layout === 'portrait' ? 'text-[2.15rem]' : layout === 'landscape' ? 'text-[2.4rem]' : 'text-[clamp(3rem,5.6vw,5.5rem)]';
  return (
    <div
      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-center ${
        layout === 'portrait' ? 'top-[50%]' : 'top-[44%]'
      }`}
    >
      <p className={`whitespace-nowrap font-extrabold tracking-tight ${size}`} aria-hidden>
        {letters.map((ch, i) => (
          <Letter key={i} ch={ch} i={i} n={letters.length} lt={lt} still={still} />
        ))}
      </p>
      <div ref={rule} className="mx-auto mt-2 h-[3px] w-3/4 origin-center rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #F7C95C, transparent)' }} />
    </div>
  );
}

function Letter({ ch, i, n, lt, still }: { ch: string; i: number; n: number; lt: MotionValue<number>; still: boolean }) {
  const { wordmarkAt } = BEATS.nusantara;
  const ref = useStyle<HTMLSpanElement>(lt, (t) => {
    const k = easeOutCubic(seg(still ? 6440 : t, wordmarkAt + i * 45, wordmarkAt + i * 45 + 750));
    const spread = (i - (n - 1) / 2) * (1 - k) * 10;
    return {
      transform: `translate(${spread.toFixed(1)}px, ${((1 - k) * 22).toFixed(1)}px) scale(${(0.86 + 0.14 * k).toFixed(3)})`,
      opacity: k,
    };
  });
  return (
    <span
      ref={ref}
      className="inline-block bg-clip-text text-transparent"
      style={{ backgroundImage: 'linear-gradient(180deg, #FFF4D6 10%, #F7C95C 90%)', whiteSpace: 'pre' }}
    >
      {ch}
    </span>
  );
}
