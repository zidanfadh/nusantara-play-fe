import { describe, expect, it } from 'vitest';
import { applyMove, IllegalMoveError, simulateMove, type MoveEvent } from '@/lib/games/congklak/engine';
import { createRng, pick } from '@/lib/games/congklak/random';
import { replayEvent } from '@/lib/games/congklak/replay';
import { ATURAN_DASAR, DEFAULT_RULES, totalSeeds, type CongklakRules } from '@/lib/games/congklak/rules';
import {
  boardTotal,
  createInitialState,
  holeIndex,
  holeOf,
  legalMoves,
  oppositeOf,
  storeIndex,
  type CongklakState,
  type Player,
} from '@/lib/games/congklak/state';

// Ring indices with 7 holes: 0..6 player 0, 7 store 0, 8..14 player 1, 15 store 1.
const S0 = 7;
const S1 = 15;

function board(entries: Record<number, number>, toMove: Player = 0): CongklakState {
  const pits = new Array<number>(16).fill(0);
  for (const [k, v] of Object.entries(entries)) pits[Number(k)] = v;
  return { pits, toMove, over: false, winner: null };
}

function replayAll(pits: readonly number[], events: readonly MoveEvent[]): number[] {
  return events.reduce<number[]>((acc, e) => replayEvent(acc, e), pits.slice());
}

/** Plays a random game; calls `onMove` after every move. */
function randomGame(seed: number, onMove: (s: CongklakState, sown: number, safety: boolean) => void, rules: CongklakRules = DEFAULT_RULES) {
  const rng = createRng(seed);
  let state = createInitialState(rng() < 0.5 ? 0 : 1, rules);
  let moves = 0;
  while (!state.over) {
    const r = applyMove(state, pick(rng, legalMoves(state, rules)), rules);
    expect(replayAll(state.pits, r.events)).toEqual(r.state.pits);
    state = r.state;
    moves += 1;
    onMove(state, r.summary.sown, r.summary.safetyLimit);
    if (moves > 5000) throw new Error('game did not end');
  }
  return { state, moves };
}

describe('congklak board model', () => {
  it('starts with 7 seeds in each of the 14 holes (98), empty stores', () => {
    const s = createInitialState();
    expect(totalSeeds(DEFAULT_RULES)).toBe(98);
    expect(boardTotal(s.pits)).toBe(98);
    expect(s.pits[S0]).toBe(0);
    expect(s.pits[S1]).toBe(0);
    expect(legalMoves(s)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(createInitialState(1).toMove).toBe(1);
  });

  it('maps holes, stores and opposite holes', () => {
    expect(storeIndex(0)).toBe(S0);
    expect(storeIndex(1)).toBe(S1);
    expect(holeIndex(1, 0)).toBe(8);
    expect(oppositeOf(0)).toBe(14);
    expect(oppositeOf(6)).toBe(8);
    expect(holeOf(10)).toEqual({ player: 1, hole: 2 });
    expect(holeOf(S0)).toBeNull();
  });

  it('the default ruleset is "Aturan dasar" with capture at any time', () => {
    expect(DEFAULT_RULES).toBe(ATURAN_DASAR);
    expect(ATURAN_DASAR).toMatchObject({ name: 'Aturan dasar', holesPerSide: 7, seedsPerHole: 7, captureRequiresLap: false, maxSowPerMove: 10_000 });
  });
});

describe('congklak moves (Aturan dasar)', () => {
  it('last seed in the own store: the same player moves again', () => {
    const r = applyMove(createInitialState(0), 0); // 7 seeds: holes 1..6, then the store
    expect(r.summary.extraTurn).toBe(true);
    expect(r.state.toMove).toBe(0);
    expect(r.state.pits[S0]).toBe(1);
    expect(r.events.at(-1)).toEqual({ type: 'extra-turn', player: 0 });
  });

  it('sows one seed per pit in ring order, starting after the chosen hole', () => {
    const r = applyMove(createInitialState(0), 0);
    const sown = r.events.filter((e) => e.type === 'sow').map((e) => e.pit);
    expect(sown).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(r.events[0]).toEqual({ type: 'pickup', player: 0, pit: 0, count: 7 });
  });

  it('relay sowing: the last seed in a non-empty hole picks those seeds up and keeps sowing', () => {
    const r = applyMove(createInitialState(0), 1); // 7 seeds: 2..7 then 8 (player 1's hole with 7)
    expect(r.events.find((e) => e.type === 'relay')).toEqual({ type: 'relay', pit: 8, count: 8 });
    expect(r.summary.relays).toBeGreaterThanOrEqual(1);
    expect(r.summary.sown).toBeGreaterThan(7);
    expect(boardTotal(r.state.pits)).toBe(98);
  });

  it("skips the opponent's store and sows into the own store", () => {
    const s = board({ 6: 10, 9: 1, 12: 1 }, 0);
    const r = applyMove(s, 6);
    const sown = r.events.filter((e) => e.type === 'sow').map((e) => e.pit);
    expect(sown).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 0, 1]);
    expect(sown).not.toContain(S1);
    expect(r.state.pits[S1]).toBe(0);
  });

  it('player 1 skips player 0\'s store as well', () => {
    const s = board({ 14: 3, 2: 1 }, 1);
    const r = applyMove(s, 6); // ring 14 → 15 (own store), skip 7?? no: 15, 0, 1
    const sown = r.events.filter((e) => e.type === 'sow').map((e) => e.pit);
    expect(sown).toEqual([15, 0, 1]);
    const s2 = board({ 13: 12, 2: 1 }, 1);
    const sown2 = applyMove(s2, 5).events.filter((e) => e.type === 'sow').map((e) => e.pit);
    expect(sown2).not.toContain(S0);
    expect(sown2.slice(0, 10)).toEqual([14, 15, 0, 1, 2, 3, 4, 5, 6, 8]);
  });

  it('capture: last seed in an empty own hole takes the opposite seeds plus that seed', () => {
    const s = board({ 2: 1, 11: 5, 9: 2 }, 0); // 2 → 3 (empty), opposite of 3 is 11
    const r = applyMove(s, 2);
    expect(r.events).toContainEqual({ type: 'capture', player: 0, pit: 3, opposite: 11, captured: 6, store: S0 });
    expect(r.state.pits[S0]).toBe(6);
    expect(r.state.pits[3]).toBe(0);
    expect(r.state.pits[11]).toBe(0);
    expect(r.state.toMove).toBe(1);
    expect(r.events).toContainEqual({ type: 'turn-end', reason: 'capture', next: 1 });
  });

  it('no capture when the opposite hole is empty: the seed stays, the turn ends', () => {
    const s = board({ 2: 1, 9: 2 }, 0);
    const r = applyMove(s, 2);
    expect(r.events.some((e) => e.type === 'capture')).toBe(false);
    expect(r.state.pits[3]).toBe(1);
    expect(r.state.pits[S0]).toBe(0);
    expect(r.events).toContainEqual({ type: 'turn-end', reason: 'empty-own', next: 1 });
  });

  it("last seed in an empty hole on the opponent's side: the turn ends", () => {
    const s = board({ 6: 2, 10: 1 }, 0); // 7 (store), 8 (empty, opponent's side)
    const r = applyMove(s, 6);
    expect(r.state.pits[8]).toBe(1);
    expect(r.state.toMove).toBe(1);
    expect(r.events.at(-1)).toEqual({ type: 'turn-end', reason: 'empty-opponent', next: 1 });
  });

  it('config switch captureRequiresLap: no capture before passing the own store, capture after it', () => {
    const lap: CongklakRules = { ...DEFAULT_RULES, captureRequiresLap: true };
    const noLap = applyMove(board({ 2: 1, 11: 5, 9: 2 }, 0), 2, lap);
    expect(noLap.summary.captured).toBe(0);
    expect(noLap.state.pits[3]).toBe(1);
    expect(noLap.state.pits[11]).toBe(5);

    // 9 seeds from hole 6: store, 8..14, then hole 0 (empty, own side) after passing the store.
    const passed = applyMove(board({ 6: 9 }, 0), 6, lap);
    expect(passed.summary.captured).toBe(2); // hole 14 (0 + 1 sown) + the last seed
    expect(passed.state.pits[S0]).toBe(3);
    // Default rules capture in both cases.
    expect(applyMove(board({ 2: 1, 11: 5, 9: 2 }, 0), 2).summary.captured).toBe(6);
  });

  it('game end: the player to move has no seeds; the opponent sweeps their own side', () => {
    // Player 0's last seed goes into the store (extra turn), but player 0's side is now empty.
    const s = board({ 6: 1, [S0]: 50, 8: 3, 9: 4, [S1]: 40 }, 0);
    const r = applyMove(s, 6);
    expect(r.state.over).toBe(true);
    expect(r.events).toContainEqual({ type: 'sweep', player: 1, pits: [8, 9], amount: 7, store: S1 });
    expect(r.state.pits[S0]).toBe(51);
    expect(r.state.pits[S1]).toBe(47);
    expect(r.state.winner).toBe(0);
    expect(r.events.at(-1)).toEqual({ type: 'game-over', scores: [51, 47], winner: 0 });
    expect(legalMoves(r.state)).toEqual([]);
  });

  it('game end when the turn passes to a player with an empty side; draw on equal stores', () => {
    // Player 0 sows 6 → store, 8: player 1 gets a seed, so no end. Use player 1's empty side instead:
    const s = board({ 0: 1, 3: 2, [S0]: 45, [S1]: 50 }, 0); // 0 → 1 (empty own, opposite 13 empty)
    const r = applyMove(s, 0);
    expect(r.state.over).toBe(true);
    expect(r.events).toContainEqual({ type: 'sweep', player: 0, pits: [1, 3], amount: 3, store: S0 });
    expect(r.state.pits[S0]).toBe(48);
    expect(r.state.winner).toBe(1);

    const d = applyMove(board({ 0: 1, 3: 2, [S0]: 46, [S1]: 49 }, 0), 0);
    expect(d.state.winner).toBe('draw');
  });

  it('refuses illegal moves', () => {
    const s = board({ 2: 1, 9: 2 }, 0);
    expect(() => applyMove(s, 0)).toThrow(IllegalMoveError); // empty hole
    expect(() => applyMove(s, 7)).toThrow(IllegalMoveError); // not a hole
    expect(() => applyMove(s, -1)).toThrow(IllegalMoveError);
    expect(() => applyMove(s, 1.5)).toThrow(IllegalMoveError);
    expect(() => applyMove({ ...s, over: true, winner: 0 }, 2)).toThrow(IllegalMoveError);
  });

  it('safety limit: a move that would sow more than maxSowPerMove ends the turn, seeds conserved', () => {
    const tiny: CongklakRules = { ...DEFAULT_RULES, maxSowPerMove: 10 };
    const r = applyMove(createInitialState(0), 1, tiny); // 7 sown, then a relay of 8 would exceed 10
    expect(r.summary.safetyLimit).toBe(true);
    expect(r.summary.sown).toBeLessThanOrEqual(10);
    expect(r.events).toContainEqual({ type: 'turn-end', reason: 'safety-limit', next: 1 });
    expect(boardTotal(r.state.pits)).toBe(98);
  });

  it('simulateMove gives the same state as applyMove', () => {
    const s = createInitialState(0);
    for (const h of legalMoves(s)) expect(simulateMove(s, h).state).toEqual(applyMove(s, h).state);
  });

  it('does not change the input state', () => {
    const s = createInitialState(0);
    const before = s.pits.slice();
    applyMove(s, 3);
    expect(s.pits).toEqual(before);
  });
});

describe('congklak random games', () => {
  it('seeds are always 98 after every move (2,000 random games), and every game ends', () => {
    let games = 0;
    let maxSown = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      const { state } = randomGame(seed, (s, sown) => {
        expect(boardTotal(s.pits)).toBe(98);
        if (sown > maxSown) maxSown = sown;
      });
      expect(state.over).toBe(true);
      expect(state.pits[S0] + state.pits[S1]).toBe(98);
      games += 1;
    }
    expect(games).toBe(2000);
    expect(maxSown).toBeLessThan(DEFAULT_RULES.maxSowPerMove);
  });

  it('no game reaches the 10,000-seed safety limit (1,000 random games)', () => {
    let hits = 0;
    let maxSown = 0;
    for (let seed = 10_001; seed <= 11_000; seed++) {
      randomGame(seed, (_s, sown, safety) => {
        if (safety) hits += 1;
        if (sown > maxSown) maxSown = sown;
      });
    }
    expect(hits).toBe(0);
    console.info(`[congklak] longest move in 1,000 random games: ${maxSown} seeds sown`);
  });
});
