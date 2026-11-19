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

export const other = (p: Player): Player => (p === 0 ? 1 : 0);

export function pitCount(rules: CongklakRules = DEFAULT_RULES): number {
  return 2 * rules.holesPerSide + 2;
}

export function storeIndex(player: Player, rules: CongklakRules = DEFAULT_RULES): number {
  return player === 0 ? rules.holesPerSide : 2 * rules.holesPerSide + 1;
}

/** Ring index of a player's small hole `hole` (0 .. n-1, in sowing order). */
export function holeIndex(player: Player, hole: number, rules: CongklakRules = DEFAULT_RULES): number {
  return player === 0 ? hole : rules.holesPerSide + 1 + hole;
}

export function isStore(pit: number, rules: CongklakRules = DEFAULT_RULES): boolean {
  return pit === rules.holesPerSide || pit === 2 * rules.holesPerSide + 1;
}

/** The player a pit belongs to (stores included). */
export function ownerOf(pit: number, rules: CongklakRules = DEFAULT_RULES): Player {
  return pit <= rules.holesPerSide ? 0 : 1;
}

/** The small hole across the board from a small hole. */
export function oppositeOf(pit: number, rules: CongklakRules = DEFAULT_RULES): number {
  return 2 * rules.holesPerSide - pit;
}

/** `{ player, hole }` of a small hole's ring index (null for a store). */
export function holeOf(pit: number, rules: CongklakRules = DEFAULT_RULES): { player: Player; hole: number } | null {
  if (isStore(pit, rules)) return null;
  const player = ownerOf(pit, rules);
  return { player, hole: player === 0 ? pit : pit - rules.holesPerSide - 1 };
}

export function createInitialState(starting: Player = 0, rules: CongklakRules = DEFAULT_RULES): CongklakState {
  const pits = new Array<number>(pitCount(rules)).fill(rules.seedsPerHole);
  pits[storeIndex(0, rules)] = 0;
  pits[storeIndex(1, rules)] = 0;
  return { pits, toMove: starting, over: false, winner: null };
}

/** Seeds in a player's small holes. */
export function seedsOnSide(pits: readonly number[], player: Player, rules: CongklakRules = DEFAULT_RULES): number {
  let sum = 0;
  for (let h = 0; h < rules.holesPerSide; h++) sum += pits[holeIndex(player, h, rules)];
  return sum;
}

/** Holes (0 .. n-1) the player to move may play: their own non-empty small holes. Empty once the game is over. */
export function legalMoves(state: CongklakState, rules: CongklakRules = DEFAULT_RULES): number[] {
  if (state.over) return [];
  const out: number[] = [];
  for (let h = 0; h < rules.holesPerSide; h++) if (state.pits[holeIndex(state.toMove, h, rules)] > 0) out.push(h);
  return out;
}

export function isLegalMove(state: CongklakState, hole: number, rules: CongklakRules = DEFAULT_RULES): boolean {
  return (
    !state.over &&
    Number.isInteger(hole) &&
    hole >= 0 &&
    hole < rules.holesPerSide &&
    state.pits[holeIndex(state.toMove, hole, rules)] > 0
  );
}

export function scores(state: CongklakState, rules: CongklakRules = DEFAULT_RULES): [number, number] {
  return [state.pits[storeIndex(0, rules)], state.pits[storeIndex(1, rules)]];
}

export function boardTotal(pits: readonly number[]): number {
  let sum = 0;
  for (const v of pits) sum += v;
  return sum;
}
