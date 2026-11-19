import { describe, expect, it } from 'vitest';
import { AI_PROFILES, TYPICAL_HUMAN, chooseAiThrow, humanThrow, planSpin, planStrike } from '@/lib/games/gasing/ai';
import {
  createMatch,
  currentThrow,
  lastResult,
  matchStep,
  nextRound,
  playMatch,
  playerRole,
  playerThrow,
  roundOrder,
} from '@/lib/games/gasing/match';
import { DRAW_EPSILON, decideRound } from '@/lib/games/gasing/outcome';
import { createWorld, forwardAngle, predictLanding, simulate } from '@/lib/games/gasing/physics';
import { createRng } from '@/lib/games/gasing/random';
import { ATURAN_DASAR } from '@/lib/games/gasing/rules';
import type { AiLevel, GameMode, Throw, TopState, World } from '@/lib/games/gasing/types';

function top(w: World, side: 0 | 1, f: Partial<TopState>) {
  Object.assign(w.tops[side], f);
}

describe('gasing round decision (Phase 20)', () => {
  it('out loses at once, even before the other top is thrown', () => {
    const w = createWorld(1);
    top(w, 0, { phase: 'out', endReason: 'keluar', spinTime: 0 });
    top(w, 1, { phase: 'held' });
    expect(decideRound(w, false)).toMatchObject({ winner: 1, reason: 'keluar' });
  });

  it('the longer spin wins, decided as soon as it is certain', () => {
    const w = createWorld(1);
    top(w, 0, { phase: 'stopped', endReason: 'jatuh', spinTime: 5 });
    top(w, 1, { phase: 'spinning', spinTime: 4 });
    expect(decideRound(w, true)).toBeNull();
    expect(decideRound(w, false)).toBeNull();
    top(w, 1, { spinTime: 5 + DRAW_EPSILON + 0.01 });
    expect(decideRound(w, true)).toMatchObject({ winner: 1, reason: 'lebih-lama' });
    top(w, 1, { phase: 'stopped', endReason: 'jatuh', spinTime: 3 });
    expect(decideRound(w, true)).toMatchObject({ winner: 0, reason: 'lebih-lama', times: [5, 3] });
  });

  it('equal times are a draw; both out: the longer one wins', () => {
    const w = createWorld(1);
    top(w, 0, { phase: 'stopped', spinTime: 5 });
    top(w, 1, { phase: 'stopped', spinTime: 5 + DRAW_EPSILON / 2 });
    expect(decideRound(w, true)?.winner).toBe('draw');
    top(w, 0, { phase: 'out', spinTime: 2 });
    top(w, 1, { phase: 'out', spinTime: 1 });
    expect(decideRound(w, true)).toMatchObject({ winner: 0, reason: 'keluar' });
  });

  it('with outIsLoss off, an out top simply stopped', () => {
    const w = createWorld(1);
    top(w, 0, { phase: 'out', spinTime: 6 });
    top(w, 1, { phase: 'stopped', spinTime: 3 });
    expect(decideRound(w, true, { ...ATURAN_DASAR, outIsLoss: false })).toMatchObject({ winner: 0, reason: 'lebih-lama' });
  });
});

describe('gasing match flow (Phase 20)', () => {
  it('Uri alternates who throws first; Pangkah swaps target and striker', () => {
    expect(roundOrder('uri', 1)).toEqual([{ side: 0, role: 'uri' }, { side: 1, role: 'uri' }]);
    expect(roundOrder('uri', 2)).toEqual([{ side: 1, role: 'uri' }, { side: 0, role: 'uri' }]);
    expect(roundOrder('pangkah', 1)).toEqual([{ side: 1, role: 'target' }, { side: 0, role: 'striker' }]);
    expect(roundOrder('pangkah', 2)).toEqual([{ side: 0, role: 'target' }, { side: 1, role: 'striker' }]);
    expect(roundOrder('pangkah', 3)).toEqual(roundOrder('pangkah', 1));
  });

  it('Pangkah round 1: the computer spins its top first, then it is the player\'s turn to strike', () => {
    const m = createMatch('pangkah', 'sedang', 7);
    expect(m.stage).toBe('wait');
    expect(playerThrow(m, { angle: forwardAngle(0), power: 0.5, quality: 1, perfect: false })).toBe(false);
    let guard = 0;
    while (m.stage !== 'aim' && guard++ < 1000) matchStep(m);
    expect(m.stage).toBe('aim');
    expect(m.world.tops[1].phase).toBe('spinning');
    expect(currentThrow(m)).toEqual({ side: 0, role: 'striker' });
    expect(playerRole(m)).toBe('striker');
    expect(playerThrow(m, { angle: forwardAngle(0), power: 0.5, quality: 1, perfect: false })).toBe(true);
    expect(m.stage).toBe('running');
    expect(playerThrow(m, { angle: forwardAngle(0), power: 0.5, quality: 1, perfect: false })).toBe(false);
  });

  it('Uri round 1: the player throws first, the computer after the player\'s top has landed', () => {
    const m = createMatch('uri', 'mudah', 3);
    expect(m.stage).toBe('aim');
    playerThrow(m, { angle: forwardAngle(0), power: 0.45, quality: 0.9, perfect: false });
    let sawWait = false;
    for (let i = 0; i < 400 && m.world.tops[1].phase === 'held'; i++) {
      matchStep(m);
      if (m.world.tops[0].phase === 'flying') expect(m.world.tops[1].phase).toBe('held');
      if (m.stage === 'wait') sawWait = true;
    }
    expect(sawWait).toBe(true);
    expect(m.world.tops[1].phase).not.toBe('held');
  });

  it('plays best of 3, stops at 2 wins and records every round', () => {
    for (const mode of ['uri', 'pangkah'] as GameMode[]) {
      for (let seed = 1; seed <= 15; seed++) {
        const rng = createRng(seed);
        const m = playMatch(mode, 'sedang', seed, (w, role) => humanThrow(w, 0, role, rng));
        expect(m.stage).toBe('match-over');
        const decided = m.results.filter((r) => r.winner !== 'draw').length;
        expect(m.results.length).toBeLessThanOrEqual(ATURAN_DASAR.maxRounds);
        expect(decided).toBeGreaterThanOrEqual(1);
        if (m.winner !== 'draw') expect(m.wins[m.winner!]).toBe(2);
        expect(m.wins[0] + m.wins[1]).toBe(decided);
        expect(lastResult(m)).toBe(m.results[m.results.length - 1]);
      }
    }
  });

  it('nextRound only works after a round is over', () => {
    const m = createMatch('uri', 'sedang', 1);
    nextRound(m);
    expect(m.round).toBe(1);
  });

  it('is deterministic for the same seed and the same player throws', () => {
    const run = () => {
      const rng = createRng(99);
      return playMatch('pangkah', 'sulit', 1234, (w, role) => humanThrow(w, 0, role, rng));
    };
    const a = run();
    const b = run();
    expect(a.results).toEqual(b.results);
    expect(a.world).toEqual(b.world);
  });
});

describe('gasing computer opponent (Phase 20)', () => {
  it('levels get steadier and more accurate from Mudah to Sulit', () => {
    const [m, s, h] = [AI_PROFILES.mudah, AI_PROFILES.sedang, AI_PROFILES.sulit];
    expect(m.angleSigma).toBeGreaterThan(s.angleSigma);
    expect(s.angleSigma).toBeGreaterThan(h.angleSigma);
    expect(m.powerSigma).toBeGreaterThan(s.powerSigma);
    expect(s.powerSigma).toBeGreaterThan(h.powerSigma);
    expect(m.qualityMax).toBeLessThanOrEqual(s.qualityMax);
    expect(s.qualityMin).toBeLessThan(h.qualityMin);
    expect(h.samples).toBeGreaterThan(0);
    expect(m.samples + s.samples).toBe(0);
  });

  it('plans: a spin lands away from the other top, a strike lands on it', () => {
    const w0 = simulate(createWorld(4), [{ atStep: 0, side: 1, throw: { angle: forwardAngle(1) + 0.2, power: 0.45, quality: 1, perfect: false } }], 200).world;
    const other = w0.tops[1];
    const strike = planStrike(w0, 0);
    const land = predictLanding(0, { ...strike, quality: 1, perfect: false });
    expect(Math.hypot(land.x - other.x, land.y - other.y)).toBeLessThan(0.05);
    const spin = planSpin(w0, 0);
    const spot = predictLanding(0, { ...spin, quality: 1, perfect: false });
    expect(Math.hypot(spot.x - other.x, spot.y - other.y)).toBeGreaterThan(0.3);
  });

  it('throws are valid and reproducible for a seed', () => {
    const w = simulate(createWorld(4), [{ atStep: 0, side: 0, throw: { angle: forwardAngle(0), power: 0.42, quality: 1, perfect: false } }], 200).world;
    for (const level of ['mudah', 'sedang', 'sulit'] as AiLevel[]) {
      const a = chooseAiThrow(w, 1, 'striker', level, createRng(5));
      const b = chooseAiThrow(w, 1, 'striker', level, createRng(5));
      expect(a).toEqual(b);
      expect(a.power).toBeGreaterThanOrEqual(0);
      expect(a.power).toBeLessThanOrEqual(1);
      expect(Math.abs(a.angle - forwardAngle(1))).toBeLessThanOrEqual((75 * Math.PI) / 180 + 1e-9);
    }
  });

  it('a Sulit decision stays well under 30 ms (main thread is enough, no worker needed)', () => {
    const w = simulate(createWorld(4), [{ atStep: 0, side: 0, throw: { angle: forwardAngle(0), power: 0.42, quality: 0.9, perfect: false } }], 200).world;
    const rng = createRng(1);
    chooseAiThrow(w, 1, 'striker', 'sulit', rng); // warm-up
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      chooseAiThrow(w, 1, 'striker', 'sulit', rng);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const median = times[10];
    console.info(`[gasing] Sulit striker decision: median ${median.toFixed(2)} ms, max ${times[19].toFixed(2)} ms (this machine)`);
    // A phone is about 4x slower than a desktop: the median stays under 30 ms there with this bound.
    expect(median).toBeLessThan(7.5);
  });
});

/**
 * Calibration (Phase 20): the documented typical human (TYPICAL_HUMAN in ai.ts: the same plans as the AI,
 * about ±3° aim error, ±0.06 power error, release quality 0.5 to 0.92, a perfect release one time in three)
 * plays 300 seeded matches per mode and level. Targets: the player wins ≈ 75 % against Mudah, 50 % against
 * Sedang, 30 % against Sulit (±10 %).
 */
describe('gasing AI calibration (Phase 20)', () => {
  const TARGET: Record<AiLevel, number> = { mudah: 0.75, sedang: 0.5, sulit: 0.3 };
  const N = 300;

  it('documents the typical human', () => {
    expect(TYPICAL_HUMAN).toMatchObject({ angleSigma: 0.05, powerSigma: 0.06, qualityMin: 0.5, qualityMax: 0.92, perfectChance: 0.33 });
  });

  for (const mode of ['uri', 'pangkah'] as GameMode[]) {
    for (const level of ['mudah', 'sedang', 'sulit'] as AiLevel[]) {
      it(`${mode} vs ${level}: the typical human wins ${TARGET[level] * 100} % ± 10 %`, () => {
        let wins = 0;
        for (let i = 0; i < N; i++) {
          const rng = createRng(1000 + i * 31);
          const m = playMatch(mode, level, 5000 + i * 17, (w: World, role): Throw => humanThrow(w, 0, role, rng));
          if (m.winner === 0) wins += 1;
        }
        const rate = wins / N;
        console.info(`[gasing] calibration ${mode} ${level}: player wins ${(rate * 100).toFixed(1)} % of ${N} matches`);
        expect(Math.abs(rate - TARGET[level])).toBeLessThanOrEqual(0.1);
      }, 60_000);
    }
  }
});
