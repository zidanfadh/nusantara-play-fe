/**
 * Congklak rules config (Phase 17). Every rule switch of the game lives in this ONE file, so a curator can
 * adjust the ruleset later without touching the engine, the AI or the UI.
 *
 * Congklak is played with different rules in different regions. This file describes ONE common ruleset,
 * "Aturan dasar"; the "Cara bermain" sheet explains exactly this ruleset and says that other versions exist.
 *
 * No imports: the engine, the Web Worker and the tests all read it.
 */

export interface CongklakRules {
  /** Shown in the game ("Aturan dasar"). */
  name: string;
  /** Small holes per player (one row each). */
  holesPerSide: number;
  /** Seeds in every small hole at the start; the stores start empty. */
  seedsPerHole: number;
  /**
   * Capture switch: when true, a capture only happens after the player has sown at least one seed into
   * their own store during the current move (relays included). Default false: capture at any time.
   */
  captureRequiresLap: boolean;
  /**
   * Safety limit: one move sows at most this many seeds; when it is reached the turn ends. Normal play
   * never gets near it (tested over 1,000 random games).
   */
  maxSowPerMove: number;
}

export const ATURAN_DASAR: CongklakRules = {
  name: 'Aturan dasar',
  holesPerSide: 7,
  seedsPerHole: 7,
  captureRequiresLap: false,
  maxSowPerMove: 10_000,
};

/** The ruleset the game uses. */
export const DEFAULT_RULES: CongklakRules = ATURAN_DASAR;

/** Total seeds on the board (98 with 7 holes of 7). Conserved by every move. */
export function totalSeeds(rules: CongklakRules): number {
  return 2 * rules.holesPerSide * rules.seedsPerHole;
}
