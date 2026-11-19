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
 * the same code without events. The code itself is `runMove` in core.ts (shared with the AI worker).
 */
import { core } from './core';
import { DEFAULT_RULES, type CongklakRules } from './rules';
import { isLegalMove, type CongklakState, type Player, type Winner } from './state';

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

/** Plays `hole` (0 .. n-1 of the player to move). Throws `IllegalMoveError` for an illegal move. */
export function applyMove(state: CongklakState, hole: number, rules: CongklakRules = DEFAULT_RULES): MoveResult {
  if (!isLegalMove(state, hole, rules)) throw new IllegalMoveError(hole);
  const events: MoveEvent[] = [];
  const { state: next, summary } = core.runMove(state, hole, rules, events);
  return { state: next, events, summary };
}

/** `applyMove` without the events (the AI's search). */
export function simulateMove(
  state: CongklakState,
  hole: number,
  rules: CongklakRules = DEFAULT_RULES,
): { state: CongklakState; summary: MoveSummary } {
  if (!isLegalMove(state, hole, rules)) throw new IllegalMoveError(hole);
  return core.runMove(state, hole, rules, null);
}
