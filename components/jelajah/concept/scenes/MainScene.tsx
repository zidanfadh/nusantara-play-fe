'use client';

import type { MotionValue } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { PILOT_PROVINCE } from '@/lib/jelajah/provinces';
import { BEATS, CONCEPT_SCENES, CONCEPT_TEXT } from '@/lib/jelajah/concept/script';
import { easeInCubic, easeOutCubic, seg } from '@/lib/jelajah/concept/timeline';
import { MiniBoard } from '../art/MiniBoard';
import { BLEED, LIVE, Stage, useStyle, type SceneProps } from '../scene-kit';

const SCENE = CONCEPT_SCENES.find((s) => s.id === 'main')!;
const STILL_T = SCENE.still * SCENE.duration;

/**
 * Scene 6 "main" (32–39 s): a mini congklak board plays three real moves by itself, "+10 XP" chips float
 * up, and a Paspor Budaya stamp slams onto a passport page with a small shake.
 */
export function MainScene({ lt, layout, still }: SceneProps) {
  const time = (t: number) => (still ? STILL_T : t);
  const enter = useStyle(lt, (t) => {
    const k = easeOutCubic(seg(time(t), -400, 500));
    return { transform: `translateY(${((1 - k) * 24).toFixed(1)}px)`, opacity: k };
  });
  const row = layout === 'portrait' ? 'flex-col gap-5 px-4 pt-[14%]' : layout === 'landscape' ? 'flex-row items-center gap-6 px-[6%] pt-[8%]' : 'flex-row items-center gap-12 px-[9%] pt-[9%]';
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(80% 70% at 40% 40%, #4A2A18 0%, #1E120B 75%)' }}>
      <Stage layout={layout}>
        <rect {...BLEED} fill="url(#cv-kawung-gold)" opacity="0.12" />
      </Stage>
      <div ref={enter} className={`absolute inset-x-0 top-0 flex ${row} ${layout === 'portrait' ? 'bottom-[30%]' : 'bottom-[32%]'}`} style={LIVE}>
        <div className={`relative ${layout === 'portrait' ? 'w-full' : 'flex-[1.5]'}`} style={LIVE}>
          <MiniBoard lt={lt} still={still} stillTime={STILL_T} />
          {BEATS.main.moveStarts.map((start, i) => (
            <XpChip key={i} lt={lt} at={start + BEATS.main.moveDuration} i={i} still={still} />
          ))}
        </div>
        <Passport lt={lt} still={still} layout={layout} />
      </div>
    </div>
  );
}

function XpChip({ lt, at, i, still }: { lt: MotionValue<number>; at: number; i: number; still: boolean }) {
  const ref = useStyle<HTMLSpanElement>(lt, (t) => {
    const d = (still ? STILL_T : t) - at;
    const k = seg(d, 0, 1100);
    const opacity = d < 0 ? 0 : k < 0.15 ? k / 0.15 : 1 - seg(k, 0.6, 1);
    return { transform: `translate(-50%, ${(-easeOutCubic(k) * 70).toFixed(1)}px) scale(${(0.8 + 0.2 * easeOutCubic(seg(k, 0, 0.3))).toFixed(3)})`, opacity };
  });
  return (
    <span
      ref={ref}
      className="pointer-events-none absolute -top-3 inline-flex items-center gap-1 rounded-full bg-[#F7C95C] px-3 py-1 text-base font-extrabold text-[#3B1E0E] shadow-lg"
      style={{ left: `${30 + i * 20}%`, ...LIVE }}
    >
      <Sparkles className="h-4 w-4" aria-hidden /> {CONCEPT_TEXT.xpChip}
    </span>
  );
}

function Passport({ lt, still, layout }: { lt: MotionValue<number>; still: boolean; layout: SceneProps['layout'] }) {
  const { stampAt } = BEATS.main;
  const time = (t: number) => (still ? STILL_T : t);
  const shake = useStyle(lt, (t) => {
    const d = time(t) - stampAt - 150;
    if (d < 0 || d > 450) return { transform: 'translate(0px, 0px) rotate(2deg)' };
    const a = 6 * Math.exp(-d / 120) * Math.sin(d / 16);
    return { transform: `translate(${a.toFixed(2)}px, ${(Math.abs(a) * 0.5).toFixed(2)}px) rotate(${(2 + a * 0.15).toFixed(2)}deg)` };
  });
  const stamp = useStyle(lt, (t) => {
    const d = time(t) - stampAt;
    if (d < 0) return { opacity: 0, transform: 'rotate(-14deg) scale(2.6)' };
    const k = easeInCubic(seg(d, 0, 160));
    return { opacity: 1, transform: `rotate(-14deg) scale(${(2.6 - 1.6 * k).toFixed(3)})` };
  });
  const compact = layout !== 'desktop';
  return (
    <div
      ref={shake}
      style={LIVE}
      className={`relative mx-auto flex shrink-0 flex-col rounded-2xl border-2 border-[#C9A876] bg-[#FBF3E4] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.8)] ${
        layout === 'portrait' ? 'w-[min(78%,300px)] p-3' : compact ? 'w-[34%] p-3' : 'w-[30%] p-6'
      }`}
    >
      <div className="flex items-center justify-between border-b border-dashed border-[#C9A876] pb-2">
        <p className={`font-extrabold uppercase tracking-[0.18em] text-[#7A3E1D] ${compact ? 'text-[11px]' : 'text-sm'}`}>{CONCEPT_TEXT.passport}</p>
        <svg className={compact ? 'h-4 w-10' : 'h-6 w-14'} aria-hidden>
          <rect width="100%" height="100%" rx="3" fill="url(#cv-parang)" />
        </svg>
      </div>
      <div className={`mt-3 grid grid-cols-3 ${compact ? 'gap-2' : 'gap-4'}`}>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="relative aspect-square rounded-full border-2 border-dashed border-[#C9A876]/70">
            {i === 0 && (
              <span
                ref={stamp}
                className={`absolute -inset-1 flex items-center justify-center rounded-full border-[3px] border-double border-[#9E3C24] bg-[#FBF3E4] text-center font-extrabold uppercase leading-[1.05] text-[#9E3C24] ${
                  compact ? 'text-[8px]' : 'text-[11px]'
                }`}
              >
                {PILOT_PROVINCE.nama}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
