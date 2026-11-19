import { describe, expect, it } from 'vitest';
import { AI_LEVELS, chooseAiMove, type AiLevel } from '@/lib/games/congklak/ai';
import { applyMove } from '@/lib/games/congklak/engine';
import { createRng, pick, type Rng } from '@/lib/games/congklak/random';
import { createInitialState, isLegalMove, legalMoves, scores, type CongklakState, type Player } from '@/lib/games/congklak/state';

/** Deterministic Sulit for tests: fixed depth, no time limit. */
const SULIT_TEST = { maxDepth: 4, timeLimitMs: Number.POSITIVE_INFINITY };

function play(levels: [AiLevel, AiLevel], seed: number, starting: Player) {
  const rngs: [Rng, Rng] = [createRng(seed * 2 + 1), createRng(seed * 2 + 2)];
  let state: CongklakState = createInitialState(starting);
  let moves = 0;
  while (!state.over) {
    const p = state.toMove;
    const { hole } = chooseAiMove(state, levels[p], { rng: rngs[p], ...SULIT_TEST });
    expect(isLegalMove(state, hole)).toBe(true);
    state = applyMove(state, hole).state;
    if (++moves > 2000) throw new Error('game did not end');
  }
  return state;
}

/** Positions from random games (start, middle, near the end). */
function samplePositions(count: number): CongklakState[] {
  const out: CongklakState[] = [];
  const rng = createRng(4242);
  while (out.length < count) {
    let s = createInitialState(rng() < 0.5 ? 0 : 1);
    while (!s.over && out.length < count) {
      if (rng() < 0.3) out.push(s);
      s = applyMove(s, pick(rng, legalMoves(s))).state;
    }
  }
  return out;
}

describe('congklak AI', () => {
  it('every level returns only legal moves', () => {
    const positions = samplePositions(300);
    const rng = createRng(7);
    for (const s of positions) {
      for (const level of AI_LEVELS) {
        const { hole } = chooseAiMove(s, level, { rng, maxDepth: 3, timeLimitMs: Number.POSITIVE_INFINITY });
        expect(legalMoves(s)).toContain(hole);
      }
    }
  });

  it('Sulit with the real 300 ms limit still returns a legal move, within the limit', () => {
    const rng = createRng(11);
    for (const s of samplePositions(5)) {
      const start = performance.now();
      const { hole, depth } = chooseAiMove(s, 'sulit', { rng, now: () => performance.now() });
      const ms = performance.now() - start;
      expect(legalMoves(s)).toContain(hole);
      expect(ms).toBeLessThan(300 + 150); // one node check interval of slack
      expect(depth).toBeGreaterThanOrEqual(0);
    }
  });

  it('throws when the game is over', () => {
    const over = { ...createInitialState(), over: true, winner: 'draw' as const };
    expect(() => chooseAiMove(over, 'mudah', { rng: createRng(1) })).toThrow();
  });

  it('Sedang takes an immediate extra turn or capture when one exists', () => {
    // From the start, hole 0 (7 seeds) ends in the own store.
    const { hole } = chooseAiMove(createInitialState(0), 'sedang', { rng: createRng(3) });
    const r = applyMove(createInitialState(0), hole);
    expect(r.summary.extraTurn || r.summary.captured > 0).toBe(true);
  });

  it('Sulit beats Mudah in most of 50 seeded games', () => {
    let wins = 0;
    let losses = 0;
    for (let g = 0; g < 50; g++) {
      const sulitSide: Player = g % 2 === 0 ? 0 : 1;
      const levels: [AiLevel, AiLevel] = sulitSide === 0 ? ['sulit', 'mudah'] : ['mudah', 'sulit'];
      const end = play(levels, g + 1, (g % 4 < 2 ? 0 : 1) as Player);
      expect(scores(end)[0] + scores(end)[1]).toBe(98);
      if (end.winner === sulitSide) wins += 1;
      else if (end.winner !== 'draw') losses += 1;
    }
    console.info(`[congklak] Sulit vs Mudah, 50 games: ${wins} won, ${losses} lost, ${50 - wins - losses} drawn`);
    expect(wins).toBeGreaterThan(25);
  });

  it('Sedang beats Mudah more often than not (50 seeded games)', () => {
    let wins = 0;
    for (let g = 0; g < 50; g++) {
      const side: Player = g % 2 === 0 ? 0 : 1;
      const levels: [AiLevel, AiLevel] = side === 0 ? ['sedang', 'mudah'] : ['mudah', 'sedang'];
      if (play(levels, 100 + g, 0).winner === side) wins += 1;
    }
    console.info(`[congklak] Sedang vs Mudah, 50 games: ${wins} won`);
    expect(wins).toBeGreaterThan(25);
  });
});
