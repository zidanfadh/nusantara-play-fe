import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DT,
  TUNING,
  beatTime,
  cloneWorld,
  createTrack,
  createWorld,
  gradeAt,
  heightAt,
  otherFoot,
  playRace,
  raceTime,
  simulate,
  slopeFactor,
  stepWorld,
  tiltOf,
  timeToIdeal,
  type Controller,
} from '@/lib/games/egrang/engine';
import { createRng } from '@/lib/games/egrang/random';
import { ATURAN_DASAR } from '@/lib/games/egrang/rules';
import type { Foot, RaceEvent, Variant, World } from '@/lib/games/egrang/types';

const root = fileURLToPath(new URL('../../', import.meta.url));
const VARIANTS: Variant[] = ['bambu', 'batok'];

const idle: Controller = () => null;

/** Steps exactly on every ideal moment (Bambu) or beat (Batok). */
const perfect: Controller = (w, side) => {
  const r = w.racers[side];
  if (r.phase !== 'walking' || raceTime(w) + DT < 0) return null;
  if (w.variant === 'bambu') {
    if (r.lastFoot === null) return 'R';
    const foot = otherFoot(r.lastFoot);
    const d = timeToIdeal(r, foot);
    return d < DT / 2 || d > TUNING.bambu.swayPeriod - DT / 2 ? foot : null;
  }
  const next = raceTime(w) + DT;
  const k = r.lastBeat + 1;
  return Math.abs(next - beatTime(k)) < DT / 2 ? (r.lastFoot ? otherFoot(r.lastFoot) : 'L') : null;
};

/** A sloppy random stepper (seeded): random gaps, random feet. */
function masher(seed: number): Controller {
  const rng = createRng(seed);
  let wait = 0;
  return (w) => {
    if (raceTime(w) < 0) return null;
    wait -= DT;
    if (wait > 0) return null;
    wait = 0.15 + rng() * 0.6;
    return rng() < 0.5 ? 'L' : 'R';
  };
}

describe('egrang track (Phase 23)', () => {
  it('is seeded: same seed same track, both variants use their configured length', () => {
    for (const v of VARIANTS) {
      const a = createTrack(v, 42);
      expect(createTrack(v, 42)).toEqual(a);
      expect(createTrack(v, 43)).not.toEqual(a);
      expect(a.length).toBe(ATURAN_DASAR[v].trackLength);
      expect(a.obstacles).toHaveLength(ATURAN_DASAR[v].obstacles);
      for (let i = 1; i < a.obstacles.length; i += 1) expect(a.obstacles[i].x).toBeGreaterThan(a.obstacles[i - 1].x + 2);
      for (const o of a.obstacles) {
        expect(o.x).toBeGreaterThan(0.1 * a.length);
        expect(o.x).toBeLessThan(0.92 * a.length);
      }
    }
  });

  it('has a gentle hill: up then down, flat outside, shorter steps uphill', () => {
    const t = createTrack('bambu', 7);
    expect(heightAt(t, 0)).toBe(0);
    expect(heightAt(t, t.length)).toBe(0);
    expect(heightAt(t, t.hill.x)).toBeCloseTo(TUNING.slope.height);
    expect(gradeAt(t, t.hill.x - t.hill.halfWidth / 2)).toBeGreaterThan(0);
    expect(gradeAt(t, t.hill.x + t.hill.halfWidth / 2)).toBeLessThan(0);
    expect(slopeFactor(t, t.hill.x - t.hill.halfWidth / 2)).toBeLessThan(1);
    expect(slopeFactor(t, t.hill.x + t.hill.halfWidth / 2)).toBeGreaterThan(1);
    expect(slopeFactor(t, 1)).toBe(1);
    const flat = createTrack('bambu', 7, { ...ATURAN_DASAR, slope: false });
    expect(heightAt(flat, flat.hill.x)).toBe(0);
  });
});

describe('egrang engine invariants (Phase 23)', () => {
  it.each(VARIANTS)('%s: deterministic (same seed and inputs → identical world and events)', (v) => {
    const a = playRace(v, 99, [masher(1), masher(2)], ATURAN_DASAR, true);
    const b = playRace(v, 99, [masher(1), masher(2)], ATURAN_DASAR, true);
    expect(JSON.stringify(b.world)).toBe(JSON.stringify(a.world));
    expect(b.events).toEqual(a.events);
    // Cloning mid-race and continuing gives the same result.
    const w = createWorld(v, 5);
    const inputs = Array.from({ length: 60 }, (_, i) => ({ atStep: 400 + i * 50, side: (i % 2) as 0 | 1, foot: (i % 4 < 2 ? 'L' : 'R') as Foot }));
    simulate(w, inputs, 1500);
    const c = cloneWorld(w);
    simulate(w, inputs, 2000);
    simulate(c, inputs, 2000);
    expect(c).toEqual(w);
  });

  it.each(VARIANTS)('%s: no forward progress without steps', (v) => {
    const w = createWorld(v, 3);
    for (let i = 0; i < 30 * 120; i += 1) {
      stepWorld(w);
      expect(w.racers[0].x).toBe(0);
      expect(w.racers[1].x).toBe(0);
    }
    expect(w.racers.every((r) => r.phase === 'walking')).toBe(true);
    const run = playRace(v, 3, [idle, idle]);
    expect(run.result).toMatchObject({ winner: 'draw', reason: 'time', times: [null, null], distances: [0, 0] });
  });

  it.each(VARIANTS)('%s: steps during the countdown are ignored', (v) => {
    const w = createWorld(v, 3);
    const inputs = Array.from({ length: 20 }, (_, i) => ({ atStep: 10 + i * 15, side: 0 as const, foot: (i % 2 ? 'L' : 'R') as Foot }));
    const events = simulate(w, inputs, 340);
    expect(events.some((e) => e.type === 'step')).toBe(false);
    expect(w.racers[0].x).toBe(0);
  });

  it.each(VARIANTS)('%s: x never decreases and progress comes only after steps', (v) => {
    const w = createWorld(v, 11);
    const c = masher(4);
    let stepped = false;
    let prev = 0;
    while (!w.result) {
      const f = c(w, 0);
      stepWorld(w, f ? [{ side: 0, foot: f }] : []);
      if (w.events.some((e) => e.type === 'step' && e.side === 0)) stepped = true;
      if (!stepped) expect(w.racers[0].x).toBe(0);
      expect(w.racers[0].x).toBeGreaterThanOrEqual(prev);
      prev = w.racers[0].x;
    }
  });

  it.each(VARIANTS)('%s: finishing is detected exactly once per racer, the race ends exactly once', (v) => {
    for (const seed of [1, 2, 3]) {
      const run = playRace(v, seed, [perfect, masher(seed)], ATURAN_DASAR, true);
      const finishes = run.events.filter((e): e is Extract<RaceEvent, { type: 'finish' }> => e.type === 'finish');
      expect(finishes.filter((e) => e.side === 0)).toHaveLength(1);
      expect(finishes.filter((e) => e.side === 1).length).toBeLessThanOrEqual(1);
      expect(run.events.filter((e) => e.type === 'end')).toHaveLength(1);
      expect(run.events.filter((e) => e.type === 'go')).toHaveLength(1);
      expect(run.result.winner).toBe(0);
      expect(run.result.times[0]).toBe(finishes[0].time);
      // The interpolated time lies inside the step that crossed the line.
      expect(run.world.racers[0].finishT).toBeGreaterThan(0);
      // Stepping on after the end changes nothing.
      const before = JSON.stringify(run.world);
      stepWorld(run.world, [{ side: 0, foot: 'L' }, { side: 1, foot: 'R' }]);
      expect(run.world.events).toEqual([]);
      expect(JSON.stringify({ ...run.world, events: [] })).toBe(JSON.stringify({ ...JSON.parse(before), events: [] }));
    }
  });

  it.each(VARIANTS)('%s: a perfect racer finishes in a sensible time and every step is perfect', (v) => {
    const run = playRace(v, 8, [perfect, idle]);
    const r = run.world.racers[0];
    expect(r.stats.falls + r.stats.slips).toBe(0);
    expect(r.stats.perfect).toBe(r.stats.steps - (v === 'bambu' ? 1 : 0)); // Bambu's first step only starts the sway
    expect(run.result.times[0]).toBeGreaterThan(20);
    expect(run.result.times[0]).toBeLessThan(45);
    expect(run.result.winner).toBe(0);
    expect(run.result.times[1]).toBeNull();
  });

  it('bambu: bad steps grow the sway and a fall always costs the penalty time', () => {
    const w = createWorld('bambu', 1);
    // Same foot again and again: every step kicks the sway.
    const inputs = Array.from({ length: 12 }, (_, i) => ({ atStep: 361 + i * 30, side: 0 as const, foot: 'L' as Foot }));
    const events = simulate(w, inputs, 2000);
    const fall = events.findIndex((e) => e.type === 'fall' && e.side === 0);
    expect(fall).toBeGreaterThanOrEqual(0);
    expect(w.racers[0].stats.falls).toBeGreaterThanOrEqual(1);

    // Penalty: from the fall to "up", x is frozen and steps are ignored, for penaltySeconds.
    const w2 = createWorld('bambu', 1);
    let fellAt = -1;
    let xAtFall = 0;
    let upAt = -1;
    let i = 0;
    while (upAt < 0 && i < 4000) {
      i += 1;
      const tryStep = fellAt >= 0 ? [{ side: 0 as const, foot: (i % 2 ? 'L' : 'R') as Foot }] : i > 361 && i % 30 === 0 ? [{ side: 0 as const, foot: 'L' as Foot }] : [];
      stepWorld(w2, tryStep);
      if (fellAt < 0 && w2.events.some((e) => e.type === 'fall')) {
        fellAt = w2.t;
        xAtFall = w2.racers[0].x;
      } else if (fellAt >= 0) {
        expect(w2.events.some((e) => e.type === 'step')).toBe(false);
        expect(w2.racers[0].x).toBe(xAtFall);
        if (w2.events.some((e) => e.type === 'up')) upAt = w2.t;
      }
    }
    expect(upAt - fellAt).toBeCloseTo(ATURAN_DASAR.bambu.penaltySeconds, 1);
    expect(Math.abs(tiltOf(w2.racers[0]))).toBeLessThan(1);
  });

  it('batok: a step off the beat or the same foot twice slips and costs the penalty time; never a fall', () => {
    const w = createWorld('batok', 1);
    const cd = ATURAN_DASAR.countdownSeconds;
    const at = (s: number) => Math.round((cd + s) * 120);
    // On beat 1 (L), on beat 2 with L again → slip.
    const events = simulate(w, [
      { atStep: at(beatTime(1)), side: 0, foot: 'L' },
      { atStep: at(beatTime(2)), side: 0, foot: 'L' },
    ], at(beatTime(2)) + 2);
    expect(events.filter((e) => e.type === 'step')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'slip')).toHaveLength(1);
    // Off the beat → slip.
    const w2 = createWorld('batok', 1);
    const e2 = simulate(w2, [{ atStep: at(beatTime(3) + 0.2), side: 0, foot: 'R' }], at(5));
    expect(e2.filter((e) => e.type === 'slip')).toHaveLength(1);
    // Two steps on the same beat → the second slips.
    const w3 = createWorld('batok', 1);
    const e3 = simulate(w3, [
      { atStep: at(beatTime(2)) - 3, side: 0, foot: 'L' },
      { atStep: at(beatTime(2)) + 3, side: 0, foot: 'R' },
    ], at(3));
    expect(e3.map((e) => e.type).filter((t) => t === 'step' || t === 'slip')).toEqual(['step', 'slip']);
    // The penalty: x frozen for penaltySeconds, then "up".
    const w4 = createWorld('batok', 1);
    simulate(w4, [{ atStep: at(beatTime(2) + 0.2), side: 0, foot: 'R' }], at(beatTime(2) + 0.2));
    const x0 = w4.racers[0].x;
    const t0 = w4.t;
    let up = -1;
    while (up < 0) {
      stepWorld(w4, [{ side: 0, foot: 'L' }]);
      if (w4.events.some((e) => e.type === 'up')) up = w4.t;
      else expect(w4.racers[0].x).toBe(x0);
    }
    expect(up - t0).toBeCloseTo(ATURAN_DASAR.batok.penaltySeconds, 1);
    // Mashing never makes a Batok racer fall.
    const run = playRace('batok', 4, [masher(9), masher(10)], ATURAN_DASAR, true);
    expect(run.events.some((e) => e.type === 'fall')).toBe(false);
  });

  it.each(VARIANTS)('%s: the obstacle step is judged once per obstacle and racer', (v) => {
    const run = playRace(v, 21, [perfect, masher(21)]);
    for (const r of run.world.racers) {
      expect(r.stats.obstaclesOk + r.stats.obstaclesMissed).toBeLessThanOrEqual(run.world.track.obstacles.length);
    }
    const p = run.world.racers[0];
    expect(p.stats.obstaclesMissed).toBe(0);
  });

  it('both variants share the input and race code', () => {
    const src = readFileSync(`${root}lib/games/egrang/engine.ts`, 'utf8');
    // One step entry point used for every input source; one race loop.
    expect(src.match(/export function stepWorld/g)).toHaveLength(1);
    expect(src.match(/function takeStep\(/g)).toHaveLength(1);
    expect(src).not.toMatch(/Math\.random\(|Date\.now|new Date|performance\.now|document\.[a-z]|window\.[a-z]/);
    // Same controller and runner drive both variants to a finish.
    for (const v of VARIANTS) {
      const run: { world: World } = playRace(v, 2, [perfect, perfect]);
      expect(run.world.racers.every((r) => r.finishT !== null)).toBe(true);
    }
  });
});
