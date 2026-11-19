/** Seedable random generator (mulberry32) for the AI and the tests: the same seed gives the same game. */
import { core } from './core';

export type Rng = () => number;

export const createRng: (seed: number) => Rng = core.createRng;

/** Integer in [0, n). */
export const randomInt: (rng: Rng, n: number) => number = core.randomInt;

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return core.pick(rng, items);
}

/** A fresh seed from Math.random (UI games that do not need to be reproducible). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
