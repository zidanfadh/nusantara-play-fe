'use client';

/**
 * The dusk courtyard of scenes 1 and 2 (Phase 19): sky from deep indigo to an amber horizon, a raised
 * house and a big tree in silhouette, children at play, a congklak board with seeds rolling from hole to
 * hole and a spinning gasing (top) with motion blur. Drawn once in two tones: warm (scene 1) and sepia
 * (scene 2, the colour drained). Everything moves from the scene's local time only.
 */
import { motion, type MotionValue } from 'framer-motion';
import { useId } from 'react';
import { STAGE, type ConceptLayout } from '@/lib/jelajah/concept/layout';
import { BEATS } from '@/lib/jelajah/concept/script';
import { seg } from '@/lib/jelajah/concept/timeline';
import { BLEED, useAttr, useDerived } from '../scene-kit';

export type CourtyardTone = 'warm' | 'sepia';

const TONES = {
  warm: {
    sky: ['#120E2E', '#2C1E55', '#6B2F5E', '#C4532A', '#F2A541'],
    sun: 'url(#cv-sun)',
    star: '#FBEFD5',
    silhouette: '#150F22',
    rim: '#F2A541',
    ground: '#21141C',
    groundGlow: '#5A2E1E',
    window: '#F7B955',
    wood: 'url(#cv-wood)',
    hole: '#3B1E0E',
    seed: '#F6E7C8',
    top: '#C0392B',
    topStripe: '#F2C14E',
    firefly: '#FFE08A',
  },
  sepia: {
    sky: ['#1F1B16', '#3A322A', '#5E5242', '#8E7A5E', '#C4AA80'],
    sun: 'url(#cv-sun-sepia)',
    star: '#D9CBB0',
    silhouette: '#1B1712',
    rim: '#B39B74',
    ground: '#221D17',
    groundGlow: '#4A3F31',
    window: '#C9B086',
    wood: 'url(#cv-wood-sepia)',
    hole: '#2E261C',
    seed: '#D9CBB0',
    top: '#7A6650',
    topStripe: '#B8A27E',
    firefly: '#D9CBB0',
  },
} as const;

interface Placement {
  horizon: number;
  sun: [number, number, number];
  board: [number, number, number];
  top: [number, number, number];
  jumper: [number, number, number];
  kneelers: [number, number, number][];
  house: [number, number];
  tree: [number, number];
}

/** Composition per layout (stage units): the board and the toys sit above the caption band. */
export const COURTYARD: Record<ConceptLayout, Placement> = {
  portrait: {
    horizon: 470,
    sun: [250, 470, 230],
    board: [200, 548, 0.95],
    top: [338, 520, 1.05],
    jumper: [92, 476, 1.05],
    kneelers: [
      [148, 516, 0.95],
      [258, 516, 0.95],
    ],
    house: [62, 1.05],
    tree: [352, 1.15],
  },
  landscape: {
    horizon: 258,
    sun: [560, 258, 200],
    board: [450, 312, 0.95],
    top: [640, 292, 0.9],
    jumper: [290, 262, 0.85],
    kneelers: [
      [392, 286, 0.82],
      [508, 286, 0.82],
    ],
    house: [130, 0.95],
    tree: [790, 1.05],
  },
  desktop: {
    horizon: 610,
    sun: [960, 610, 420],
    board: [800, 700, 1.6],
    top: [1130, 664, 1.5],
    jumper: [540, 612, 1.5],
    kneelers: [
      [702, 652, 1.4],
      [898, 652, 1.4],
    ],
    house: [250, 1.65],
    tree: [1370, 1.8],
  },
};

const STARS: [number, number, number][] = Array.from({ length: 26 }, (_, i) => {
  const x = ((i * 137.5) % 100) / 100;
  const y = ((i * 61.8) % 100) / 100;
  return [x, y, 0.6 + ((i * 7) % 5) * 0.25];
});

/** Hole centres of the board in local units (16 positions around the ring: top row, right store, bottom row, left store). */
const RING: [number, number][] = [
  ...Array.from({ length: 7 }, (_, k) => [-96 + k * 32, -13] as [number, number]),
  [128, 0],
  ...Array.from({ length: 7 }, (_, k) => [96 - k * 32, 13] as [number, number]),
  [-128, 0],
];

function RollingSeed({ lt, index, still, fill }: { lt: MotionValue<number>; index: number; still: boolean; fill: string }) {
  const period = 820;
  const ref = useAttr<SVGCircleElement>(lt, (t) => {
    const { seedsFrom, seedsTo } = BEATS.halaman;
    const time = still ? seedsFrom + 1300 : t;
    const u = Math.max(0, time - seedsFrom) / period + index * 5.3;
    const k = Math.floor(u) % RING.length;
    const f = u - Math.floor(u);
    const [x0, y0] = RING[k];
    const [x1, y1] = RING[(k + 1) % RING.length];
    const x = x0 + (x1 - x0) * f;
    const y = y0 + (y1 - y0) * f - Math.sin(Math.PI * f) * 14;
    const shown = time >= seedsFrom && time <= seedsTo ? 1 : 0;
    return `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${shown})`;
  });
  return <circle ref={ref} r="4.2" fill={fill} />;
}

function Gasing({ lt, tone, still }: { lt: MotionValue<number>; tone: CourtyardTone; still: boolean }) {
  const c = TONES[tone];
  const clip = useId();
  const time = (t: number) => (still ? 900 : t);
  const stripes = useAttr<SVGGElement>(lt, (t) => `translate(${(-((time(t) * 0.42) % 14)).toFixed(2)} 0)`);
  const wobble = useAttr<SVGGElement>(lt, (t) => `rotate(${(Math.sin(time(t) / 260) * 4).toFixed(2)} 0 10)`);
  const blur = useAttr<SVGEllipseElement>(lt, (t) => (0.35 + 0.25 * Math.sin(time(t) / 37)).toFixed(2), 'opacity');
  return (
    <g ref={wobble}>
      <defs>
        <clipPath id={clip}>
          <path d="M-18 -22 Q-18 -33 0 -33 Q18 -33 18 -22 L2 8 Q0 11 -2 8 Z" />
        </clipPath>
      </defs>
      <ellipse cx="0" cy="11" rx="16" ry="3" fill="#000" opacity="0.35" />
      <path d="M-18 -22 Q-18 -33 0 -33 Q18 -33 18 -22 L2 8 Q0 11 -2 8 Z" fill={c.top} />
      <g clipPath={`url(#${clip})`}>
        <g ref={stripes}>
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={-28 + i * 14} y="-36" width="5" height="50" fill={c.topStripe} opacity="0.85" />
          ))}
        </g>
      </g>
      <rect x="-2" y="-41" width="4" height="9" rx="1.5" fill={c.silhouette} />
      {/* Motion blur ring around the widest part. */}
      <ellipse ref={blur} cx="0" cy="-24" rx="25" ry="5" fill="none" stroke={c.topStripe} strokeWidth="3" />
      <ellipse cx="0" cy="-24" rx="31" ry="7" fill="none" stroke={c.topStripe} strokeWidth="1" opacity="0.18" />
    </g>
  );
}

function Jumper({ lt, fill, rim, still }: { lt: MotionValue<number>; fill: string; rim: string; still: boolean }) {
  const body = useAttr<SVGGElement>(lt, (t) => {
    const y = -Math.abs(Math.sin((still ? 300 : t) / 300)) * 16;
    return `translate(0 ${y.toFixed(1)})`;
  });
  const shadow = useAttr<SVGEllipseElement>(lt, (t) => {
    const s = 1 - Math.abs(Math.sin((still ? 300 : t) / 300)) * 0.35;
    return `scale(${s.toFixed(2)} 1)`;
  });
  return (
    <g>
      <ellipse ref={shadow} cx="0" cy="1" rx="12" ry="2.5" fill="#000" opacity="0.4" />
      <g ref={body} fill={fill} stroke={rim} strokeOpacity="0.55" strokeWidth="1">
        <circle cx="0" cy="-62" r="8" />
        <path d="M-7 -52 Q0 -56 7 -52 L6 -24 L-6 -24 Z" />
        <path d="M-4 -25 L-9 -1 M4 -25 L9 -3" stroke={fill} strokeWidth="5" strokeLinecap="round" />
        <path d="M-6 -48 L-16 -67 M6 -48 L15 -65" stroke={fill} strokeWidth="4" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Kneeler({ flip, fill, rim }: { flip: boolean; fill: string; rim: string }) {
  return (
    <g transform={flip ? 'scale(-1 1)' : undefined} fill={fill} stroke={rim} strokeOpacity="0.5" strokeWidth="1">
      <circle cx="2" cy="-41" r="8" />
      <path d="M-13 0 Q-15 -30 1 -33 Q13 -31 12 0 Z" />
      <path d="M8 -24 L19 -9" stroke={fill} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function House({ c }: { c: (typeof TONES)[CourtyardTone] }) {
  return (
    <g fill={c.silhouette}>
      {[-50, -20, 20, 50].map((x) => (
        <rect key={x} x={x - 2.5} y="-42" width="5" height="42" />
      ))}
      <rect x="-62" y="-46" width="124" height="6" />
      <rect x="-54" y="-92" width="108" height="48" />
      <path d="M-74 -88 L-42 -130 L42 -130 L74 -88 Z" />
      <path d="M-44 -129 L-54 -144 M44 -129 L54 -144" stroke={c.silhouette} strokeWidth="4" strokeLinecap="round" />
      <path d="M58 -44 L76 0 M68 -44 L86 0" stroke={c.silhouette} strokeWidth="3" />
      <rect x="-30" y="-80" width="20" height="18" fill={c.window} opacity="0.9" />
      <rect x="10" y="-80" width="20" height="18" fill={c.window} opacity="0.55" />
    </g>
  );
}

function Tree({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      <path d="M-9 0 Q-6 -50 -5 -95 L5 -95 Q6 -50 12 0 Q4 -6 0 -4 Q-4 -6 -9 0 Z" />
      <circle cx="-42" cy="-118" r="44" />
      <circle cx="8" cy="-142" r="56" />
      <circle cx="56" cy="-112" r="40" />
      <circle cx="-8" cy="-98" r="38" />
      <path d="M-30 -80 L-34 -30 M36 -82 L40 -40" stroke={fill} strokeWidth="2" />
    </g>
  );
}

export function Courtyard({
  lt,
  layout,
  tone,
  still,
  kidsOpacity,
  toysOpacity,
  fireflies = true,
}: {
  lt: MotionValue<number>;
  layout: ConceptLayout;
  tone: CourtyardTone;
  still: boolean;
  kidsOpacity?: MotionValue<number>;
  toysOpacity?: MotionValue<number>;
  fireflies?: boolean;
}) {
  const c = TONES[tone];
  const P = COURTYARD[layout];
  const { w } = STAGE[layout];
  const skyId = useId();
  const sunScale = useAttr<SVGCircleElement>(lt, (t) => `scale(${(1 + seg(still ? 3000 : t, 0, 6000) * 0.12).toFixed(3)})`);
  const twinkle = useDerived(lt, (t) => 0.4 + 0.6 * Math.abs(Math.sin((still ? 700 : t) / 520)));
  const [bx, by, bs] = P.board;
  const [tx, ty, ts] = P.top;
  const [jx, jy, js] = P.jumper;

  return (
    <g>
      <defs>
        <linearGradient id={skyId} gradientUnits="userSpaceOnUse" x1="0" y1={-200} x2="0" y2={P.horizon}>
          {c.sky.map((col, i) => (
            <stop key={col} offset={i / (c.sky.length - 1)} stopColor={col} />
          ))}
        </linearGradient>
      </defs>
      <rect {...BLEED} fill={c.sky[0]} />
      <rect x={BLEED.x} y={-200} width={BLEED.width} height={P.horizon + 200} fill={`url(#${skyId})`} />
      <rect x={BLEED.x} y={-200} width={BLEED.width} height={P.horizon + 200} fill="url(#cv-kawung-cream)" opacity="0.07" />
      {STARS.map(([sx, sy, r], i) => {
        const cx = sx * w;
        const cy = 20 + sy * (P.horizon * 0.5);
        return i % 5 === 0 ? (
          <motion.circle key={i} cx={cx} cy={cy} r={r} fill={c.star} style={{ opacity: twinkle }} />
        ) : (
          <circle key={i} cx={cx} cy={cy} r={r} fill={c.star} opacity={0.55} />
        );
      })}
      <g transform={`translate(${P.sun[0]} ${P.sun[1]})`}>
        <circle ref={sunScale} r={P.sun[2]} fill={c.sun} />
      </g>
      {/* Ground. */}
      <rect x={BLEED.x} y={P.horizon} width={BLEED.width} height={6000} fill={c.ground} />
      <ellipse cx={bx} cy={P.horizon + 4} rx={w * 0.55} ry={(by - P.horizon) * 1.6 + 30} fill={c.groundGlow} opacity="0.55" />
      <rect x={BLEED.x} y={P.horizon - 2} width={BLEED.width} height="4" fill={c.rim} opacity="0.35" />
      <g transform={`translate(${P.house[0]} ${P.horizon}) scale(${P.house[1]})`}>
        <House c={c} />
      </g>
      <g transform={`translate(${P.tree[0]} ${P.horizon + 2}) scale(${P.tree[1]})`}>
        <Tree fill={c.silhouette} />
      </g>
      <motion.g style={kidsOpacity ? { opacity: kidsOpacity } : undefined} data-cv-anchor="kids">
        <g transform={`translate(${jx} ${jy}) scale(${js})`}>
          <Jumper lt={lt} fill={c.silhouette} rim={c.rim} still={still} />
        </g>
        {P.kneelers.map(([kx, ky, ks], i) => (
          <g key={kx} transform={`translate(${kx} ${ky}) scale(${ks})`}>
            <Kneeler flip={i === 1} fill={c.silhouette} rim={c.rim} />
          </g>
        ))}
      </motion.g>
      <motion.g style={toysOpacity ? { opacity: toysOpacity } : undefined}>
        <g transform={`translate(${bx} ${by}) scale(${bs})`} data-cv-anchor="board">
          <ellipse cx="0" cy="40" rx="150" ry="10" fill="#000" opacity="0.35" />
          <path
            d="M-150 0 C-150 -30 -120 -36 -100 -36 L100 -36 C120 -36 150 -30 150 0 C150 30 120 36 100 36 L-100 36 C-120 36 -150 30 -150 0 Z"
            fill={c.wood}
            stroke={c.rim}
            strokeOpacity="0.45"
          />
          {RING.map(([hx, hy], i) => {
            const store = i === 7 || i === 15;
            return <ellipse key={i} cx={hx} cy={hy} rx={store ? 16 : 11} ry={store ? 12 : 7} fill={c.hole} />;
          })}
          {RING.map(([hx, hy], i) =>
            i === 7 || i === 15 ? null : (
              <g key={`s${i}`} fill={c.seed} opacity="0.85">
                <circle cx={hx - 3} cy={hy + 1} r="2.3" />
                <circle cx={hx + 3} cy={hy} r="2.3" />
                <circle cx={hx} cy={hy - 2} r="2.3" />
              </g>
            ),
          )}
          {[0, 1, 2].map((i) => (
            <RollingSeed key={i} lt={lt} index={i} still={still} fill={c.seed} />
          ))}
        </g>
        <g transform={`translate(${tx} ${ty}) scale(${ts})`} data-cv-anchor="top">
          <Gasing lt={lt} tone={tone} still={still} />
        </g>
      </motion.g>
      {fireflies && <Fireflies lt={lt} layout={layout} color={c.firefly} still={still} />}
    </g>
  );
}

function Firefly({ lt, x, y, i, color, still }: { lt: MotionValue<number>; x: number; y: number; i: number; color: string; still: boolean }) {
  const ref = useAttr<SVGCircleElement>(lt, (t) => {
    const time = still ? 1200 + i * 300 : t;
    const dx = Math.sin(time / (900 + i * 70) + i) * 14;
    const dy = Math.cos(time / (1100 + i * 50) + i * 2) * 10;
    return `translate(${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)})`;
  });
  const glow = useDerived(lt, (t) => 0.25 + 0.75 * Math.abs(Math.sin((still ? 800 : t) / (420 + i * 40) + i)));
  return (
    <motion.circle ref={ref} r="3" fill={color} style={{ opacity: glow }} />
  );
}

function Fireflies({ lt, layout, color, still }: { lt: MotionValue<number>; layout: ConceptLayout; color: string; still: boolean }) {
  const { w } = STAGE[layout];
  const h = COURTYARD[layout].horizon;
  return (
    <g>
      {Array.from({ length: 10 }, (_, i) => (
        <Firefly key={i} lt={lt} i={i} x={(0.08 + ((i * 0.618) % 1) * 0.84) * w} y={h - 20 - ((i * 37) % 90)} color={color} still={still} />
      ))}
    </g>
  );
}
