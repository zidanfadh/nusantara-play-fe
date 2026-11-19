/**
 * Congklak board model (Phase 17). Pure TypeScript, no React, no DOM.
 *
 * The board is one ring of `2n + 2` pits (n = holes per side, 7):
 *
 *   index 0 .. n-1        player 0's small holes (left to right, seen from player 0)
 *   index n               player 0's store (lumbung), at player 0's right
 *   index n+1 .. 2n       player 1's small holes (continuing round the ring)
 *   index 2n+1            player 1's store
 *
 * Sowing always goes to the next index (wrapping), which is anticlockwise as seen by either player and
 * leads towards the mover's own store. The hole opposite index i is 2n - i.
 */
import { core } from './core';
import { DEFAULT_RULES, type CongklakRules } from './rules';

export type Player = 0 | 1;
export type Winner = Player | 'draw';

export interface CongklakState {
  /** Seeds per pit, ring order (see the file comment). */
  readonly pits: readonly number[];
  /** Whose turn it is (meaningless once `over`). */
  readonly toMove: Player;
  readonly over: boolean;
  /** Set when `over`. */
  readonly winner: Winner | null;
}

export const other = (p: Player): Player => core.other(p);

export function pitCount(rules: CongklakRules = DEFAULT_RULES): number {
  return core.pitCount(rules);
}

export function storeIndex(player: Player, rules: CongklakRules = DEFAULT_RULES): number {
  return core.storeIndex(player, rules);
}

/** Ring index of a player's small hole `hole` (0 .. n-1, in sowing order). */
export function holeIndex(player: Player, hole: number, rules: CongklakRules = DEFAULT_RULES): number {
  return core.holeIndex(player, hole, rules);
}

export function isStore(pit: number, rules: CongklakRules = DEFAULT_RULES): boolean {
  return core.isStore(pit, rules);
}

/** The player a pit belongs to (stores included). */
export function ownerOf(pit: number, rules: CongklakRules = DEFAULT_RULES): Player {
  return core.ownerOf(pit, rules);
}

/** The small hole across the board from a small hole. */
export function oppositeOf(pit: number, rules: CongklakRules = DEFAULT_RULES): number {
  return core.oppositeOf(pit, rules);
}

/** `{ player, hole }` of a small hole's ring index (null for a store). */
export function holeOf(pit: number, rules: CongklakRules = DEFAULT_RULES): { player: Player; hole: number } | null {
  if (isStore(pit, rules)) return null;
  const player = ownerOf(pit, rules);
  return { player, hole: player === 0 ? pit : pit - rules.holesPerSide - 1 };
}

export function createInitialState(starting: Player = 0, rules: CongklakRules = DEFAULT_RULES): CongklakState {
  return core.createInitialState(starting, rules);
}

/** Seeds in a player's small holes. */
export function seedsOnSide(pits: readonly number[], player: Player, rules: CongklakRules = DEFAULT_RULES): number {
  return core.seedsOnSide(pits, player, rules);
}

/** Holes (0 .. n-1) the player to move may play: their own non-empty small holes. Empty once the game is over. */
export function legalMoves(state: CongklakState, rules: CongklakRules = DEFAULT_RULES): number[] {
  return core.legalMoves(state, rules);
}

export function isLegalMove(state: CongklakState, hole: number, rules: CongklakRules = DEFAULT_RULES): boolean {
  return core.isLegalMove(state, hole, rules);
}

export function scores(state: CongklakState, rules: CongklakRules = DEFAULT_RULES): [number, number] {
  return [state.pits[storeIndex(0, rules)], state.pits[storeIndex(1, rules)]];
}

export function boardTotal(pits: readonly number[]): number {
  let sum = 0;
  for (const v of pits) sum += v;
  return sum;
}
