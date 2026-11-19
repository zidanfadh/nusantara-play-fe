'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { RefObject } from 'react';
import { BEATS, CONCEPT_SCENES, CONCEPT_TEXT } from '@/lib/jelajah/concept/script';
import { easeOutBack, easeOutCubic, seg } from '@/lib/jelajah/concept/timeline';
import { BLEED, LIVE, Stage, useStyle, type SceneProps } from '../scene-kit';

const SCENE = CONCEPT_SCENES.find((s) => s.id === 'mulai')!;
const STILL_T = SCENE.still * SCENE.duration;

/**
 * Scene 8 "mulai" (44–48 s): the brand mark and the big "Mulai Menjelajah" button (the film continues to
 * the map by itself FINAL_HOLD_MS after this scene ends, unless the viewer interacted).
 */
export function MulaiScene({
  lt,
  layout,
  still,
  onStart,
  startRef,
}: SceneProps & { onStart: () => void; startRef?: RefObject<HTMLButtonElement | null> }) {
  const time = (t: number) => (still ? STILL_T : t);
  const rays = useStyle(lt, (t) => ({ transform: `translate(-50%, -50%) rotate(${(time(t) * 0.006).toFixed(2)}deg)` }));
  const mark = useStyle(lt, (t) => {
    const k = easeOutBack(seg(time(t), -300, 600));
    return { transform: `scale(${(0.6 + 0.4 * k).toFixed(3)})`, opacity: Math.min(1, seg(time(t), -300, 300)) };
  });
  const name = useStyle(lt, (t) => {
    const k = easeOutCubic(seg(time(t), 150, 800));
    return { transform: `translateY(${((1 - k) * 16).toFixed(1)}px)`, opacity: k };
  });
  const button = useStyle(lt, (t) => {
    const k = easeOutBack(seg(time(t), BEATS.mulai.buttonAt, BEATS.mulai.buttonAt + 600));
    return { transform: `translateY(${((1 - k) * 20).toFixed(1)}px) scale(${(0.92 + 0.08 * k).toFixed(3)})`, opacity: Math.min(1, k * 1.4) };
  });
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(90% 75% at 50% 42%, #B4553A 0%, #6B2414 55%, #2A0E07 100%)' }}>
      <div
        ref={rays}
        aria-hidden
        className="absolute left-1/2 top-[42%] h-[220vmax] w-[220vmax] opacity-25"
        style={{
          background: 'repeating-conic-gradient(from 0deg, rgba(255,230,168,0.55) 0deg 5deg, transparent 5deg 18deg)',
          willChange: 'transform',
          maskImage: 'radial-gradient(closest-side, black 10%, transparent 60%)',
          WebkitMaskImage: 'radial-gradient(closest-side, black 10%, transparent 60%)',
        }}
      />
      <Stage layout={layout}>
        <rect {...BLEED} fill="url(#cv-kawung-cream)" opacity="0.1" />
      </Stage>
      <div
        className={`absolute inset-x-0 top-0 flex flex-col items-center justify-center gap-4 px-6 text-center ${
          layout === 'landscape' ? 'bottom-[30%] gap-2' : 'bottom-[30%] md:gap-6'
        }`}
      >
        <div ref={mark} style={LIVE}>
          <Image
            src="/apple-icon.png"
            alt=""
            width={180}
            height={180}
            loading="eager"
            className={`rounded-3xl shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)] ring-4 ring-[#F7C95C]/40 ${
              layout === 'landscape' ? 'h-14 w-14' : layout === 'portrait' ? 'h-20 w-20' : 'h-28 w-28'
            }`}
          />
        </div>
        <p
          ref={name}
          style={LIVE}
          className={`font-extrabold tracking-tight text-[#FFF4D6] ${
            layout === 'landscape' ? 'text-3xl' : layout === 'portrait' ? 'text-[2.1rem] leading-tight' : 'text-6xl'
          }`}
        >
          {CONCEPT_TEXT.wordmark}
        </p>
        <div ref={button} className="flex flex-col items-center gap-2" style={LIVE}>
          <button
            ref={startRef}
            type="button"
            data-concept-start
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className={`inline-flex min-h-[56px] items-center gap-2 rounded-full bg-[#F7C95C] font-extrabold text-[#3B1E0E] shadow-[0_14px_36px_-10px_rgba(0,0,0,0.75)] transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF4D6] ${
              layout === 'desktop' ? 'px-10 py-4 text-xl' : 'px-7 py-3 text-lg'
            }`}
          >
            {CONCEPT_TEXT.start} <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
          <p className="hidden text-sm font-medium text-[#FFE6A8]/80 sm:block">{CONCEPT_TEXT.finalHint}</p>
        </div>
      </div>
    </div>
  );
}
