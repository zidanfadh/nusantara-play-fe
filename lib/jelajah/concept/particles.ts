/**
 * Particle budget and deterministic particle seeds of the concept video (Phase 19). Pure; tested in
 * tests/jelajah/concept-clock.test.ts.
 *
 * - Budget per device tier (lib/jelajah/device-tier.ts): full 300, lite 120, 2d none (SVG-only fallback).
 *   Reduced motion: none. A low frame rate while the film plays (2 s average below LOW_FPS) also switches
 *   to the SVG-only fallback for the rest of the film.
 * - Every particle's motion is a pure function of the film time and its seed, so pausing, seeking and
 *   screenshots are deterministic.
 */
import type { Tier } from '../device-tier';

export const PARTICLE_LIMITS: Readonly<Record<Tier, number>> = { full: 300, lite: 120, '2d': 0 };

/** Below this 2 s average (after the first full window) the canvas is dropped. */
export const LOW_FPS = 30;

export function particleBudget(tier: Tier | null, opts: { reduced: boolean; lowFps: boolean }): number {
  if (!tier || opts.reduced || opts.lowFps) return 0;
  return PARTICLE_LIMITS[tier];
}

/** mulberry32: small seedable PRNG (deterministic particles). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ParticleSeed {
  /** Which toy the dust comes from (0 board, 1 top, 2 children), 0..2. */
  source: number;
  /** Offsets and speeds, each 0..1. */
  ox: number;
  oy: number;
  drift: number;
  wave: number;
  phase: number;
  /** Delay of the gather flight, 0..1. */
  delay: number;
  size: number;
  /** Which outline point the particle flies to (index into the targets list, modulo its length). */
  target: number;
}

export function makeParticleSeeds(count: number, seed = 19): ParticleSeed[] {
  const rnd = seededRandom(seed);
  const out: ParticleSeed[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      source: i % 3,
      ox: rnd(),
      oy: rnd(),
      drift: rnd(),
      wave: rnd(),
      phase: rnd(),
      delay: rnd(),
      size: rnd(),
      target: Math.floor(rnd() * 1e6),
    });
  }
  return out;
}

/** Points along the outer rings of the generated province paths (`M x y l dx dy … z`), every `step`-th vertex. */
export function outlinePoints(paths: readonly { d: string }[], step = 3): [number, number][] {
  const pts: [number, number][] = [];
  for (const { d } of paths) {
    for (const ring of d.split('z')) {
      const m = /^M(-?\d+) (-?\d+)l(.*)$/.exec(ring);
      if (!m) continue;
      let x = Number(m[1]);
      let y = Number(m[2]);
      pts.push([x, y]);
      const nums = m[3].match(/-?\d+/g) ?? [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        x += Number(nums[i]);
        y += Number(nums[i + 1]);
        if ((i / 2) % step === 0) pts.push([x, y]);
      }
    }
  }
  return pts;
}
