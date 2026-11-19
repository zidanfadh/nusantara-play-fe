/**
 * Gasing rules config (Phase 20). Every GAME rule lives in this ONE file, so a curator can adjust the
 * ruleset without touching the engine, the AI or the UI (physics tuning lives in physics.ts). The "Cara
 * bermain" text (texts.ts) is generated from it, so the sheet always matches the game.
 *
 * Gasing is played in many ways in different regions. This file describes ONE simplified digital ruleset,
 * "Aturan dasar", based on the two ways the published archive record describes (Gasing Uri and Gasing
 * Pangkah, Kepulauan Riau). It awaits curator review.
 *
 * No imports: the engine, the tests and the UI all read it.
 */

export interface GasingRules {
  /** Shown in the game ("Aturan dasar"). */
  name: string;
  /** Rounds a side must win to win the match (2 = best of 3). */
  roundsToWin: number;
  /** Safety cap: a drawn round is replayed, but never more than this many rounds in total. */
  maxRounds: number;
  /** Radius of the arena ring (arena units; everything else is relative to it). */
  arenaRadius: number;
  /** A top whose centre leaves the ring is out ("keluar arena") and loses the round. */
  outIsLoss: boolean;
}

export const ATURAN_DASAR: GasingRules = {
  name: 'Aturan dasar',
  roundsToWin: 2,
  maxRounds: 5,
  arenaRadius: 1,
  outIsLoss: true,
};

/** The ruleset the game uses. */
export const DEFAULT_RULES: GasingRules = ATURAN_DASAR;

/** Best of N, for the texts ("terbaik dari 3"). */
export function bestOf(rules: GasingRules): number {
  return rules.roundsToWin * 2 - 1;
}
