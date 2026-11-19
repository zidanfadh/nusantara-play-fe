'use client';

import { motion, type MotionValue } from 'framer-motion';
import { STAGE, type ConceptLayout } from '@/lib/jelajah/concept/layout';
import { BEATS } from '@/lib/jelajah/concept/script';
import { easeInCubic, seg } from '@/lib/jelajah/concept/timeline';
import { COURTYARD, Courtyard } from '../art/Courtyard';
import { Stage, useAttr, useDerived, useStyle, type SceneProps } from '../scene-kit';

/** Static film grain: SVG noise rasterised once, moved by whole pixels (transform) 12 times a second. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.5 0 0 0 0 0.4 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Scene 2 "terlupa" (6–11 s): the colour drains to sepia, film grain, the toys turn to dust drifting right. */
export function TerlupaScene({ lt, layout, still, canvas }: SceneProps) {
  const { drainEnd, dustFrom, dustTo } = BEATS.terlupa;
  const time = (t: number) => (still ? 2300 : t);
  const kids = useDerived(lt, (t) => 1 - seg(time(t), 200, drainEnd + 600));
  const toys = useDerived(lt, (t) => 1 - easeInCubic(seg(time(t), dustFrom, dustFrom + 1500)));
  const camera = useStyle(lt, (t) => ({ transform: `scale(${(1.06 + seg(time(t), 0, 5000) * 0.04).toFixed(4)})` }));
  const grain = useStyle(lt, (t) => {
    const step = Math.floor(time(t) / 83);
    return { transform: `translate(${((step * 37) % 60) - 30}px, ${((step * 53) % 60) - 30}px)` };
  });
  const scratch = useStyle(lt, (t) => ({ opacity: Math.floor(time(t) / 120) % 7 === 0 ? 0.5 : 0.12 }));

  return (
    <div className="absolute inset-0 overflow-hidden" data-cv-scene="terlupa">
      <div ref={camera} className="absolute inset-0" style={{ transformOrigin: '50% 68%' }}>
        <Stage layout={layout}>
          <Courtyard lt={lt} layout={layout} tone="sepia" still={still} kidsOpacity={kids} toysOpacity={toys} fireflies={false} />
          {!canvas && !still && <SvgDust lt={lt} layout={layout} from={dustFrom} to={dustTo} />}
        </Stage>
      </div>
      <div
        ref={grain}
        aria-hidden
        className="pointer-events-none absolute -inset-[40px] opacity-[0.22] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
      <div ref={scratch} aria-hidden className="pointer-events-none absolute inset-y-0 left-[31%] w-px bg-[#E8D9B8]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(10,8,5,0.75) 100%)' }}
      />
    </div>
  );
}

/** Fallback without the particle canvas (2d tier, low frame rate): a few SVG specks drift right and fade. */
function SvgDust({ lt, layout, from, to }: { lt: MotionValue<number>; layout: ConceptLayout; from: number; to: number }) {
  const P = COURTYARD[layout];
  const sources = [P.board, P.top, P.jumper];
  return (
    <g fill="#E8D9B8">
      {Array.from({ length: 24 }, (_, i) => {
        const [sx, sy, s] = sources[i % 3];
        return <Speck key={i} lt={lt} i={i} x={sx + (((i * 29) % 60) - 30) * s} y={sy - ((i * 17) % 40) * s} from={from} to={to} w={STAGE[layout].w} />;
      })}
    </g>
  );
}

function Speck({ lt, i, x, y, from, to, w }: { lt: MotionValue<number>; i: number; x: number; y: number; from: number; to: number; w: number }) {
  const start = from + (i % 8) * 140;
  const ref = useAttr<SVGCircleElement>(lt, (t) => {
    const k = seg(t, start, to);
    return `translate(${(x + k * (w * 0.55 + (i % 5) * 40)).toFixed(1)} ${(y - k * (30 + (i % 4) * 18) + Math.sin(t / 400 + i) * 6).toFixed(1)})`;
  });
  const opacity = useDerived(lt, (t) => (t < start ? 0 : 0.8 * (1 - seg(t, start, to))));
  return <motion.circle ref={ref} r={1.6 + (i % 3) * 0.7} style={{ opacity }} />;
}
