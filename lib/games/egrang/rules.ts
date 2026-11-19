/**
 * Egrang rules config (Phase 23). Every GAME rule lives in this ONE file, so a curator can adjust the
 * ruleset without touching the engine, the AI or the UI (the feel of walking, i.e. sway, beat and stride
 * tuning, lives in engine.ts `TUNING`). The "Cara bermain" text (texts.ts) is generated from it, so the
 * sheet always matches the game.
 *
 * Egrang is played in many ways. This file describes ONE simplified digital ruleset, "Aturan dasar": a race
 * against the computer on a short track, in two variants based on the two published archive records,
 * "Egrang Bambu" (Jawa Tengah) and "Egrang Batok" (Sulawesi Selatan). It awaits curator review.
 *
 * No imports: the engine, the tests and the UI all read it.
 */

export interface EgrangVariantRules {
  /** Length of the race track in metres (start line to finish line). */
  trackLength: number;
  /**
   * Bambu: seconds lost by a fall (falling down and climbing back onto the stilts).
   * Batok: seconds lost when a shell slips off the foot ("lepas") and the racer stumbles.
   */
  penaltySeconds: number;
  /** Small stones and puddles on the track that need a well-timed step. */
  obstacles: number;
}

export interface EgrangRules {
  /** Shown in the game ("Aturan dasar"). */
  name: string;
  /** Races per game (best of N; the game plays one race and offers "Main lagi"). */
  races: number;
  /** Countdown before the start signal, seconds. */
  countdownSeconds: number;
  /** A gentle slope (up, then down) somewhere on the track. */
  slope: boolean;
  /**
   * Safety cap: after this many seconds of racing the racer further along wins. With the default
   * tuning an untouched computer finishes long before it.
   */
  timeLimitSeconds: number;
  bambu: EgrangVariantRules;
  batok: EgrangVariantRules;
}

export const ATURAN_DASAR: EgrangRules = {
  name: 'Aturan dasar',
  races: 1,
  countdownSeconds: 3,
  slope: true,
  timeLimitSeconds: 180,
  bambu: { trackLength: 60, penaltySeconds: 1.7, obstacles: 4 },
  batok: { trackLength: 48, penaltySeconds: 0.8, obstacles: 4 },
};

/** The ruleset the game uses. */
export const DEFAULT_RULES: EgrangRules = ATURAN_DASAR;
