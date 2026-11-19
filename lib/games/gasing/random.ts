/**
 * Seeded random numbers for the gasing engine and AI (Phase 20): mulberry32, the same generator congklak
 * uses. The engine keeps the generator's state inside the World (`world.rng`), so a world plus its inputs
 * fully determine the simulation. Never Math.random or Date in the engine.
 */

export type Rng = () => number;

/** One mulberry32 step: returns [value in [0, 1), next state]. */
export function mulberry32Step(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) | 0;
  let r = Math.imul(next ^ (next >>> 15), next | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, next];
}

/** A generator closure (AI, tests). */
export function createRng(seed: number): Rng {
  let state = seed | 0;
  return () => {
    const [v, next] = mulberry32Step(state);
    state = next;
    return v;
  };
}

/** Standard normal sample (Box-Muller) from a generator. */
export function gaussian(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
