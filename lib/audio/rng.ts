/**
 * Seeded random numbers (Phase 21), the same generator the synthesis core uses (core.ts): every
 * variation in the cue sheets (click pitch, chirp timing) is seeded, so the offline WAV render equals the
 * live playback.
 */
import { soundCore } from './core';

const core = soundCore();

/** mulberry32: numbers in [0, 1) from a 32-bit seed. */
export const seededRng: (seed: number) => () => number = core.seededRng;
/** A stable 32-bit seed from a string (FNV-1a). */
export const seedFrom: (text: string) => number = core.seedFrom;
