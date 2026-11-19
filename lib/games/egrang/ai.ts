/**
 * The egrang computer opponent (Phase 23). It walks with the SAME model and the same information the page
 * shows the player (the balance needle's gold marks for Bambu, the beat for Batok): it plans each step for
 * the ideal moment of the alternate foot, then "executes" it with timing noise per level:
 * - `sigma`: Gaussian timing error (s), smaller on the harder levels;
 * - `bias`: a constant lateness (s);
 * - `lapse`: chance of a hesitation (Bambu: a delay; Batok: a skipped beat);
 * - `wrongFoot`: chance of stepping with the same foot again;
 * - `reaction`: delay before the first step after the start signal or after getting up (s);
 * - `obstacleFocus`: sigma factor on the step over a stone or puddle.
 * Pure and deterministic for a given seed (one generator per controller).
 *
 * `TYPICAL_HUMAN` is the documented model of an average player used by the calibration test
 * (tests/games/egrang-ai.test.ts): the AI_PROFILES are tuned so it wins about 75 % (Mudah), 50 % (Sedang)
 * and 30 % (Sulit) of races, ±10 %, in EACH variant.
 */
import { DT, beatTime, otherFoot, raceTime, timeToIdeal, TUNING, type Controller } from './engine';
import { createRng, gaussian } from './random';
import type { AiLevel, Foot, Variant } from './types';

export interface StepProfile {
  sigma: number;
  bias: number;
  lapse: number;
  /** Bambu hesitation length range (s); Batok skips one beat instead. */
  lapseDelay: readonly [number, number];
  wrongFoot: number;
  reaction: number;
  obstacleFocus: number;
}

/**
 * Average player (assumption, documented): timing spread about ±75 ms (Bambu, watching a needle) and ±55 ms
 * (Batok, hearing a beat), slightly late on average, hesitates on about 1 step in 16 to 20, uses the same
 * foot twice on about 1 step in 50, reacts in about 0.35 to 0.4 s, and is a little more careful on obstacles.
 */
export const TYPICAL_HUMAN: Readonly<Record<Variant, StepProfile>> = {
  bambu: { sigma: 0.075, bias: 0.02, lapse: 0.06, lapseDelay: [0.1, 0.35], wrongFoot: 0.02, reaction: 0.35, obstacleFocus: 0.8 },
  batok: { sigma: 0.055, bias: 0.012, lapse: 0.05, lapseDelay: [0, 0], wrongFoot: 0.02, reaction: 0.4, obstacleFocus: 0.85 },
};

/**
 * Each level is the typical human with its errors (timing spread, lateness, hesitations, wrong feet)
 * scaled by this factor: > 1 = sloppier than the average player (Mudah), < 1 = steadier (Sulit). A race's
 * outcome depends on many steps, so small factors already move the win rate a lot (measured in the
 * calibration test: about 25 points per 0.1 around 1).
 */
export const LEVEL_SCALE: Readonly<Record<Variant, Readonly<Record<AiLevel, number>>>> = {
  bambu: { mudah: 1.15, sedang: 1, sulit: 0.92 },
  batok: { mudah: 1.12, sedang: 1, sulit: 0.92 },
};

export function scaledProfile(p: StepProfile, s: number): StepProfile {
  return { ...p, sigma: p.sigma * s, bias: p.bias * s, lapse: p.lapse * s, wrongFoot: p.wrongFoot * s };
}

export const AI_PROFILES: Readonly<Record<Variant, Readonly<Record<AiLevel, StepProfile>>>> = {
  bambu: {
    mudah: scaledProfile(TYPICAL_HUMAN.bambu, LEVEL_SCALE.bambu.mudah),
    sedang: scaledProfile(TYPICAL_HUMAN.bambu, LEVEL_SCALE.bambu.sedang),
    sulit: scaledProfile(TYPICAL_HUMAN.bambu, LEVEL_SCALE.bambu.sulit),
  },
  batok: {
    mudah: scaledProfile(TYPICAL_HUMAN.batok, LEVEL_SCALE.batok.mudah),
    sedang: scaledProfile(TYPICAL_HUMAN.batok, LEVEL_SCALE.batok.sedang),
    sulit: scaledProfile(TYPICAL_HUMAN.batok, LEVEL_SCALE.batok.sulit),
  },
};

/** Will the racer stand in an obstacle's step zone at its next step? (it barely moves between steps) */
function obstacleAhead(x: number, obstacles: readonly { x: number }[], next: number): boolean {
  const o = obstacles[next];
  return !!o && x >= o.x - TUNING.obstacle.before - 0.6 && x <= o.x + TUNING.obstacle.after;
}

/** A controller that steps like `profile` (the computer, or the test "human"). Seeded, deterministic. */
export function createStepper(profile: StepProfile, seed: number): Controller {
  const rng = createRng(seed);
  let plannedAt: number | null = null;
  let plannedFoot: Foot = 'L';

  const plan = (w: Parameters<Controller>[0], side: 0 | 1) => {
    const r = w.racers[side];
    const now = Math.max(raceTime(w), 0);
    const focus = obstacleAhead(r.x + r.stride, w.track.obstacles, r.nextObstacle) ? profile.obstacleFocus : 1;
    const noise = profile.bias + profile.sigma * focus * gaussian(rng);
    if (r.lastFoot === null) {
      plannedFoot = rng() < 0.5 ? 'L' : 'R';
      const ready = now + profile.reaction * (0.7 + 0.6 * rng());
      if (w.variant === 'bambu') plannedAt = ready;
      else {
        const k = Math.max(r.lastBeat + 1, Math.ceil(ready / TUNING.batok.beat));
        plannedAt = beatTime(k) + noise;
      }
    } else {
      const intended = otherFoot(r.lastFoot);
      plannedFoot = rng() < profile.wrongFoot ? r.lastFoot : intended;
      const lapse = rng() < profile.lapse;
      if (w.variant === 'bambu') {
        let ideal = timeToIdeal(r, intended);
        // Right after a step the alternate foot's ideal is about half a swing away; a value near a full
        // swing means the ideal moment just passed: step now-ish instead of waiting a whole swing.
        if (ideal > TUNING.bambu.swayPeriod * 0.8) ideal -= TUNING.bambu.swayPeriod;
        const [lo, hi] = profile.lapseDelay;
        plannedAt = now + ideal + noise + (lapse ? lo + (hi - lo) * rng() : 0);
      } else {
        plannedAt = beatTime(r.lastBeat + 1 + (lapse ? 1 : 0)) + noise;
      }
    }
    plannedAt = Math.max(plannedAt, now + DT);
  };

  return (w, side) => {
    const r = w.racers[side];
    if (w.result || r.phase !== 'walking') {
      plannedAt = null;
      return null;
    }
    const next = raceTime(w) + DT;
    if (next < 0) return null;
    if (plannedAt === null) plan(w, side);
    if (next >= plannedAt! - DT / 2) {
      plannedAt = null;
      return plannedFoot;
    }
    return null;
  };
}

/** The computer opponent for a level. */
export function createAi(variant: Variant, level: AiLevel, seed: number): Controller {
  return createStepper(AI_PROFILES[variant][level], seed);
}
