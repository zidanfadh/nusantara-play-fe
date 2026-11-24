'use client';

/**
 * Simplified congklak board of scene 6 (Phase 19). The moves come from the real engine
 * (`buildCongklakDemo`, lib/games/congklak); the board shows the pit counts of the current event frame
 * (React state changes only when the frame changes) and a glowing hand that glides between pits.
 */
import type { MotionValue } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { buildCongklakDemo, type CongklakDemo } from '@/lib/jelajah/concept/congklak-demo';
import { BEATS } from '@/lib/jelajah/concept/script';
import { lerp, seg } from '@/lib/jelajah/concept/timeline';
import { useAttrs } from '../scene-kit';

export const BOARD_VIEW = { w: 760, h: 230 } as const;

/** Ring index → board position (player 0 bottom row left to right, their store right; player 1 top row back). */
export function pitPosition(pit: number): [number, number] {
  if (pit === 7) return [700, 115];
  if (pit === 15) return [60, 115];
  if (pit < 7) return [140 + pit * 80, 168];
  return [620 - (pit - 8) * 80, 62];
}

/** Which frame of which move is shown at local time `t`. */
export function demoFrameAt(demo: CongklakDemo, t: number): { move: number; frame: number; f: number } {
  const { moveStarts, moveDuration } = BEATS.main;
  let move = -1;
  for (let m = 0; m < demo.moves.length; m += 1) if (t >= moveStarts[m]) move = m;
  if (move < 0) return { move: -1, frame: 0, f: 0 };
  const frames = demo.moves[move].frames.length;
  const k = seg(t, moveStarts[move], moveStarts[move] + moveDuration) * (frames - 1);
  const frame = Math.min(frames - 1, Math.floor(k));
  return { move, frame, f: k - frame };
}

function pitsAt(demo: CongklakDemo, move: number, frame: number): number[] {
  return move < 0 ? demo.initial : demo.moves[move].frames[frame];
}

const SPIRAL = Array.from({ length: 22 }, (_, i) => {
  const a = i * 2.39996;
  const r = 4.6 * Math.sqrt(i + 0.6);
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
});

function Pit({ pit, count }: { pit: number; count: number }) {
  const [x, y] = pitPosition(pit);
  const store = pit === 7 || pit === 15;
  const shown = Math.min(count, store ? 22 : 12);
  return (
    <g transform={`translate(${x} ${y})`}>
      {store ? <ellipse rx="42" ry="82" fill="#2A1A0E" /> : <circle r="31" fill="#2A1A0E" />}
      {SPIRAL.slice(0, shown).map(([sx, sy], i) => (
        <circle key={i} cx={sx * (store ? 1.25 : 1)} cy={sy * (store ? 2.3 : 1)} r="4.4" fill="#F3E6CC" stroke="#B89B6E" strokeWidth="0.8" />
      ))}
      <text
        x="0"
        y={store ? 0 : pit < 7 ? 52 : -40}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={store ? 26 : 17}
        fontWeight="800"
        fill={store ? '#FFF4DF' : '#F4AE52'}
        stroke={store ? '#2A1A0E' : 'none'}
        strokeWidth={store ? 4 : 0}
        paintOrder="stroke"
      >
        {count}
      </text>
    </g>
  );
}

export function MiniBoard({ lt, still, stillTime }: { lt: MotionValue<number>; still: boolean; stillTime: number }) {
  const demo = useMemo(() => buildCongklakDemo(), []);
  const [key, setKey] = useState(() => demoFrameAt(demo, still ? stillTime : lt.get()));
  useEffect(() => {
    const update = (t: number) => {
      const next = demoFrameAt(demo, still ? stillTime : t);
      setKey((prev) => (prev.move === next.move && prev.frame === next.frame ? prev : next));
    };
    // The initial frame comes from useState; afterwards only real frame changes re-render.
    return lt.on('change', update);
  }, [demo, lt, still, stillTime]);

  const hand = useAttrs<SVGGElement>(lt, (t) => {
    const at = demoFrameAt(demo, still ? stillTime : t);
    if (at.move < 0) return { opacity: '0', transform: 'translate(0 0)' };
    const m = demo.moves[at.move];
    const a = m.hand[at.frame] >= 0 ? m.hand[at.frame] : m.hand.find((h) => h >= 0) ?? 0;
    const b = m.hand[Math.min(at.frame + 1, m.hand.length - 1)];
    const [ax, ay] = pitPosition(a);
    const [bx, by] = pitPosition(b >= 0 ? b : a);
    const k = at.frame + 1 < m.hand.length ? at.f : 0;
    const lift = Math.sin(Math.PI * k) * 18;
    const done = at.frame === m.frames.length - 1;
    return {
      opacity: done ? '0.35' : '1',
      transform: `translate(${lerp(ax, bx, k).toFixed(1)} ${(lerp(ay, by, k) - lift).toFixed(1)})`,
    };
  });

  const pits = pitsAt(demo, key.move, key.frame);
  const picked = key.move >= 0 ? (demo.moves[key.move].player === 0 ? demo.moves[key.move].hole : 8 + demo.moves[key.move].hole) : -1;
  return (
    <svg viewBox={`0 0 ${BOARD_VIEW.w} ${BOARD_VIEW.h}`} className="h-auto w-full" aria-hidden>
      <rect x="4" y="6" width="752" height="218" rx="109" fill="#000" opacity="0.35" transform="translate(0 8)" />
      <rect x="4" y="4" width="752" height="218" rx="109" fill="url(#cv-wood)" stroke="#F4AE52" strokeOpacity="0.35" strokeWidth="2" />
      <rect x="20" y="16" width="720" height="194" rx="97" fill="url(#cv-kawung-gold)" opacity="0.25" />
      {pits.map((count, pit) => (
        <Pit key={pit} pit={pit} count={count} />
      ))}
      {picked >= 0 && (
        <g transform={`translate(${pitPosition(picked)[0]} ${pitPosition(picked)[1]})`}>
          <circle r="36" fill="none" stroke="#F4AE52" strokeWidth="3" strokeDasharray="6 6" />
        </g>
      )}
      <g ref={hand}>
        <circle r="22" fill="url(#cv-spark)" />
        <circle r="7" fill="#FEF3E2" />
      </g>
    </svg>
  );
}
