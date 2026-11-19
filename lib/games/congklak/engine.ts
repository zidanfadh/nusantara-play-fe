/**
 * Congklak move engine (Phase 17), ruleset "Aturan dasar" (see rules.ts). Pure, no React, no DOM; used by
 * the page, the AI (also inside the Web Worker) and the tests.
 *
 * A move: the player picks up every seed of one of their own non-empty small holes and sows them one by
 * one round the ring (into their own store, skipping the opponent's store). Where the last seed lands:
 * - own store → the same player moves again;
 * - a small hole that already had seeds (either side) → pick them all up and keep sowing (relay);
 * - an empty small hole on the player's own side → capture the opposite hole's seeds plus that last seed
 *   into the store when the opposite hole has seeds (and, with `captureRequiresLap`, only after the player
 *   passed their own store during this move); the turn ends either way;
 * - an empty small hole on the opponent's side → the turn ends.
 * When the player whose turn it is next has no seeds in their small holes, the game ends: the opponent
 * moves every seed left on their own side into their own store; more seeds in the store wins.
 *
 * `applyMove` returns the new state and the ordered animation events; the AI calls `simulateMove`, which is
 * the same code without events.
 */
import { DEFAULT_RULES, type CongklakRules } from './rules';
import {
  holeIndex,
  isLegalMove,
  oppositeOf,
  other,
  ownerOf,
  pitCount,
  seedsOnSide,
  storeIndex,
  type CongklakState,
  type Player,
  type Winner,
} from './state';

export type TurnEndReason = 'capture' | 'empty-own' | 'empty-opponent' | 'safety-limit';

export type MoveEvent =
  /** The move starts: every seed of `pit` goes into the hand. */
  | { type: 'pickup'; player: Player; pit: number; count: number }
  /** One seed into `pit`; `count` = seeds there now, `hand` = seeds still in the hand. */
  | { type: 'sow'; pit: number; count: number; hand: number }
  /** The last seed landed in a non-empty small hole: all `count` seeds are picked up again. */
  | { type: 'relay'; pit: number; count: number }
  /** `captured` seeds (the opposite hole + the last seed) go into `store`. */
  | { type: 'capture'; player: Player; pit: number; opposite: number; captured: number; store: number }
  /** The last seed landed in the player's own store. */
  | { type: 'extra-turn'; player: Player }
  | { type: 'turn-end'; reason: TurnEndReason; next: Player }
  /** End of game: the opponent's remaining seeds go into their own store. */
  | { type: 'sweep'; player: Player; pits: number[]; amount: number; store: number }
  | { type: 'game-over'; scores: [number, number]; winner: Winner };

export interface MoveSummary {
  player: Player;
  /** Seeds sown during the move (relays included). */
  sown: number;
  relays: number;
  captured: number;
  extraTurn: boolean;
  /** The 10,000-seed safety limit ended the turn (never happens in normal play). */
  safetyLimit: boolean;
  /** Ring index where the last seed landed. */
  lastPit: number;
}

export interface MoveResult {
  state: CongklakState;
  events: MoveEvent[];
  summary: MoveSummary;
}

export class IllegalMoveError extends Error {
  constructor(hole: number) {
    super(`Illegal congklak move: hole ${hole}`);
    this.name = 'IllegalMoveError';
  }
}

function isDevelopment(): boolean {
  try {
    return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

function run(
  state: CongklakState,
  hole: number,
  rules: CongklakRules,
  events: MoveEvent[] | null,
): { state: CongklakState; summary: MoveSummary } {
  if (!isLegalMove(state, hole, rules)) throw new IllegalMoveError(hole);
  const len = pitCount(rules);
  const pits = state.pits.slice();
  const player = state.toMove;
  const ownStore = storeIndex(player, rules);
  const oppStore = storeIndex(other(player), rules);

  let pos = holeIndex(player, hole, rules);
  let hand = pits[pos];
  pits[pos] = 0;
  events?.push({ type: 'pickup', player, pit: pos, count: hand });

  let sown = 0;
  let relays = 0;
  let captured = 0;
  let passedStore = false;
  let extraTurn = false;
  let safetyLimit = false;
  let reason: TurnEndReason = 'empty-opponent';

  for (;;) {
    while (hand > 0) {
      pos = (pos + 1) % len;
      if (pos === oppStore) pos = (pos + 1) % len;
      pits[pos] += 1;
      hand -= 1;
      sown += 1;
      if (pos === ownStore) passedStore = true;
      events?.push({ type: 'sow', pit: pos, count: pits[pos], hand });
    }

    if (pos === ownStore) {
      extraTurn = true;
      break;
    }
    if (pits[pos] > 1) {
      // Relay sowing. A hand never holds more than the board's seeds, so checking before the pickup keeps
      // the move at or below the limit.
      if (sown + pits[pos] > rules.maxSowPerMove) {
        safetyLimit = true;
        reason = 'safety-limit';
        if (isDevelopment()) console.warn(`[congklak] safety limit reached after ${sown} seeds; the turn ends`);
        break;
      }
      hand = pits[pos];
      pits[pos] = 0;
      relays += 1;
      events?.push({ type: 'relay', pit: pos, count: hand });
      continue;
    }
    // The last seed landed in an empty small hole.
    if (ownerOf(pos, rules) === player) {
      const opposite = oppositeOf(pos, rules);
      if (pits[opposite] > 0 && (!rules.captureRequiresLap || passedStore)) {
        captured = pits[opposite] + 1;
        pits[ownStore] += captured;
        pits[opposite] = 0;
        pits[pos] = 0;
        events?.push({ type: 'capture', player, pit: pos, opposite, captured, store: ownStore });
        reason = 'capture';
      } else {
        reason = 'empty-own';
      }
    } else {
      reason = 'empty-opponent';
    }
    break;
  }

  let next: Player = player;
  if (extraTurn) events?.push({ type: 'extra-turn', player });
  else {
    next = other(player);
    events?.push({ type: 'turn-end', reason, next });
  }

  const summary: MoveSummary = { player, sown, relays, captured, extraTurn, safetyLimit, lastPit: pos };

  // Game end: the player whose turn it is has no seeds in their small holes.
  if (seedsOnSide(pits, next, rules) === 0) {
    const sweeper = other(next);
    const store = storeIndex(sweeper, rules);
    const swept: number[] = [];
    let amount = 0;
    for (let h = 0; h < rules.holesPerSide; h++) {
      const i = holeIndex(sweeper, h, rules);
      if (pits[i] > 0) {
        swept.push(i);
        amount += pits[i];
        pits[i] = 0;
      }
    }
    pits[store] += amount;
    events?.push({ type: 'sweep', player: sweeper, pits: swept, amount, store });
    const final: [number, number] = [pits[storeIndex(0, rules)], pits[storeIndex(1, rules)]];
    const winner: Winner = final[0] === final[1] ? 'draw' : final[0] > final[1] ? 0 : 1;
    events?.push({ type: 'game-over', scores: final, winner });
    return { state: { pits, toMove: next, over: true, winner }, summary };
  }

  return { state: { pits, toMove: next, over: false, winner: null }, summary };
}

/** Plays `hole` (0 .. n-1 of the player to move). Throws `IllegalMoveError` for an illegal move. */
export function applyMove(state: CongklakState, hole: number, rules: CongklakRules = DEFAULT_RULES): MoveResult {
  const events: MoveEvent[] = [];
  const { state: next, summary } = run(state, hole, rules, events);
  return { state: next, events, summary };
}

/** `applyMove` without the events (the AI's search). */
export function simulateMove(
  state: CongklakState,
  hole: number,
  rules: CongklakRules = DEFAULT_RULES,
): { state: CongklakState; summary: MoveSummary } {
  return run(state, hole, rules, null);
}
