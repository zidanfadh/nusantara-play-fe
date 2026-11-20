import { describe, expect, it } from 'vitest';
import { AI_PROFILES, LEVEL_SCALE, TYPICAL_HUMAN, createAi, createStepper } from '@/lib/games/egrang/ai';
import { playRace } from '@/lib/games/egrang/engine';
import type { AiLevel, Variant } from '@/lib/games/egrang/types';

const VARIANTS: Variant[] = ['bambu', 'batok'];
const LEVELS: AiLevel[] = ['mudah', 'sedang', 'sulit'];
const TARGETS: Record<AiLevel, number> = { mudah: 0.75, sedang: 0.5, sulit: 0.3 };
const RACES = 300;

function winRate(variant: Variant, level: AiLevel): { rate: number; medianPlayerTime: number; penalties: number } {
  let wins = 0;
  let penalties = 0;
  const times: number[] = [];
  for (let i = 0; i < RACES; i += 1) {
    const seed = 5000 + i;
    const run = playRace(variant, seed, [createStepper(TYPICAL_HUMAN[variant], seed * 7 + 1), createAi(variant, level, seed * 13 + 5)]);
    if (run.result.winner === 0) wins += 1;
    else if (run.result.winner === 'draw') wins += 0.5;
    const p = run.world.racers[0];
    penalties += p.stats.falls + p.stats.slips;
    if (run.result.times[0] !== null) times.push(run.result.times[0]);
  }
  times.sort((a, b) => a - b);
  return { rate: wins / RACES, medianPlayerTime: times[Math.floor(times.length / 2)], penalties: penalties / RACES };
}

describe('egrang AI (Phase 23)', () => {
  it('is deterministic per seed and finishes a race on every level', () => {
    for (const v of VARIANTS) {
      for (const level of LEVELS) {
        const a = playRace(v, 3, [() => null, createAi(v, level, 9)]);
        const b = playRace(v, 3, [() => null, createAi(v, level, 9)]);
        expect(b.result).toEqual(a.result);
        expect(a.result.winner).toBe(1);
        expect(a.result.times[1]).toBeGreaterThan(25);
        expect(a.result.times[1]).toBeLessThan(90);
      }
    }
  });

  it('levels are ordered: Sulit is steadier than Sedang, Sedang than Mudah', () => {
    for (const v of VARIANTS) {
      expect(LEVEL_SCALE[v].mudah).toBeGreaterThan(LEVEL_SCALE[v].sedang);
      expect(LEVEL_SCALE[v].sedang).toBeGreaterThan(LEVEL_SCALE[v].sulit);
      expect(AI_PROFILES[v].sulit.sigma).toBeLessThan(AI_PROFILES[v].mudah.sigma);
    }
  });

  // Calibration: the documented typical human (TYPICAL_HUMAN in ai.ts) races the computer RACES times per
  // variant and level; the player's win rate must be 75 / 50 / 30 % ± 10.
  it.each(VARIANTS)('%s: calibrated against the typical human (75 / 50 / 30 % ± 10)', (v) => {
    const lines: string[] = [];
    for (const level of LEVELS) {
      const r = winRate(v, level);
      lines.push(`${v} ${level}: player wins ${(r.rate * 100).toFixed(1)} % (median player time ${r.medianPlayerTime.toFixed(1)} s, ${r.penalties.toFixed(2)} ${v === 'bambu' ? 'falls' : 'slips'} per race)`);
      expect(Math.abs(r.rate - TARGETS[level]), lines.at(-1)).toBeLessThanOrEqual(0.1);
      // An average player's race lasts about 40 to 60 s.
      expect(r.medianPlayerTime).toBeGreaterThan(38);
      expect(r.medianPlayerTime).toBeLessThan(60);
    }
    console.log(lines.join('\n'));
  }, 60000);
});
