'use client';

import type { MotionValue } from 'framer-motion';
import type { RefObject } from 'react';
import type { ConceptLayout } from '@/lib/jelajah/concept/layout';
import { BEATS, CONCEPT_TEXT } from '@/lib/jelajah/concept/script';
import { easeOutCubic, seg } from '@/lib/jelajah/concept/timeline';
import { CONCEPT_MAP_VIEW, CONCEPT_PROVINCE_PATHS, mapToStage, mapTransformAttr } from '../art/MapArt';
import { LIVE, LIVE_OPACITY, Stage, stageToScreen, useStyle, type SceneProps } from '../scene-kit';

const NIGHT = '#2A1A0E';
/** Soft edge of the west-to-east light sweep: a tenth of the map's width on screen, 24 to 90 px. */
function edgeWidth(layout: ConceptLayout): number {
  const [x0] = stageToScreen(layout, ...mapToStage(layout, 0, 0));
  const [x1] = stageToScreen(layout, ...mapToStage(layout, CONCEPT_MAP_VIEW.width, 0));
  return Math.max(24, Math.min(90, (x1 - x0) * 0.1));
}

/**
 * Scene 3 "nusantara" (11–18 s): the dust flows back (particle canvas) and gathers into the outline of
 * Indonesia; the provinces light up west to east with a batik glow; the wordmark resolves in the centre.
 *
 * Performance (Phase 19 measurement): the lit map is painted ONCE (gradient + kawung texture per province)
 * and revealed by a wipe made of two counter-moving compositor layers, with a light band riding on the
 * edge; no province is repainted per frame. The outline is its own layer too (opacity only).
 */
export function NusantaraScene({ lt, layout, still, canvas }: SceneProps) {
  const { gatherFrom, gatherTo, lightFrom, lightTo, wordmarkAt } = BEATS.nusantara;
  const time = (t: number) => (still ? 6440 : t);
  // Without particles the outline itself fades in (the SVG-only fallback).
  const outline = useStyle(lt, (t) => ({
    opacity: canvas && !still ? 0.55 * seg(time(t), gatherTo - 900, gatherTo + 300) : 0.55 * seg(time(t), gatherFrom, gatherTo),
  }));
  const drift = useStyle(lt, (t) => ({ transform: `translate(${(-time(t) * 0.006).toFixed(2)}px, ${(time(t) * 0.004).toFixed(2)}px)` }));
  const halo = useStyle(lt, (t) => ({ opacity: 0.9 * easeOutCubic(seg(time(t), wordmarkAt - 300, wordmarkAt + 600)) }));

  // The sweep's edge in viewport pixels, from the map's west to its east end (plus the soft edge).
  // Constant speed, so the provinces light one after another at an even pace.
  const edge = edgeWidth(layout);
  const edgeAt = (t: number) => {
    const [x0] = stageToScreen(layout, ...mapToStage(layout, 0, 0));
    const [x1] = stageToScreen(layout, ...mapToStage(layout, CONCEPT_MAP_VIEW.width, 0));
    const k = seg(time(t), lightFrom, lightTo);
    return x0 + k * (x1 - x0 + edge);
  };
  const wipeOuter = useStyle(lt, (t) => ({ transform: `translateX(${(edgeAt(t) - window.innerWidth).toFixed(1)}px)` }));
  const wipeInner = useStyle(lt, (t) => ({ transform: `translateX(${(window.innerWidth - edgeAt(t)).toFixed(1)}px)` }));
  const band = useStyle(lt, (t) => {
    const k = seg(time(t), lightFrom, lightTo);
    return { transform: `translateX(${(edgeAt(t) - edge).toFixed(1)}px)`, opacity: 0.9 * Math.sin(Math.PI * k) };
  });

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `radial-gradient(90% 70% at 50% 45%, #4A3524 0%, ${NIGHT} 70%)` }}>
      <div ref={drift} className="absolute -inset-10" style={LIVE}>
        <svg className="h-full w-full" aria-hidden>
          <rect width="100%" height="100%" fill="url(#cv-kawung-gold)" opacity="0.08" />
        </svg>
      </div>
      <div ref={outline} className="absolute inset-0" style={{ opacity: 0, ...LIVE_OPACITY }}>
        <Stage layout={layout}>
          <g transform={mapTransformAttr(layout)} data-cv-anchor="map" fill="none" stroke="#FBEFD5" strokeWidth={1.4} strokeLinejoin="round">
            {CONCEPT_PROVINCE_PATHS.map((p) => (
              <path key={p.kode} d={p.d} />
            ))}
          </g>
        </Stage>
      </div>
      <div
        ref={wipeOuter}
        className="absolute inset-0 overflow-hidden"
        style={{
          transform: 'translateX(-100%)',
          maskImage: `linear-gradient(90deg, #000 calc(100% - ${edge.toFixed(0)}px), transparent)`,
          WebkitMaskImage: `linear-gradient(90deg, #000 calc(100% - ${edge.toFixed(0)}px), transparent)`,
          ...LIVE,
        }}
      >
        <div ref={wipeInner} className="absolute inset-0" style={{ transform: 'translateX(100%)', ...LIVE }}>
          <LitMap layout={layout} />
        </div>
      </div>
      <Band layout={layout} bandRef={band} edge={edge} />
      <div
        ref={halo}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[46vmin] w-[92vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ opacity: 0, background: `radial-gradient(closest-side, ${NIGHT}E6, ${NIGHT}00)`, ...LIVE_OPACITY }}
      />
      <Wordmark lt={lt} still={still} layout={layout} />
    </div>
  );
}

/** Every province lit: a wide amber glow, a gold gradient fill and the kawung texture (painted once). */
function LitMap({ layout }: { layout: ConceptLayout }) {
  return (
    <Stage layout={layout}>
      <g transform={mapTransformAttr(layout)} strokeLinejoin="round">
        <g fill="none" stroke="#F4AE52" strokeWidth={7} strokeOpacity={0.35}>
          {CONCEPT_PROVINCE_PATHS.map((p) => (
            <path key={p.kode} d={p.d} />
          ))}
        </g>
        {CONCEPT_PROVINCE_PATHS.map((p) => (
          <g key={p.kode}>
            <path d={p.d} fill="url(#cv-glow-fill)" stroke="#FFE6A8" strokeWidth={1.2} />
            <path d={p.d} fill="url(#cv-kawung-brown)" />
          </g>
        ))}
      </g>
    </Stage>
  );
}

/** The light band riding on the sweep's edge (a vertical glow over the map's height). */
function Band({ layout, bandRef, edge }: { layout: ConceptLayout; bandRef: RefObject<HTMLDivElement | null>; edge: number }) {
  const [, top] = stageToScreen(layout, ...mapToStage(layout, 0, -20));
  const [, bottom] = stageToScreen(layout, ...mapToStage(layout, 0, CONCEPT_MAP_VIEW.height + 20));
  return (
    <div
      ref={bandRef}
      aria-hidden
      className="pointer-events-none absolute left-0"
      style={{
        top,
        height: Math.max(0, bottom - top),
        width: edge * 2,
        opacity: 0,
        background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,230,168,0.75), rgba(244,174,82,0.25) 45%, transparent 75%)',
        ...LIVE,
      }}
    />
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
    layout === 'portrait' ? 'text-[1.8rem]' : layout === 'landscape' ? 'text-[2.4rem]' : 'text-[clamp(3rem,5.6vw,5.5rem)]';
  return (
    <div
      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-center ${
        layout === 'portrait' ? 'top-[50%]' : 'top-[44%]'
      }`}
      style={LIVE}
    >
      {/* Phase 27: the logotype font and its vertical gradient (#D4621A top → #F4AE52 bottom), one letter at a time. */}
      <p className={`whitespace-nowrap font-display font-bold ${size}`} aria-hidden>
        {letters.map((ch, i) => (
          <Letter key={i} ch={ch} i={i} n={letters.length} lt={lt} still={still} />
        ))}
      </p>
      <div ref={rule} className="mx-auto mt-2 h-[3px] w-3/4 origin-center rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #F4AE52, transparent)' }} />
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
      style={{ backgroundImage: 'linear-gradient(180deg, #D4621A 18%, #F4AE52 88%)', whiteSpace: 'pre', ...LIVE }}
    >
      {ch}
    </span>
  );
}
