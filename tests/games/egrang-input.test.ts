import { describe, expect, it } from 'vitest';
import { DT, createWorld, stepWorld } from '@/lib/games/egrang/engine';
import {
  MAX_LAG_SECONDS,
  clearInputs,
  createInputQueue,
  createSimClock,
  footFromKey,
  footFromPointer,
  pauseClock,
  queueStep,
  resumeClock,
  simAt,
  takeInputs,
} from '@/lib/games/egrang/input';
import type { Foot, Variant, World } from '@/lib/games/egrang/types';

describe('egrang input mapping (Phase 23)', () => {
  it('maps keys: ← / A left, → / L right, others nothing', () => {
    expect(footFromKey('ArrowLeft')).toBe('L');
    expect(footFromKey('a')).toBe('L');
    expect(footFromKey('A')).toBe('L');
    expect(footFromKey('ArrowRight')).toBe('R');
    expect(footFromKey('l')).toBe('R');
    expect(footFromKey('L')).toBe('R');
    for (const k of ['ArrowUp', ' ', 'Enter', 'd', 'Escape']) expect(footFromKey(k)).toBeNull();
  });

  it('maps taps by the half of the play area', () => {
    expect(footFromPointer(10, 0, 400)).toBe('L');
    expect(footFromPointer(199, 0, 400)).toBe('L');
    expect(footFromPointer(200, 0, 400)).toBe('R');
    expect(footFromPointer(390, 0, 400)).toBe('R');
    expect(footFromPointer(120, 100, 400)).toBe('L');
    expect(footFromPointer(320, 100, 400)).toBe('R');
  });

  it('keeps steps ordered, never in the past, and drains them per fixed step', () => {
    const q = createInputQueue();
    queueStep(q, 'R', 1.02, 1);
    queueStep(q, 'L', 1.001, 1);
    queueStep(q, 'L', 0.5, 1); // stamped before "now": counts at the next step
    expect(q.items.map((i) => i.at)).toEqual([1, 1.001, 1.02]);
    expect(takeInputs(q, 1 + DT)).toEqual(['L', 'L']);
    expect(takeInputs(q, 1 + 2 * DT)).toEqual([]);
    expect(takeInputs(q, 1.03)).toEqual(['R']);
    queueStep(q, 'L', 2, 2);
    clearInputs(q);
    expect(q.items).toEqual([]);
  });

  it('maps real time to simulation time with pauses taken out', () => {
    const c = createSimClock(1000);
    expect(simAt(c, 1500)).toBeCloseTo(0.5);
    pauseClock(c, 2000);
    expect(simAt(c, 9000)).toBeCloseTo(1);
    resumeClock(c, 9000);
    expect(simAt(c, 9500)).toBeCloseTo(1.5);
    expect(MAX_LAG_SECONDS).toBeGreaterThan(0);
  });
});

/**
 * The page's loop, headless: frames at the given times (ms); input events (ms + key or tap) are mapped to
 * a foot, queued with their own timestamp, and the simulation catches up to each frame in fixed steps.
 */
function runPage(variant: Variant, events: { ms: number; key?: string; tapX?: number }[], frameMs: number[]): World {
  const w = createWorld(variant, 77);
  const clock = createSimClock(0);
  const q = createInputQueue();
  let e = 0;
  for (const frame of frameMs) {
    while (e < events.length && events[e].ms <= frame) {
      const ev = events[e++];
      const foot: Foot | null = ev.key !== undefined ? footFromKey(ev.key) : footFromPointer(ev.tapX!, 0, 400);
      if (foot) queueStep(q, foot, simAt(clock, ev.ms), w.t);
    }
    const target = simAt(clock, frame);
    while (w.t + DT <= target + 1e-9 && !w.result) {
      const feet = takeInputs(q, w.t + DT);
      stepWorld(w, feet.map((foot) => ({ side: 0 as const, foot })));
    }
  }
  return w;
}

describe('egrang taps and keys give identical races (Phase 23)', () => {
  it.each(['bambu', 'batok'] as const)('%s', (variant) => {
    // Alternating steps every ~0.47 s after the countdown, with some jitter.
    const stamps = Array.from({ length: 70 }, (_, i) => 3000 + 420 + i * 460 + ((i * 37) % 50));
    const keys = stamps.map((ms, i) => ({ ms, key: i % 2 ? 'ArrowLeft' : 'ArrowRight' }));
    const taps = stamps.map((ms, i) => ({ ms, tapX: i % 2 ? 80 : 330 }));
    const keysAlt = stamps.map((ms, i) => ({ ms, key: i % 2 ? 'a' : 'L' }));
    const frames60 = Array.from({ length: 2400 }, (_, i) => (i + 1) * (1000 / 60));
    const framesUneven = Array.from({ length: 1700 }, (_, i) => (i + 1) * 23.7 + (i % 3) * 5);
    const a = runPage(variant, keys, frames60);
    const b = runPage(variant, taps, frames60);
    const c = runPage(variant, keysAlt, frames60);
    const d = runPage(variant, taps, framesUneven);
    expect(a.racers[0].stats.steps).toBeGreaterThan(20);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    // The frame rate does not change the race: steps are judged at the fixed step they happened in.
    const steps = Math.min(a.steps, d.steps);
    expect(steps).toBeGreaterThan(1000);
    const a2 = runPage(variant, keys, frames60.filter((f) => f <= steps * DT * 1000 + 1e-6));
    const d2 = runPage(variant, taps, framesUneven.filter((f) => f <= steps * DT * 1000 + 1e-6));
    const common = Math.min(a2.steps, d2.steps);
    expect(Math.abs(a2.steps - d2.steps)).toBeLessThanOrEqual(3);
    if (a2.steps === d2.steps) expect(d2).toEqual(a2);
    expect(d2.racers[0].stats).toEqual(a2.racers[0].stats);
    expect(common).toBeGreaterThan(0);
  });
});
