/**
 * The egrang race engine (Phase 23): pure and deterministic. Fixed step 1/120 s, a seeded track, no
 * Date / Math.random / DOM. The page, the AI, the calibration tests and the offline sound render all run
 * this same code; `simulate` and `playRace` are the headless runners.
 *
 * Both variants share the race (track, countdown, strides, obstacles, slope, finish detection, result) and
 * the input (`stepWorld(world, inputs)`: one call per fixed step with the steps taken during it). They
 * differ only in how a step is judged (`judgeBambu` / `judgeBatok`):
 *
 * - **Bambu** (tall bamboo stilts): the body sways like an inverted pendulum, `tilt = amp · sin(phase)`.
 *   The phase runs at a fixed rate (`swayPeriod`), the amplitude grows by itself while walking. A step with
 *   the right foot at its ideal moment (left foot when the needle is at the left, `tilt` = −amp; right foot
 *   at the right) gives a long step, pulls the phase toward the ideal and settles the amplitude; a badly
 *   timed step or the same foot twice kicks the amplitude up. |tilt| ≥ 1 → fall: no progress for
 *   `penaltySeconds` (tipping over, then climbing back up), then the walk starts again.
 * - **Batok** (coconut-shell stilts): a gentle beat (`beat` s, the kendang). Each step must land within
 *   `goodWindow` of a beat, one step per beat, feet alternating; otherwise the shell slips off ("lepas"):
 *   no progress for `penaltySeconds`. Shorter, faster steps; never a fall.
 *
 * The first step after the start (or after a fall / slip) may be either foot. Bambu: it starts the sway
 * on that foot's ideal moment; Batok: it still has to hit a beat.
 */
import { mulberry32Step } from './random';
import { DEFAULT_RULES, type EgrangRules } from './rules';
import type { Foot, ObstacleKind, RaceEvent, RaceResult, RacerState, ScheduledStep, Side, Track, Variant, World } from './types';

export const STEP_HZ = 120;
export const DT = 1 / STEP_HZ;

/** The feel of walking (not a game rule; the rules are in rules.ts). */
export const TUNING = {
  /** Time constant of the body gliding over the stride after a step (s). */
  glideTau: 0.11,
  /** Seconds the second racer gets after the first finisher before the race ends (end screen shows both times). */
  graceSeconds: 3,
  bambu: {
    /** A full left–right–left swing (s); the ideal steps are half of it apart. */
    swayPeriod: 1.0,
    /** Amplitude good steps settle the sway to (the needle reaches the gold marks). */
    restAmp: 0.42,
    /** Amplitude while standing before the first step (idle sway). */
    standAmp: 0.14,
    /** Growth of the amplitude per second while walking (the stilts are unstable). */
    growth: 0.16,
    /** Phase error (rad) where a step's quality reaches 0, and the "perfect" window (≈ ±45 ms). */
    timingWindow: 1.25,
    perfectWindow: 0.29,
    /** Amplitude added by a step of quality 0; extra for the same foot twice. */
    kickBad: 0.22,
    sameFootKick: 0.2,
    /** Fraction of (amp − restAmp) removed by a step of quality 1. */
    settle: 0.7,
    /** How far a step pulls the sway phase toward that foot's ideal (fraction of the error). */
    phaseNudge: 0.5,
    /** Quality of the first step of a walk (any foot, any time). */
    firstQuality: 0.85,
    /** Obstacle step: below this quality it adds `obstacleKick` ("Goyah!"). */
    obstacleMinQuality: 0.7,
    obstacleKick: 0.32,
    /** Stride (m) at quality 1, the fraction of it at quality 0, and the perfect bonus. */
    stride: 1.0,
    strideMin: 0.45,
    perfectBonus: 1.12,
    /** Share of the penalty spent tipping over; the rest is climbing back up. */
    fallShare: 0.35,
  },
  batok: {
    /** Beat period (s): the kendang pulse and the step rhythm (≈ 143 bpm). */
    beat: 0.42,
    /** A step farther than this from its beat slips (s); the perfect window; the obstacle window. */
    goodWindow: 0.13,
    perfectWindow: 0.045,
    obstacleWindow: 0.075,
    stride: 0.62,
    strideMin: 0.72,
    perfectBonus: 1.12,
  },
  slope: {
    /** Hill height (m) and half-width as a fraction of the track. */
    height: 1.4,
    halfWidthShare: 0.16,
    /** Stride factor per unit of grade: uphill shorter, downhill a little longer. */
    uphill: 0.8,
    downhill: 0.35,
  },
  obstacle: {
    /** A step taken within this zone around an obstacle is the step over it (m before / after its centre). */
    before: 0.5,
    after: 0.7,
  },
} as const;

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Wraps an angle into (−π, π]. */
export function wrapAngle(a: number): number {
  let r = a % TAU;
  if (r <= -Math.PI) r += TAU;
  else if (r > Math.PI) r -= TAU;
  return r;
}

export const otherFoot = (f: Foot): Foot => (f === 'L' ? 'R' : 'L');

// ---- track ------------------------------------------------------------------------------------------

/** A seeded track: obstacles and the hill. Both racers run the same one. */
export function createTrack(variant: Variant, seed: number, rules: EgrangRules = DEFAULT_RULES): Track {
  let state = seed | 0;
  const rnd = () => {
    const [v, next] = mulberry32Step(state);
    state = next;
    return v;
  };
  const length = rules[variant].trackLength;
  const count = rules[variant].obstacles;
  // Obstacles spread over 15 % … 90 % of the track, one per equal slot, jittered inside the slot.
  const obstacles: Track['obstacles'] = [];
  const from = 0.15 * length;
  const span = 0.75 * length;
  for (let i = 0; i < count; i += 1) {
    const slot = span / count;
    const x = from + slot * i + slot * (0.25 + 0.5 * rnd());
    const kind: ObstacleKind = rnd() < 0.5 ? 'batu' : 'genangan';
    obstacles.push({ kind, x: Math.round(x * 100) / 100 });
  }
  const halfWidth = TUNING.slope.halfWidthShare * length;
  const hill = rules.slope
    ? { x: Math.round((0.38 + 0.24 * rnd()) * length * 100) / 100, halfWidth, height: TUNING.slope.height }
    : { x: length / 2, halfWidth, height: 0 };
  return { variant, length, obstacles, hill };
}

/** Ground height at `x` (m): a smooth cosine hill, 0 elsewhere. */
export function heightAt(track: Track, x: number): number {
  const { hill } = track;
  const d = x - hill.x;
  if (hill.height === 0 || Math.abs(d) >= hill.halfWidth) return 0;
  return (hill.height * (1 + Math.cos((Math.PI * d) / hill.halfWidth))) / 2;
}

/** Grade (dh/dx) at `x`: positive uphill. */
export function gradeAt(track: Track, x: number): number {
  const { hill } = track;
  const d = x - hill.x;
  if (hill.height === 0 || Math.abs(d) >= hill.halfWidth) return 0;
  return (-hill.height * Math.PI * Math.sin((Math.PI * d) / hill.halfWidth)) / (2 * hill.halfWidth);
}

/** Stride factor of the slope at `x`: < 1 uphill, a little > 1 downhill. */
export function slopeFactor(track: Track, x: number): number {
  const g = gradeAt(track, x);
  return g > 0 ? clamp(1 - TUNING.slope.uphill * g, 0.5, 1) : 1 + TUNING.slope.downhill * -g;
}

// ---- world ------------------------------------------------------------------------------------------

function newRacer(side: Side): RacerState {
  return {
    side,
    x: 0,
    stride: 0,
    phase: 'walking',
    phaseLeft: 0,
    lastFoot: null,
    lastStepT: -1,
    lastQuality: 0,
    swayPhase: side === 0 ? 0 : Math.PI * 0.7,
    swayAmp: TUNING.bambu.standAmp,
    lastBeat: 0,
    nextObstacle: 0,
    finishT: null,
    stats: { steps: 0, perfect: 0, falls: 0, slips: 0, obstaclesOk: 0, obstaclesMissed: 0 },
  };
}

export function createWorld(variant: Variant, seed: number, rules: EgrangRules = DEFAULT_RULES): World {
  return {
    variant,
    track: createTrack(variant, seed, rules),
    t: 0,
    steps: 0,
    countdown: rules.countdownSeconds,
    racers: [newRacer(0), newRacer(1)],
    result: null,
    events: [],
  };
}

export function cloneWorld(w: World): World {
  return JSON.parse(JSON.stringify(w)) as World;
}

/** Race time (s): negative during the countdown. */
export function raceTime(w: World): number {
  return w.t - w.countdown;
}

export function raceStarted(w: World): boolean {
  return w.t >= w.countdown - 1e-9;
}

/** Current lean of a Bambu racer: −1 … 1 is safe, beyond = fall. */
export function tiltOf(r: RacerState): number {
  return r.swayAmp * Math.sin(r.swayPhase);
}

/** Bambu: the sway phase at which `foot` should step (left = needle at the left). */
export function idealPhase(foot: Foot): number {
  return foot === 'L' ? -Math.PI / 2 : Math.PI / 2;
}

/** Bambu: seconds until `foot`'s next ideal moment (0 … swayPeriod). */
export function timeToIdeal(r: RacerState, foot: Foot): number {
  const omega = TAU / TUNING.bambu.swayPeriod;
  let d = (idealPhase(foot) - r.swayPhase) % TAU;
  if (d < 0) d += TAU;
  return d / omega;
}

/** Batok: race time of beat `k` (k ≥ 1; the first beat comes one period after the start signal). */
export function beatTime(k: number): number {
  return k * TUNING.batok.beat;
}

/** Batok: the beat nearest to race time `tau` (at least 1). */
export function nearestBeat(tau: number): number {
  return Math.max(1, Math.round(tau / TUNING.batok.beat));
}

// ---- judging a step -----------------------------------------------------------------------------------

interface Judgement {
  quality: number;
  perfect: boolean;
  /** Bambu: the step made the racer wobble (bad step on an obstacle). Batok: the shell slipped. */
  bad: boolean;
}

function obstacleAt(w: World, r: RacerState): ObstacleKind | null {
  const o = w.track.obstacles[r.nextObstacle];
  if (!o) return null;
  return r.x >= o.x - TUNING.obstacle.before && r.x <= o.x + TUNING.obstacle.after ? o.kind : null;
}

function judgeBambu(r: RacerState, foot: Foot, obstacle: ObstacleKind | null): Judgement {
  const B = TUNING.bambu;
  if (r.lastFoot === null) {
    // First step of a walk: starts the sway on this foot's ideal moment.
    r.swayPhase = idealPhase(foot);
    r.swayAmp = B.restAmp;
    const bad = obstacle !== null && B.firstQuality < B.obstacleMinQuality;
    return { quality: B.firstQuality, perfect: false, bad };
  }
  const sameFoot = foot === r.lastFoot;
  const err = wrapAngle(r.swayPhase - idealPhase(foot));
  const quality = sameFoot ? 0 : clamp(1 - Math.abs(err) / B.timingWindow, 0, 1);
  const perfect = !sameFoot && Math.abs(err) <= B.perfectWindow;
  r.swayAmp += B.kickBad * (1 - quality) - B.settle * quality * Math.max(0, r.swayAmp - B.restAmp);
  if (sameFoot) r.swayAmp += B.sameFootKick;
  else if (quality > 0) r.swayPhase -= B.phaseNudge * err;
  const bad = obstacle !== null && quality < B.obstacleMinQuality;
  if (bad) r.swayAmp += B.obstacleKick;
  return { quality, perfect, bad };
}

function judgeBatok(r: RacerState, foot: Foot, tau: number, obstacle: ObstacleKind | null): Judgement {
  const K = TUNING.batok;
  const k = nearestBeat(tau);
  const err = tau - beatTime(k);
  const window = obstacle ? K.obstacleWindow : K.goodWindow;
  const sameFoot = r.lastFoot !== null && foot === r.lastFoot;
  const beatUsed = k <= r.lastBeat;
  r.lastBeat = Math.max(r.lastBeat, k);
  if (sameFoot || beatUsed || Math.abs(err) > window) return { quality: 0, perfect: false, bad: true };
  return { quality: clamp(1 - Math.abs(err) / K.goodWindow, 0, 1), perfect: Math.abs(err) <= K.perfectWindow, bad: false };
}

function strideFor(w: World, r: RacerState, j: Judgement): number {
  const T = w.variant === 'bambu' ? TUNING.bambu : TUNING.batok;
  const base = T.stride * (T.strideMin + (1 - T.strideMin) * j.quality);
  return base * (j.perfect ? T.perfectBonus : 1) * slopeFactor(w.track, r.x);
}

function startPenalty(w: World, r: RacerState, rules: EgrangRules): void {
  const p = rules[w.variant].penaltySeconds;
  r.stride = 0;
  r.lastFoot = null;
  if (w.variant === 'bambu') {
    r.phase = 'fallen';
    r.phaseLeft = p * TUNING.bambu.fallShare;
    r.stats.falls += 1;
  } else {
    r.phase = 'stumbling';
    r.phaseLeft = p;
    r.stats.slips += 1;
  }
}

/**
 * THE input function: one step with `foot` by racer `side`, at the current time. Ignored during the
 * countdown, while fallen / climbing / stumbling and after the finish. Called only from `stepWorld`.
 */
function takeStep(w: World, side: Side, foot: Foot, rules: EgrangRules): void {
  const r = w.racers[side];
  if (!raceStarted(w) || w.result || r.phase !== 'walking') return;
  const tau = raceTime(w);
  const obstacle = obstacleAt(w, r);
  const j = w.variant === 'bambu' ? judgeBambu(r, foot, obstacle) : judgeBatok(r, foot, tau, obstacle);
  if (obstacle) {
    r.nextObstacle += 1;
    if (j.bad) r.stats.obstaclesMissed += 1;
    else r.stats.obstaclesOk += 1;
  }
  if (w.variant === 'batok' && j.bad) {
    startPenalty(w, r, rules);
    w.events.push({ type: 'slip', side, x: r.x, obstacle });
    return;
  }
  r.stride += strideFor(w, r, j);
  r.lastFoot = foot;
  r.lastStepT = tau;
  r.lastQuality = j.quality;
  r.stats.steps += 1;
  if (j.perfect) r.stats.perfect += 1;
  w.events.push({ type: 'step', side, foot, quality: j.quality, perfect: j.perfect, x: r.x, obstacle });
  if (j.bad) w.events.push({ type: 'wobble', side, foot, x: r.x, obstacle });
}

// ---- the fixed step -----------------------------------------------------------------------------------

function advanceRacer(w: World, r: RacerState, rules: EgrangRules): void {
  const tau = raceTime(w);
  // Penalties.
  if (r.phase === 'fallen' || r.phase === 'climbing' || r.phase === 'stumbling') {
    r.phaseLeft -= DT;
    if (r.phaseLeft <= 1e-9) {
      if (r.phase === 'fallen') {
        r.phase = 'climbing';
        r.phaseLeft += rules.bambu.penaltySeconds * (1 - TUNING.bambu.fallShare);
      } else {
        r.phase = 'walking';
        r.phaseLeft = 0;
        r.swayAmp = TUNING.bambu.standAmp;
        r.swayPhase = 0;
        w.events.push({ type: 'up', side: r.side });
      }
    }
    return;
  }
  // Sway (Bambu): the phase always runs (idle sway too); the amplitude grows only while walking.
  if (w.variant === 'bambu' && r.phase === 'walking') {
    r.swayPhase = wrapAngle(r.swayPhase + (TAU / TUNING.bambu.swayPeriod) * DT);
    if (raceStarted(w) && r.lastFoot !== null && !w.result) {
      r.swayAmp *= Math.exp(TUNING.bambu.growth * DT);
      if (Math.abs(tiltOf(r)) >= 1) {
        startPenalty(w, r, rules);
        w.events.push({ type: 'fall', side: r.side, x: r.x });
        return;
      }
    }
  }
  // Glide over the stride.
  if (r.stride > 0) {
    const move = r.stride * (1 - Math.exp(-DT / TUNING.glideTau));
    const d = r.stride < 1e-4 ? r.stride : move;
    const before = r.x;
    r.x += d;
    r.stride -= d;
    if (r.finishT === null && before < w.track.length && r.x >= w.track.length) {
      // Crossed during this step: interpolate the moment inside it (the step ends at `tau`).
      const k = (w.track.length - before) / (r.x - before);
      r.finishT = tau - DT + k * DT;
      r.phase = 'finished';
      w.events.push({ type: 'finish', side: r.side, time: r.finishT });
    }
  }
  // Obstacles passed without a step on them count as cleared.
  const o = w.track.obstacles[r.nextObstacle];
  if (o && r.x > o.x + TUNING.obstacle.after) r.nextObstacle += 1;
}

function decide(w: World, rules: EgrangRules): RaceResult | null {
  const [a, b] = w.racers;
  const tau = raceTime(w);
  const times: [number | null, number | null] = [a.finishT, b.finishT];
  const distances: [number, number] = [a.x, b.x];
  const first = Math.min(a.finishT ?? Infinity, b.finishT ?? Infinity);
  const bothDone = a.finishT !== null && b.finishT !== null;
  if (bothDone || (first < Infinity && tau >= first + TUNING.graceSeconds)) {
    const ta = a.finishT ?? Infinity;
    const tb = b.finishT ?? Infinity;
    return { winner: ta === tb ? 'draw' : ta < tb ? 0 : 1, times, distances, reason: 'finish' };
  }
  if (tau >= rules.timeLimitSeconds) {
    return { winner: a.x === b.x ? 'draw' : a.x > b.x ? 0 : 1, times, distances, reason: 'time' };
  }
  return null;
}

export interface StepInput {
  side: Side;
  foot: Foot;
}

/**
 * One fixed step: the steps taken during it (in order), then the sway, penalties, gliding, finish
 * detection and the result. `world.events` holds what happened in this step only. Mutates `w`.
 */
export function stepWorld(w: World, inputs: readonly StepInput[] = [], rules: EgrangRules = DEFAULT_RULES): void {
  w.events = [];
  if (w.result) return;
  const wasStarted = raceStarted(w);
  w.t += DT;
  w.steps += 1;
  if (!wasStarted && raceStarted(w)) w.events.push({ type: 'go' });
  for (const input of inputs) takeStep(w, input.side, input.foot, rules);
  advanceRacer(w, w.racers[0], rules);
  advanceRacer(w, w.racers[1], rules);
  const result = decide(w, rules);
  if (result) {
    w.result = result;
    w.events.push({ type: 'end', result });
  }
}

/** Headless runner: `steps` fixed steps with scheduled inputs; returns every event in order. */
export function simulate(w: World, inputs: readonly ScheduledStep[], steps: number, rules: EgrangRules = DEFAULT_RULES): RaceEvent[] {
  const byStep = new Map<number, StepInput[]>();
  for (const s of inputs) {
    const list = byStep.get(s.atStep) ?? [];
    list.push({ side: s.side, foot: s.foot });
    byStep.set(s.atStep, list);
  }
  const all: RaceEvent[] = [];
  for (let i = 0; i < steps && !w.result; i += 1) {
    stepWorld(w, byStep.get(w.steps + 1) ?? [], rules);
    all.push(...w.events);
  }
  return all;
}

/** Decides each fixed step whether racer `side` steps now (the AI, the test "human"). */
export type Controller = (w: World, side: Side) => Foot | null;

export interface RaceRun {
  world: World;
  result: RaceResult;
  events: RaceEvent[];
}

/** Plays a whole race headless with one controller per side. */
export function playRace(
  variant: Variant,
  seed: number,
  controllers: [Controller, Controller],
  rules: EgrangRules = DEFAULT_RULES,
  keepEvents = false,
): RaceRun {
  const w = createWorld(variant, seed, rules);
  const events: RaceEvent[] = [];
  const maxSteps = Math.ceil((rules.countdownSeconds + rules.timeLimitSeconds + 1) * STEP_HZ);
  while (!w.result && w.steps < maxSteps) {
    const inputs: StepInput[] = [];
    for (const side of [0, 1] as const) {
      const foot = controllers[side](w, side);
      if (foot) inputs.push({ side, foot });
    }
    stepWorld(w, inputs, rules);
    if (keepEvents) events.push(...w.events);
  }
  return { world: w, result: w.result!, events };
}
