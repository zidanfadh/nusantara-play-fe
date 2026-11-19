import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DT,
  PHYSICS,
  applyThrow,
  cloneWorld,
  createWorld,
  energy,
  forwardAngle,
  normalizeThrow,
  powerForDistance,
  predictLanding,
  simulate,
  step,
  throwOrigin,
} from '@/lib/games/gasing/physics';
import { createRng } from '@/lib/games/gasing/random';
import type { ScheduledThrow, Side, Throw, TopState, World, WorldEvent } from '@/lib/games/gasing/types';

const root = fileURLToPath(new URL('../../', import.meta.url));

function spinningTop(w: World, side: Side, fields: Partial<TopState>): void {
  Object.assign(w.tops[side], { phase: 'spinning', spin: 100, spinStart: 100, tilt: 0.05 }, fields);
}

function randomThrow(rng: () => number, side: Side): Throw {
  return {
    angle: forwardAngle(side) + (rng() - 0.5) * 2,
    power: rng(),
    quality: rng(),
    perfect: rng() < 0.3,
  };
}

const done = (w: World) => w.tops.every((t) => t.phase === 'stopped' || t.phase === 'out');

describe('gasing physics: determinism (Phase 20)', () => {
  it('the same seed and inputs give the same world and events', () => {
    const inputs: ScheduledThrow[] = [
      { atStep: 0, side: 1, throw: { angle: Math.PI / 2, power: 0.42, quality: 0.7, perfect: false } },
      { atStep: 200, side: 0, throw: { angle: -Math.PI / 2 + 0.02, power: 0.5, quality: 0.8, perfect: true } },
    ];
    const a = simulate(createWorld(42), inputs, 1500);
    const b = simulate(createWorld(42), inputs, 1500);
    expect(a.world).toEqual(b.world);
    expect(a.events).toEqual(b.events);
    const c = simulate(createWorld(43), inputs, 1500);
    expect(c.world).not.toEqual(a.world);
  });

  it('simulate never changes the world it is given', () => {
    const w = createWorld(1);
    applyThrow(w, 0, { angle: -Math.PI / 2, power: 0.5, quality: 0.5, perfect: false });
    const copy = cloneWorld(w);
    simulate(w, [], 300);
    expect(w).toEqual(copy);
  });

  it('the engine uses no Date, Math.random or DOM', () => {
    for (const f of ['physics', 'random', 'types', 'rules']) {
      const src = readFileSync(`${root}lib/games/gasing/${f}.ts`, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(src, f).not.toMatch(/Math\.random|Date\.|new Date|performance\.|window\.|document\.|from\s+['"]react['"]/);
    }
  });
});

describe('gasing physics: energy (Phase 20)', () => {
  it('kinetic + spin energy never increases without a throw (random games)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = createRng(seed * 7919);
      const w = createWorld(seed);
      const throwAt: [number, number] = [Math.floor(rng() * 300), Math.floor(rng() * 300)];
      const throws: [Throw, Throw] = [randomThrow(rng, 0), randomThrow(rng, 1)];
      let before = energy(w);
      for (let i = 0; i < 2400 && !(i > 300 && done(w)); i++) {
        let thrown = false;
        for (const side of [0, 1] as const) {
          if (throwAt[side] === i) {
            applyThrow(w, side, throws[side]);
            thrown = true;
          }
        }
        if (thrown) before = energy(w);
        step(w);
        const after = energy(w);
        expect(after, `seed ${seed} step ${i}`).toBeLessThanOrEqual(before * (1 + 1e-12) + 1e-12);
        before = after;
      }
    }
  });

  it('a head-on collision with spin does not create energy', () => {
    const w = createWorld(5);
    spinningTop(w, 0, { x: -0.2, y: 0, vx: 2, vy: 0, spin: 140 });
    spinningTop(w, 1, { x: 0.2, y: 0, vx: -2, vy: 0, spin: 140 });
    const events: WorldEvent[] = [];
    let e = energy(w);
    for (let i = 0; i < 60; i++) {
      step(w, events);
      expect(energy(w)).toBeLessThanOrEqual(e + 1e-12);
      e = energy(w);
    }
    expect(events.some((ev) => ev.type === 'hit')).toBe(true);
  });
});

describe('gasing physics: stopping and the ring (Phase 20)', () => {
  it('a top with no spin left is stopped, and every stopped or out top has zero spin', () => {
    const w = createWorld(2);
    spinningTop(w, 0, { spin: 0 });
    step(w);
    expect(w.tops[0].phase).toBe('stopped');
    expect(w.tops[0].endReason).toBe('jatuh');
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRng(seed);
      const r = simulate(createWorld(seed), [
        { atStep: 0, side: 0, throw: randomThrow(rng, 0) },
        { atStep: 90, side: 1, throw: randomThrow(rng, 1) },
      ], 2400, { until: done });
      for (const t of r.world.tops) {
        if (t.phase === 'spinning') expect(Math.abs(t.spin)).toBeGreaterThan(PHYSICS.stopSpin);
        else {
          expect(t.spin).toBe(0);
          expect(t.vx).toBe(0);
          expect(t.vy).toBe(0);
        }
      }
    }
  });

  it('spinning slows down and the top eventually falls on its own', () => {
    const r = simulate(createWorld(3), [{ atStep: 0, side: 0, throw: { angle: forwardAngle(0), power: powerForDistance(1), quality: 1, perfect: true } }], 120 * 30, { until: done });
    const t = r.world.tops[0];
    expect(t.phase).toBe('stopped');
    expect(t.spinTime).toBeGreaterThan(6);
    expect(t.spinTime).toBeLessThan(12);
    expect(r.events.filter((e) => e.type === 'stop')).toHaveLength(1);
  });

  it('a better release spins longer', () => {
    const time = (quality: number, perfect: boolean) =>
      simulate(createWorld(4), [{ atStep: 0, side: 0, throw: { angle: forwardAngle(0), power: 0.45, quality, perfect } }], 120 * 30, { until: done }).world.tops[0].spinTime;
    expect(time(0.2, false)).toBeLessThan(time(0.6, false));
    expect(time(0.6, false)).toBeLessThan(time(0.95, false));
    expect(time(0.95, false)).toBeLessThan(time(0.95, true));
  });

  it('a top leaving the ring is out (sliding out and landing outside)', () => {
    const w = createWorld(9);
    spinningTop(w, 0, { x: 0.99, y: 0, vx: 1, vy: 0 });
    const events: WorldEvent[] = [];
    for (let i = 0; i < 10; i++) step(w, events);
    expect(w.tops[0].phase).toBe('out');
    expect(w.tops[0].endReason).toBe('keluar');
    expect(events.filter((e) => e.type === 'out')).toHaveLength(1);
    // Full power, wide aim: lands beyond the ring.
    const r = simulate(createWorld(9), [{ atStep: 0, side: 0, throw: { angle: forwardAngle(0) + 1.2, power: 1, quality: 1, perfect: false } }], 200);
    expect(r.world.tops[0].phase).toBe('out');
    expect(r.world.tops[0].spinTime).toBe(0);
  });

  it('a top inside the ring is never out', () => {
    const w = createWorld(9);
    spinningTop(w, 0, { x: 0.5, y: 0.5, vx: 0, vy: 0 });
    step(w);
    expect(w.tops[0].phase).toBe('spinning');
  });
});

describe('gasing physics: collisions (Phase 20)', () => {
  function run(w: World, steps: number) {
    const events: WorldEvent[] = [];
    for (let i = 0; i < steps; i++) step(w, events);
    return events;
  }

  it('mirror-symmetric tops end mirror-symmetric (no spin, equal masses)', () => {
    const w = createWorld(1);
    spinningTop(w, 0, { x: -0.3, y: 0.1, vx: 1.5, vy: 0, spin: 0.0001 + 50, tilt: 0.05 });
    spinningTop(w, 1, { x: 0.3, y: 0.1, vx: -1.5, vy: 0, spin: 0.0001 + 50, tilt: 0.05 });
    // Opposite spins mirror each other.
    w.tops[1].spin = -w.tops[0].spin;
    w.tops[1].precession = Math.PI - w.tops[0].precession;
    run(w, 40);
    const [a, b] = w.tops;
    expect(a.x).toBeCloseTo(-b.x, 9);
    expect(a.y).toBeCloseTo(b.y, 9);
    expect(a.vx).toBeCloseTo(-b.vx, 9);
    expect(a.spin).toBeCloseTo(-b.spin, 9);
    expect(a.tilt).toBeCloseTo(b.tilt, 9);
    expect(a.x).toBeLessThan(0);
  });

  it('swapping the two tops gives the same physical result', () => {
    const make = (swap: boolean) => {
      const w = createWorld(1);
      const p: Partial<TopState> = { x: -0.25, y: 0.05, vx: 2, vy: 0.3, spin: 120, tilt: 0.04, precession: 1 };
      const q: Partial<TopState> = { x: 0.2, y: -0.02, vx: -0.5, vy: 0, spin: 90, tilt: 0.08, precession: 2, mass: 1.5, radius: 0.092, inertia: PHYSICS.inertiaFactor * 1.5 * 0.092 * 0.092 };
      spinningTop(w, 0, swap ? q : p);
      spinningTop(w, 1, swap ? p : q);
      run(w, 30);
      return swap ? [w.tops[1], w.tops[0]] : [w.tops[0], w.tops[1]];
    };
    const [a1, b1] = make(false);
    const [a2, b2] = make(true);
    for (const k of ['x', 'y', 'vx', 'vy', 'spin', 'tilt'] as const) {
      expect(a2[k]).toBeCloseTo(a1[k], 10);
      expect(b2[k]).toBeCloseTo(b1[k], 10);
    }
  });

  it('momentum is conserved by the impact (tops far from friction effects)', () => {
    const w = createWorld(1);
    spinningTop(w, 0, { x: -0.1, y: 0, vx: 3, vy: 0, spin: 80 });
    spinningTop(w, 1, { x: 0.075, y: 0, vx: 0, vy: 0, spin: 80, mass: 1.5 });
    const before = w.tops[0].mass * w.tops[0].vx + w.tops[1].mass * w.tops[1].vx;
    // One step: friction + drag change it a little; the impulse itself is internal.
    step(w);
    const after = w.tops[0].mass * w.tops[0].vx + w.tops[1].mass * w.tops[1].vx;
    expect(Math.abs(after - before)).toBeLessThan(0.1 * Math.abs(before));
  });

  it('flying tops pass over each other; a top landing on a spinning one hits it', () => {
    const target: Throw = { angle: forwardAngle(1), power: powerForDistance(1), quality: 0.8, perfect: false };
    const w0 = simulate(createWorld(3), [{ atStep: 0, side: 1, throw: target }], 240).world;
    const t = w0.tops[1];
    const o = throwOrigin(0);
    const strike: Throw = { angle: Math.atan2(t.y - o.y, t.x - o.x), power: powerForDistance(Math.hypot(t.x - o.x, t.y - o.y)), quality: 0.8, perfect: false };
    const r = simulate(w0, [{ atStep: 0, side: 0, throw: strike }], 600);
    const land = r.events.find((e) => e.type === 'land' && e.side === 0);
    expect(land && land.type === 'land' && land.direct).toBe(true);
    const hits = r.events.filter((e) => e.type === 'hit');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].type === 'hit' && hits[0].strength).toBeGreaterThan(1);
    // The target spins much shorter than without the strike.
    const alone = simulate(w0, [], 120 * 20, { until: (w) => w.tops[1].phase !== 'spinning' }).world.tops[1].spinTime;
    const struck = simulate(w0, [{ atStep: 0, side: 0, throw: strike }], 120 * 20, { until: (w) => w.tops[1].phase !== 'spinning' }).world.tops[1].spinTime;
    expect(struck).toBeLessThan(alone - 2);
  });

  it('a heavier top suffers less from the same impact', () => {
    const w = createWorld(1);
    spinningTop(w, 0, { x: -0.2, y: 0, vx: 2.5, vy: 0, spin: 100, tilt: 0.02, mass: 1.5, inertia: PHYSICS.inertiaFactor * 1.5 * PHYSICS.topRadius ** 2 });
    spinningTop(w, 1, { x: 0, y: 0, vx: 0, vy: 0, spin: 100, tilt: 0.02 });
    run(w, 20);
    expect(w.tops[1].tilt).toBeGreaterThan(w.tops[0].tilt);
  });
});

describe('gasing physics: throws (Phase 20)', () => {
  it('clamps the aim to ±75° and power/quality to 0..1', () => {
    const n = normalizeThrow(0, { angle: 0, power: 2, quality: -1, perfect: false });
    expect(n.angle).toBeCloseTo(forwardAngle(0) + PHYSICS.maxAim, 10);
    expect(n.power).toBe(1);
    expect(n.quality).toBe(0);
    const bad = normalizeThrow(1, { angle: Number.NaN, power: Number.NaN, quality: Number.NaN, perfect: false });
    expect(bad).toEqual({ angle: forwardAngle(1), power: 0, quality: 0, perfect: false });
  });

  it('a clean release lands where predictLanding says; a shaky one scatters a little', () => {
    for (const side of [0, 1] as const) {
      const thr: Throw = { angle: forwardAngle(side) + 0.3, power: 0.55, quality: 1, perfect: false };
      const p = predictLanding(side, thr);
      const r = simulate(createWorld(1), [{ atStep: 0, side, throw: thr }], 200);
      const land = r.events.find((e) => e.type === 'land');
      expect(land && land.type === 'land' && land.x).toBeCloseTo(p.x, 1);
      expect(land && land.type === 'land' && land.y).toBeCloseTo(p.y, 1);
      expect(powerForDistance(Math.hypot(p.x - throwOrigin(side).x, p.y - throwOrigin(side).y))).toBeCloseTo(0.55, 6);
    }
    const p = predictLanding(0, { angle: forwardAngle(0), power: 0.5, quality: 0, perfect: false });
    let maxMiss = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const r = simulate(createWorld(seed), [{ atStep: 0, side: 0, throw: { angle: forwardAngle(0), power: 0.5, quality: 0, perfect: false } }], 200);
      const land = r.events.find((e) => e.type === 'land');
      if (land && land.type === 'land') maxMiss = Math.max(maxMiss, Math.hypot(land.x - p.x, land.y - p.y));
    }
    expect(maxMiss).toBeGreaterThan(0.03);
    expect(maxMiss).toBeLessThan(0.25);
  });

  it('a top can be thrown only once', () => {
    const w = createWorld(1);
    const events: WorldEvent[] = [];
    applyThrow(w, 0, { angle: forwardAngle(0), power: 0.4, quality: 1, perfect: false }, events);
    applyThrow(w, 0, { angle: forwardAngle(0), power: 1, quality: 1, perfect: false }, events);
    expect(events.filter((e) => e.type === 'throw')).toHaveLength(1);
  });

  it('runs fast enough for the AI (simulated seconds per millisecond)', () => {
    const t0 = performance.now();
    simulate(createWorld(1), [
      { atStep: 0, side: 1, throw: { angle: forwardAngle(1), power: 0.42, quality: 0.8, perfect: false } },
      { atStep: 1, side: 0, throw: { angle: forwardAngle(0), power: 0.42, quality: 0.8, perfect: false } },
    ], 120 * 10, { collectEvents: false });
    // 10 simulated seconds well under 20 ms even on a slow CI machine.
    expect(performance.now() - t0).toBeLessThan(20);
    expect(DT).toBeCloseTo(1 / 120, 12);
  });
});
