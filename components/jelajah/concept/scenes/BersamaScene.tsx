'use client';

import { motion, type MotionValue } from 'framer-motion';
import { GraduationCap, Presentation, Users } from 'lucide-react';
import { seededRandom } from '@/lib/jelajah/concept/particles';
import { BEATS, CONCEPT_SCENES, CONCEPT_TEXT } from '@/lib/jelajah/concept/script';
import { easeInOutCubic, easeOutBack, easeOutCubic, lerp, seg } from '@/lib/jelajah/concept/timeline';
import { CONCEPT_PROVINCE_PATHS, mapCenter, mapTransformAttr, ProvincePaths } from '../art/MapArt';
import { BLEED, Stage, useAttr, useAttrs, useDerived, useStyle, type SceneProps } from '../scene-kit';

const SCENE = CONCEPT_SCENES.find((s) => s.id === 'bersama')!;
const STILL_T = SCENE.still * SCENE.duration;

/** Dots: each province's centroid plus one or two nearby points, in a shuffled (deterministic) order. */
const DOTS: { x: number; y: number; order: number }[] = (() => {
  const rnd = seededRandom(7);
  const dots: { x: number; y: number; order: number }[] = [];
  for (const p of CONCEPT_PROVINCE_PATHS) {
    dots.push({ x: p.cx, y: p.cy, order: rnd() });
    const extra = rnd() > 0.5 ? 2 : 1;
    for (let k = 0; k < extra; k += 1) dots.push({ x: p.cx + (rnd() - 0.5) * 30, y: p.cy + (rnd() - 0.5) * 18, order: rnd() });
  }
  return dots.sort((a, b) => a.order - b.order).map((d, i) => ({ ...d, order: i }));
})();

/** Arcs between provinces far apart (codes), so the links span the archipelago. */
const ARC_PAIRS: [string, string][] = [
  ['11', '33'],
  ['16', '73'],
  ['31', '51'],
  ['61', '71'],
  ['13', '64'],
  ['35', '81'],
  ['52', '91'],
  ['12', '62'],
  ['18', '53'],
  ['34', '74'],
];

const byKode = new Map(CONCEPT_PROVINCE_PATHS.map((p) => [p.kode, p]));
const ARCS = ARC_PAIRS.flatMap(([a, b]) => {
  const pa = byKode.get(a);
  const pb = byKode.get(b);
  if (!pa || !pb) return [];
  const dx = pb.cx - pa.cx;
  const dy = pb.cy - pa.cy;
  const len = Math.hypot(dx, dy);
  // Control point lifted "north" of the midpoint, proportional to the distance: a soft arc.
  const c: [number, number] = [(pa.cx + pb.cx) / 2 + (dy / len) * len * 0.18, (pa.cy + pb.cy) / 2 - Math.abs(dx / len) * len * 0.32];
  return [{ a: [pa.cx, pa.cy] as [number, number], b: [pb.cx, pb.cy] as [number, number], c }];
});

function quad(a: [number, number], c: [number, number], b: [number, number], u: number): [number, number] {
  const v = 1 - u;
  return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]];
}

/** Scene 7 "bersama" (39–44 s): back to the whole map; people (dots) across provinces, linked by soft arcs. */
export function BersamaScene({ lt, layout, still }: SceneProps) {
  const time = (t: number) => (still ? STILL_T : t);
  const [mx, my] = mapCenter(layout);
  const camera = useAttr<SVGGElement>(lt, (t) => {
    const s = lerp(1.18, 1, easeInOutCubic(seg(time(t), -500, 2600)));
    return `translate(${mx} ${my}) scale(${s.toFixed(4)}) translate(${-mx} ${-my})`;
  });
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(90% 70% at 50% 40%, #2B2350 0%, #120F2A 75%)' }}>
      <Stage layout={layout}>
        <rect {...BLEED} fill="url(#cv-kawung-gold)" opacity="0.07" />
        <g ref={camera}>
          <g transform={mapTransformAttr(layout)}>
            <ProvincePaths fill="#2F2960" stroke="#5A5294" strokeWidth={1.2} />
            {ARCS.map((arc, i) => (
              <Arc key={i} arc={arc} i={i} lt={lt} still={still} />
            ))}
            {DOTS.map((d) => (
              <Dot key={d.order} x={d.x} y={d.y} order={d.order} lt={lt} still={still} />
            ))}
          </g>
        </g>
      </Stage>
      <Audiences lt={lt} still={still} layout={layout} />
    </div>
  );
}

function Dot({ x, y, order, lt, still }: { x: number; y: number; order: number; lt: MotionValue<number>; still: boolean }) {
  const { dotsFrom, dotStagger } = BEATS.bersama;
  const at = dotsFrom + (order % 40) * dotStagger + Math.floor(order / 40) * 120;
  const ref = useAttrs<SVGGElement>(lt, (t) => {
    const k = seg(still ? STILL_T : t, at, at + 450);
    return { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${easeOutBack(k).toFixed(3)})`, opacity: k > 0 ? '1' : '0' };
  });
  return (
    <g ref={ref}>
      <circle r="9" fill="url(#cv-spark)" opacity="0.8" />
      <circle r="3.2" fill="#FFE6A8" />
    </g>
  );
}

function Arc({ arc, i, lt, still }: { arc: { a: [number, number]; b: [number, number]; c: [number, number] }; i: number; lt: MotionValue<number>; still: boolean }) {
  const { arcsFrom, arcStagger } = BEATS.bersama;
  const at = arcsFrom + i * arcStagger;
  const opacity = useDerived(lt, (t) => 0.55 * easeOutCubic(seg(still ? STILL_T : t, at, at + 700)));
  const comet = useAttrs<SVGCircleElement>(lt, (t) => {
    const k = seg(still ? STILL_T : t, at, at + 1300);
    const [x, y] = quad(arc.a, arc.c, arc.b, easeInOutCubic(k));
    return { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`, opacity: k > 0 && k < 1 ? '1' : '0' };
  });
  return (
    <g>
      <motion.path
        d={`M${arc.a[0]} ${arc.a[1]} Q${arc.c[0].toFixed(1)} ${arc.c[1].toFixed(1)} ${arc.b[0]} ${arc.b[1]}`}
        fill="none"
        stroke="#F7C95C"
        strokeWidth={2.4}
        strokeLinecap="round"
        style={{ opacity }}
      />
      <circle ref={comet} r="6" fill="url(#cv-spark)" />
    </g>
  );
}

const AUDIENCE_ICONS = [GraduationCap, Presentation, Users];

function Audiences({ lt, still, layout }: { lt: MotionValue<number>; still: boolean; layout: SceneProps['layout'] }) {
  const spots =
    layout === 'portrait'
      ? ['left-[8%] top-[13%]', 'right-[8%] top-[19%]', 'left-1/2 top-[45%] -translate-x-1/2']
      : layout === 'landscape'
        ? ['left-[7%] top-[12%]', 'right-[7%] top-[16%]', 'left-1/2 top-[56%] -translate-x-1/2']
        : ['left-[9%] top-[14%]', 'right-[9%] top-[20%]', 'left-1/2 top-[62%] -translate-x-1/2'];
  return (
    <>
      {CONCEPT_TEXT.audiences.map((label, i) => (
        <Pill key={label} label={label} Icon={AUDIENCE_ICONS[i % AUDIENCE_ICONS.length]} i={i} lt={lt} still={still} className={spots[i % spots.length]} />
      ))}
    </>
  );
}

function Pill({
  label,
  Icon,
  i,
  lt,
  still,
  className,
}: {
  label: string;
  Icon: typeof Users;
  i: number;
  lt: MotionValue<number>;
  still: boolean;
  className: string;
}) {
  const { arcsFrom } = BEATS.bersama;
  const at = arcsFrom + 200 + i * 380;
  const ref = useStyle<HTMLSpanElement>(lt, (t) => {
    const k = seg(still ? STILL_T : t, at, at + 500);
    return { transform: `scale(${easeOutBack(k).toFixed(3)})`, opacity: k > 0 ? 1 : 0 };
  });
  return (
    <div className={`pointer-events-none absolute ${className}`}>
      <span
        ref={ref}
        className="inline-flex items-center gap-2 rounded-full border border-[#F7C95C]/60 bg-[#1E1840]/85 px-4 py-2 text-base font-bold text-[#FFE6A8] shadow-lg md:text-lg"
      >
        <Icon className="h-5 w-5" aria-hidden /> {label}
      </span>
    </div>
  );
}
