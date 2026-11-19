/**
 * Seeded random numbers for the cue sheets (Phase 21): every variation (click pitch, chirp timing) is
 * seeded, so the offline WAV render equals the live playback. The same mulberry32 generator as the
 * synthesis core (core.ts keeps its own copy because it must stay self-contained for the Web Worker;
 * tests/audio/sound-core.test.ts checks both give the same numbers). Kept separate so the cue sheets do
 * not pull the synthesis core into the players' chunks.
 */

/** mulberry32: numbers in [0, 1) from a 32-bit seed. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
