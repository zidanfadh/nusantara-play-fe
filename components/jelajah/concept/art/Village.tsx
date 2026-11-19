'use client';

/**
 * Stylised isometric village of scene 5 (Phase 19), in the colours of the Sumatera Selatan 3D scene
 * (lib/jelajah/scenes/sumatera-selatan.ts): a grass island on a slab, a river with a canoe, raised houses
 * with hip roofs (in the spirit of the 3D scene's "terinspirasi rumah limas" houses), palms, a plaza with
 * the game pavilion and six stands whose glows pulse. Pure SVG; the pulses move from the local time only.
 */
import type { MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
import type { ConceptLayout } from '@/lib/jelajah/concept/layout';
import { BEATS } from '@/lib/jelajah/concept/script';
import { mixHex } from '@/lib/jelajah/palette';
import { useAttr, useAttrs } from '../scene-kit';

const C = {
  grass: '#A3B46A',
  farGrass: '#93A55F',
  slab: '#7C6A45',
  plaza: '#DCC197',
  path: '#CFB083',
  bank: '#E2C99C',
  water: '#6FA6AA',
  waterDeep: '#4F8C96',
  wall: '#946039',
  post: '#5E3B25',
  floor: '#734A2E',
  roof: '#7E4330',
  trim: '#C99A2E',
  standRoof: '#B4553A',
  counter: '#D2AC78',
  leaf: '#6F9A4B',
  leafDark: '#587E3C',
  trunk: '#8A5A3B',
  glow: '#F7C95C',
};

const dark = (c: string, k: number) => mixHex(c, '#000000', k);
const light = (c: string, k: number) => mixHex(c, '#FFFFFF', k);

/** Tile size and the screen point of the village centre (tile 5,5) per layout (stage units). */
export const VILLAGE: Record<ConceptLayout, { u: number; cx: number; cy: number }> = {
  portrait: { u: 21, cx: 200, cy: 318 },
  landscape: { u: 19, cx: 450, cy: 160 },
  desktop: { u: 46, cx: 800, cy: 400 },
};

type P3 = [number, number, number];

function makeIso(u: number) {
  return ([x, y, z]: P3): [number, number] => [(x - y) * 0.866 * u, (x + y) * 0.5 * u - z * u];
}

type Iso = ReturnType<typeof makeIso>;

const pts = (iso: Iso, ps: P3[]) =>
  ps
    .map(iso)
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

function Box({ iso, x, y, z, w, d, h, color }: { iso: Iso; x: number; y: number; z: number; w: number; d: number; h: number; color: string }) {
  return (
    <g>
      <polygon points={pts(iso, [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={dark(color, 0.28)} />
      <polygon points={pts(iso, [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={dark(color, 0.12)} />
      <polygon points={pts(iso, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={light(color, 0.1)} />
    </g>
  );
}

/** Hip roof over the rectangle (with overhang), ridge along x. */
function HipRoof({ iso, x, y, z, w, d, rise, color }: { iso: Iso; x: number; y: number; z: number; w: number; d: number; rise: number; color: string }) {
  const o = 0.18;
  const x0 = x - o;
  const x1 = x + w + o;
  const y0 = y - o;
  const y1 = y + d + o;
  const cy = y + d / 2;
  const r0 = x + w * 0.3;
  const r1 = x + w * 0.7;
  const zt = z + rise;
  return (
    <g>
      <polygon points={pts(iso, [[x0, y0, z], [x1, y0, z], [r1, cy, zt], [r0, cy, zt]])} fill={light(color, 0.08)} />
      <polygon points={pts(iso, [[x0, y0, z], [x0, y1, z], [r0, cy, zt]])} fill={light(color, 0.15)} />
      <polygon points={pts(iso, [[x1, y0, z], [x1, y1, z], [r1, cy, zt]])} fill={dark(color, 0.3)} />
      <polygon points={pts(iso, [[x0, y1, z], [x1, y1, z], [r1, cy, zt], [r0, cy, zt]])} fill={dark(color, 0.1)} />
      <polyline points={pts(iso, [[r0, cy, zt], [r1, cy, zt]])} stroke={C.trim} strokeWidth="1.5" fill="none" />
    </g>
  );
}

function House({ iso, x, y }: { iso: Iso; x: number; y: number }) {
  const w = 1.5;
  const d = 1.1;
  const stilt = 0.55;
  return (
    <g>
      {[
        [x + 0.08, y + 0.08],
        [x + w - 0.14, y + 0.08],
        [x + 0.08, y + d - 0.14],
        [x + w - 0.14, y + d - 0.14],
      ].map(([px, py]) => (
        <Box key={`${px}-${py}`} iso={iso} x={px} y={py} z={0} w={0.07} d={0.07} h={stilt} color={C.post} />
      ))}
      <Box iso={iso} x={x - 0.05} y={y - 0.05} z={stilt} w={w + 0.1} d={d + 0.1} h={0.08} color={C.floor} />
      <Box iso={iso} x={x} y={y} z={stilt + 0.08} w={w} d={d} h={0.62} color={C.wall} />
      <HipRoof iso={iso} x={x} y={y} z={stilt + 0.7} w={w} d={d} rise={0.75} color={C.roof} />
    </g>
  );
}

function Stand({ iso, x, y }: { iso: Iso; x: number; y: number }) {
  const [gx, gy] = iso([x + 0.35, y + 0.3, 0]);
  return (
    <g>
      <GlowBase x={gx} y={gy} r={iso([1, 0, 0])[0] * 0.95} />
      {[
        [x, y],
        [x + 0.64, y],
        [x, y + 0.54],
        [x + 0.64, y + 0.54],
      ].map(([px, py]) => (
        <Box key={`${px}-${py}`} iso={iso} x={px} y={py} z={0} w={0.06} d={0.06} h={0.75} color={C.post} />
      ))}
      <Box iso={iso} x={x} y={y + 0.32} z={0} w={0.7} d={0.28} h={0.34} color={C.counter} />
      <HipRoof iso={iso} x={x} y={y} z={0.75} w={0.7} d={0.6} rise={0.38} color={C.standRoof} />
    </g>
  );
}

/** The still part of a glow: a soft pool of light on the ground (static layer). */
function GlowBase({ x, y, r }: { x: number; y: number; r: number }) {
  return <ellipse cx={x} cy={y} rx={r * 0.9} ry={r * 0.5} fill={C.glow} opacity="0.35" />;
}

/** The pulsing ring of a glow (live layer). */
function Ring({ lt, x, y, r, i, still }: { lt: MotionValue<number>; x: number; y: number; r: number; i: number; still: boolean }) {
  const { ringPeriod, ringStagger } = BEATS.jelajah;
  const ring = useAttrs<SVGEllipseElement>(lt, (t) => {
    // A pulse starts when k wraps to 0: the soundtrack's soft chimes (sound-cues.ts).
    const k = (((still ? 700 : t) + i * ringStagger) % ringPeriod) / ringPeriod;
    return {
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.7 + k * 1.1).toFixed(3)})`,
      opacity: (0.85 * (1 - k)).toFixed(3),
    };
  });
  return <ellipse ref={ring} rx={r} ry={r * 0.56} fill="none" stroke={C.glow} strokeWidth="2.5" />;
}

function Palm({ iso, x, y, h }: { iso: Iso; x: number; y: number; h: number }) {
  const [bx, by] = iso([x, y, 0]);
  const [tx, ty] = iso([x + 0.15, y - 0.1, h]);
  const u = iso([1, 0, 0])[0] / 0.866;
  return (
    <g>
      <ellipse cx={bx} cy={by} rx={u * 0.35} ry={u * 0.18} fill="#000" opacity="0.15" />
      <path d={`M${bx} ${by} Q${bx + u * 0.25} ${(by + ty) / 2} ${tx} ${ty}`} stroke={C.trunk} strokeWidth={u * 0.12} fill="none" strokeLinecap="round" />
      {[-150, -100, -40, 10, 60, 120].map((a, k) => (
        <ellipse
          key={a}
          cx={tx + Math.cos((a * Math.PI) / 180) * u * 0.42}
          cy={ty + Math.sin((a * Math.PI) / 180) * u * 0.22 + u * 0.08}
          rx={u * 0.5}
          ry={u * 0.13}
          fill={k % 2 ? C.leaf : C.leafDark}
          transform={`rotate(${a + (a > -90 && a < 90 ? 15 : -15)} ${tx + Math.cos((a * Math.PI) / 180) * u * 0.42} ${ty + Math.sin((a * Math.PI) / 180) * u * 0.22 + u * 0.08})`}
        />
      ))}
    </g>
  );
}

function Canoe({ iso, lt, still }: { iso: Iso; lt: MotionValue<number>; still: boolean }) {
  const [cx, cy] = iso([6.6, 7.55, 0]);
  const u = iso([1, 0, 0])[0] / 0.866;
  const ref = useAttr<SVGGElement>(lt, (t) => {
    const time = still ? 600 : t;
    return `translate(${(cx + Math.sin(time / 1500) * u * 0.25).toFixed(1)} ${(cy + Math.sin(time / 420) * u * 0.04).toFixed(1)}) rotate(-28)`;
  });
  return (
    <g ref={ref}>
      <path d={`M${-u * 0.8} 0 Q0 ${u * 0.32} ${u * 0.8} 0 Q0 ${u * 0.1} ${-u * 0.8} 0 Z`} fill={C.post} />
      <rect x={-u * 0.05} y={-u * 0.25} width={u * 0.1} height={u * 0.25} fill={C.floor} />
    </g>
  );
}

/** Stand positions around the plaza (tiles) and the pavilion's glow point. */
const STANDS: [number, number][] = [
  [3.25, 2.55],
  [4.7, 2.3],
  [6.15, 2.55],
  [3.15, 4.9],
  [4.7, 5.2],
  [6.25, 4.9],
];
const PAVILION_GLOW: P3 = [5, 4.15, 0];

/**
 * The moving parts of the village (pulsing rings, the canoe) on their own layer above the static drawing,
 * so the village itself is never repainted per frame (Phase 19 frame-rate measurement).
 */
export function VillageLive({ lt, layout, still }: { lt: MotionValue<number>; layout: ConceptLayout; still: boolean }) {
  const { u, cx, cy } = VILLAGE[layout];
  const iso = makeIso(u);
  const [ox, oy] = iso([5, 5, 0]);
  const [px, py] = iso(PAVILION_GLOW);
  return (
    <g transform={`translate(${cx - ox} ${cy - oy})`}>
      <Canoe iso={iso} lt={lt} still={still} />
      {STANDS.map(([x, y], i) => {
        const [gx, gy] = iso([x + 0.35, y + 0.3, 0]);
        return <Ring key={i} lt={lt} x={gx} y={gy} r={iso([1, 0, 0])[0] * 0.95} i={i} still={still} />;
      })}
      <Ring lt={lt} x={px} y={py} r={u * 1.5} i={BEATS.jelajah.pavilionRing} still={still} />
    </g>
  );
}

/** The static village drawing. */
export function Village({ layout }: { layout: ConceptLayout }) {
  const { u, cx, cy } = VILLAGE[layout];
  const iso = makeIso(u);
  const [ox, oy] = iso([5, 5, 0]);
  const slab = 0.45;
  const objects: { depth: number; node: ReactNode }[] = [];
  const houses: [number, number][] = [
    [0.6, 0.7],
    [7.8, 0.5],
    [0.5, 4.2],
    [8.2, 3.8],
    [3.6, 0.3],
  ];
  houses.forEach(([x, y]) => objects.push({ depth: x + y + 1.3, node: <House key={`h${x}`} iso={iso} x={x} y={y} /> }));
  STANDS.forEach(([x, y], i) => objects.push({ depth: x + y + 0.6, node: <Stand key={`s${i}`} iso={iso} x={x} y={y} /> }));
  objects.push({
    depth: 9.2,
    node: (
      <g key="pav">
        <GlowBase x={iso(PAVILION_GLOW)[0]} y={iso(PAVILION_GLOW)[1]} r={u * 1.5} />
        {[
          [4.35, 3.5],
          [5.55, 3.5],
          [4.35, 4.7],
          [5.55, 4.7],
        ].map(([px, py]) => (
          <Box key={`${px}-${py}`} iso={iso} x={px} y={py} z={0} w={0.08} d={0.08} h={0.9} color={C.post} />
        ))}
        <HipRoof iso={iso} x={4.3} y={3.45} z={0.9} w={1.4} d={1.4} rise={0.85} color={C.roof} />
      </g>
    ),
  });
  const palms: [number, number, number][] = [
    [0.4, 6.3, 2.3],
    [2.2, 6.4, 2.0],
    [9.4, 6.1, 2.4],
    [9.3, 1.9, 2.0],
    [2.6, 0.2, 1.9],
  ];
  palms.forEach(([x, y, h]) => objects.push({ depth: x + y, node: <Palm key={`p${x}-${y}`} iso={iso} x={x} y={y} h={h} /> }));
  objects.sort((a, b) => a.depth - b.depth);

  return (
    <g transform={`translate(${cx - ox} ${cy - oy})`}>
      {/* Slab sides, then the island. */}
      <polygon points={pts(iso, [[10, 0, 0], [10, 10, 0], [10, 10, -slab], [10, 0, -slab]])} fill={dark(C.slab, 0.25)} />
      <polygon points={pts(iso, [[0, 10, 0], [10, 10, 0], [10, 10, -slab], [0, 10, -slab]])} fill={C.slab} />
      <polygon points={pts(iso, [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]])} fill={C.grass} />
      <polygon points={pts(iso, [[0, 0, 0], [10, 0, 0], [10, 2.2, 0], [0, 2.2, 0]])} fill={C.farGrass} opacity="0.6" />
      {/* River with banks. */}
      <polygon points={pts(iso, [[0, 6.75, 0], [10, 6.75, 0], [10, 8.65, 0], [0, 8.65, 0]])} fill={C.bank} />
      <polygon points={pts(iso, [[0, 7.0, 0], [10, 7.0, 0], [10, 8.4, 0], [0, 8.4, 0]])} fill={C.water} />
      <polygon points={pts(iso, [[0, 7.55, 0], [10, 7.55, 0], [10, 8.05, 0], [0, 8.05, 0]])} fill={C.waterDeep} opacity="0.7" />
      {/* Paths and plaza. */}
      <polygon points={pts(iso, [[4.6, 0, 0], [5.4, 0, 0], [5.4, 6.75, 0], [4.6, 6.75, 0]])} fill={C.path} />
      <polygon points={pts(iso, [[0, 3.2, 0], [10, 3.2, 0], [10, 3.8, 0], [0, 3.8, 0]])} fill={C.path} />
      <polygon points={pts(iso, [[3.0, 2.3, 0], [7.0, 2.3, 0], [7.0, 6.0, 0], [3.0, 6.0, 0]])} fill={C.plaza} />
      {objects.map((o) => o.node)}
    </g>
  );
}
