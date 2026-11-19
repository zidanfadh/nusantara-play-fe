/**
 * The gasing computer opponent (Phase 20). It uses the same throw model as the player: it plans a throw
 * (where to land), then "executes" it with noise per level:
 * - Mudah: large aim and power noise, poor release;
 * - Sedang: moderate noise and release;
 * - Sulit: small noise, good release, and as the Pangkah striker it samples SULIT_SAMPLES candidate throws
 *   with the headless simulator and keeps the best (a few ms; see the tests).
 * Pure and deterministic for a given generator; the page seeds it from the match.
 *
 * The plans are also used by the "typical human" model of the calibration tests (`humanThrow`), so both
 * sides aim with the same information the page shows the player (the landing marker).
 */
import { decideRound } from './outcome';
import { PHYSICS, forwardAngle, normalizeThrow, powerForDistance, simulate, throwOrigin } from './physics';
import { gaussian, type Rng } from './random';
import { DEFAULT_RULES, type GasingRules } from './rules';
import type { AiLevel, Side, Throw, World } from './types';

/** What the throw is for: Uri (spin long), the Pangkah target (spin long, first) or the Pangkah striker. */
export type ThrowRole = 'uri' | 'target' | 'striker';

export interface ThrowProfile {
  /** Gaussian noise of the aim (radians) and of the power. */
  angleSigma: number;
  powerSigma: number;
  /** Release quality, uniform in [min, max]. */
  qualityMin: number;
  qualityMax: number;
  /** Chance of a perfect release. */
  perfectChance: number;
  /** Candidate throws simulated by the Pangkah striker (0 = just the plan). */
  samples: number;
}

export const AI_PROFILES: Readonly<Record<AiLevel, ThrowProfile>> = {
  mudah: { angleSigma: 0.12, powerSigma: 0.12, qualityMin: 0.5, qualityMax: 0.85, perfectChance: 0.05, samples: 0 },
  sedang: { angleSigma: 0.07, powerSigma: 0.075, qualityMin: 0.5, qualityMax: 0.9, perfectChance: 0.3, samples: 0 },
  sulit: { angleSigma: 0.035, powerSigma: 0.04, qualityMin: 0.7, qualityMax: 0.95, perfectChance: 0.42, samples: 12 },
};

/**
 * The "typical human" of the calibration tests (documented in the Phase 20 report): aims at the same plan
 * as the AI (the page shows where the top will land), with about ±3° aim error, ±0.06 power error, a fairly
 * steady release, and a perfect release one time in three.
 */
export const TYPICAL_HUMAN: ThrowProfile = {
  angleSigma: 0.05,
  powerSigma: 0.06,
  qualityMin: 0.5,
  qualityMax: 0.92,
  perfectChance: 0.33,
  samples: 0,
};

export const SULIT_HORIZON_STEPS = 300;

/** Where a spinning top should land to end up near `rest` (it slides on along the throw). */
function throwToward(side: Side, x: number, y: number, rules: GasingRules): { angle: number; power: number } {
  const o = throwOrigin(side, rules);
  return { angle: Math.atan2(y - o.y, x - o.x), power: powerForDistance(Math.hypot(x - o.x, y - o.y), rules) };
}

/** Plan for a long spin: land a little short of the centre, away from a top already in the arena. */
export function planSpin(world: World, side: Side, rules: GasingRules = DEFAULT_RULES): { angle: number; power: number } {
  const R = rules.arenaRadius;
  const other = world.tops[side === 0 ? 1 : 0];
  let rx = 0;
  let ry = 0;
  if (other.phase === 'spinning' || other.phase === 'flying') {
    const d = Math.hypot(other.x, other.y);
    // Rest on the far side of the centre from the other top, or beside it when it sits in the middle.
    const ux = d > 0.05 * R ? -other.x / d : side === 0 ? -1 : 1;
    const uy = d > 0.05 * R ? -other.y / d : 0;
    rx = ux * 0.32 * R;
    ry = uy * 0.32 * R;
  }
  // The slide carries the top about 0.2 R further along the throw: land that much short.
  const short = 0.2 * R;
  const f = forwardAngle(side);
  return throwToward(side, rx - Math.cos(f) * short, ry - Math.sin(f) * short, rules);
}

/** Plan for a strike: land on the other top where it will be when the throw lands. */
export function planStrike(world: World, side: Side, rules: GasingRules = DEFAULT_RULES): { angle: number; power: number } {
  const other = world.tops[side === 0 ? 1 : 0];
  if (other.phase !== 'spinning') return planSpin(world, side, rules);
  let plan = throwToward(side, other.x, other.y, rules);
  // One refinement for the target's drift during the flight.
  const flight = PHYSICS.flightBase + PHYSICS.flightPower * plan.power;
  plan = throwToward(side, other.x + other.vx * flight, other.y + other.vy * flight, rules);
  return plan;
}

export function plan(world: World, side: Side, role: ThrowRole, rules: GasingRules = DEFAULT_RULES): { angle: number; power: number } {
  return role === 'striker' ? planStrike(world, side, rules) : planSpin(world, side, rules);
}

/** A planned throw executed with a profile's noise. */
export function execute(side: Side, p: { angle: number; power: number }, profile: ThrowProfile, rng: Rng): Throw {
  const perfect = rng() < profile.perfectChance;
  const q = profile.qualityMin + (profile.qualityMax - profile.qualityMin) * rng();
  return normalizeThrow(side, {
    angle: p.angle + gaussian(rng) * profile.angleSigma,
    power: p.power + gaussian(rng) * profile.powerSigma,
    quality: perfect ? Math.max(q, 0.9) : q,
    perfect,
  });
}

/** Score of a striker candidate after a short simulation (higher is better for `side`). */
function strikeScore(world: World, side: Side, rules: GasingRules): number {
  const result = decideRound(world, true, rules);
  if (result) return result.winner === side ? 100 : result.winner === 'draw' ? 0 : -100;
  const me = world.tops[side];
  const them = world.tops[side === 0 ? 1 : 0];
  const R = rules.arenaRadius;
  const edge = (t: typeof me) => Math.hypot(t.x, t.y) / R;
  // More spin and less tilt than the target, the target near the edge, me away from it.
  return (
    (Math.abs(me.spin) - Math.abs(them.spin)) / 20 +
    (them.tilt - me.tilt) * 8 +
    edge(them) * 3 -
    edge(me) * 3
  );
}

/**
 * The computer's throw. For the Sulit striker: SULIT samples around the plan (aim ± 0.06 rad, power ± 0.06),
 * each simulated SULIT_HORIZON_STEPS steps with the profile's typical release; the best candidate is then
 * executed with the profile's (small) noise.
 */
export function chooseAiThrow(
  world: World,
  side: Side,
  role: ThrowRole,
  level: AiLevel,
  rng: Rng,
  rules: GasingRules = DEFAULT_RULES,
): Throw {
  const profile = AI_PROFILES[level];
  let best = plan(world, side, role, rules);
  if (role === 'striker' && profile.samples > 0 && world.tops[side === 0 ? 1 : 0].phase === 'spinning') {
    const quality = (profile.qualityMin + profile.qualityMax) / 2;
    let bestScore = Number.NEGATIVE_INFINITY;
    const base = best;
    for (let i = 0; i <= profile.samples; i++) {
      const cand = i === 0 ? base : { angle: base.angle + (rng() - 0.5) * 0.12, power: base.power + (rng() - 0.5) * 0.12 };
      const t = normalizeThrow(side, { ...cand, quality, perfect: false });
      const r = simulate(world, [{ atStep: 0, side, throw: t }], SULIT_HORIZON_STEPS, { rules, collectEvents: false });
      const score = strikeScore(r.world, side, rules);
      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }
  }
  return execute(side, best, profile, rng);
}

/** The calibration tests' typical human (same plans, TYPICAL_HUMAN noise). */
export function humanThrow(world: World, side: Side, role: ThrowRole, rng: Rng, rules: GasingRules = DEFAULT_RULES): Throw {
  return execute(side, plan(world, side, role, rules), TYPICAL_HUMAN, rng);
}
