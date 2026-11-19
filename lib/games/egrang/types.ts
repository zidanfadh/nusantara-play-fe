/**
 * Types of the egrang (stilts) race (Phase 23). Type-only module: the engine, the AI, the input model,
 * the tests and the UI share these shapes.
 *
 * Track coordinates: `x` is metres along the track from the start line (0) to the finish line
 * (`track.length`); the height profile (the gentle slope) is `heightAt(track, x)` in engine.ts. Both racers
 * run the SAME track, each on its own lane: side 0 (the player) on the near lane, side 1 (the computer) on
 * the far lane.
 */

/** 'bambu' = tall bamboo stilts (Jawa Tengah record), 'batok' = coconut-shell stilts (Sulawesi Selatan). */
export type Variant = 'bambu' | 'batok';

/** 0 = the player ("Kamu"), 1 = the computer ("Komputer"). */
export type Side = 0 | 1;

export type AiLevel = 'mudah' | 'sedang' | 'sulit';

/** Left or right foot. */
export type Foot = 'L' | 'R';

/**
 * What a racer is doing. `fallen` (Bambu: tipping over), `climbing` (Bambu: back onto the stilts) and
 * `stumbling` (Batok: the shell slipped off) ignore steps; `finished` is final.
 */
export type RacerPhase = 'walking' | 'fallen' | 'climbing' | 'stumbling' | 'finished';

export type ObstacleKind = 'batu' | 'genangan';

export interface Obstacle {
  kind: ObstacleKind;
  /** Centre of the obstacle along the track (m). */
  x: number;
}

export interface Track {
  variant: Variant;
  /** Start line to finish line (m). */
  length: number;
  obstacles: Obstacle[];
  /** Gentle hill: centre, half-width (m) and height (m); height 0 = flat. */
  hill: { x: number; halfWidth: number; height: number };
}

export interface RacerState {
  side: Side;
  /** Metres from the start line; never decreases. */
  x: number;
  /** Metres still to travel from steps already taken (the body glides forward after each step). */
  stride: number;
  phase: RacerPhase;
  /** Seconds left in `fallen`, `climbing` or `stumbling`. */
  phaseLeft: number;
  /** The last foot stepped (null at the start and after a fall or a slip). */
  lastFoot: Foot | null;
  /** Race time (s) of the last accepted step, for the walking animation; -1 before the first. */
  lastStepT: number;
  lastQuality: number;
  /** Bambu: sway phase (rad) and amplitude; tilt = amp · sin(phase), |tilt| >= 1 = fall. */
  swayPhase: number;
  swayAmp: number;
  /** Batok: index of the last beat used for a step (each beat carries one step), -1 none. */
  lastBeat: number;
  /** Next obstacle (index into track.obstacles) this racer has not stepped over yet. */
  nextObstacle: number;
  /** Race time (s) when the finish line was crossed (interpolated inside the step), null before. */
  finishT: number | null;
  /** Counters for the end screen and the tests. */
  stats: { steps: number; perfect: number; falls: number; slips: number; obstaclesOk: number; obstaclesMissed: number };
}

export type RaceWinner = Side | 'draw';

export interface RaceResult {
  winner: RaceWinner;
  /** Finish times (race seconds) or null when that racer had not finished when the race ended. */
  times: [number | null, number | null];
  /** Distance covered by each racer when the race ended (m). */
  distances: [number, number];
  /** 'finish' normally; 'time' when the safety time limit ended the race. */
  reason: 'finish' | 'time';
}

export interface World {
  variant: Variant;
  track: Track;
  /** Seconds since the countdown began (the race starts at `countdown`). */
  t: number;
  /** Fixed steps simulated. */
  steps: number;
  /** Countdown length (s); race time = t − countdown. */
  countdown: number;
  racers: [RacerState, RacerState];
  /** Set once, when the race is decided (both finished, the first finisher's grace time ran out, or time). */
  result: RaceResult | null;
  /** Events of the LAST fixed step only (sound, particles, text); cleared at the start of every step. */
  events: RaceEvent[];
}

export type RaceEvent =
  | { type: 'go' }
  | { type: 'step'; side: Side; foot: Foot; quality: number; perfect: boolean; x: number; obstacle: ObstacleKind | null }
  | { type: 'wobble'; side: Side; foot: Foot; x: number; obstacle: ObstacleKind | null }
  | { type: 'fall'; side: Side; x: number }
  | { type: 'up'; side: Side }
  | { type: 'slip'; side: Side; x: number; obstacle: ObstacleKind | null }
  | { type: 'finish'; side: Side; time: number }
  | { type: 'end'; result: RaceResult };

/** A step scheduled at a fixed step (headless simulation, tests, the input model). */
export interface ScheduledStep {
  atStep: number;
  side: Side;
  foot: Foot;
}
