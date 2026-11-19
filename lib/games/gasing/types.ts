/**
 * Types of the gasing (spinning top) game (Phase 20). Type-only module: the engine, the AI, the match
 * controller, the tests and the UI share these shapes.
 *
 * World coordinates: the arena's centre is (0, 0), its ring has radius `rules.arenaRadius` (1), x points
 * right and y points DOWN (like the screen). Side 0 (the player, warm colour) throws from the bottom of the
 * ring (0, +R), side 1 (the computer, cool colour) from the top (0, -R).
 */

/** 0 = the player ("Kamu"), 1 = the computer ("Komputer"). */
export type Side = 0 | 1;

export type GameMode = 'uri' | 'pangkah';

export type AiLevel = 'mudah' | 'sedang' | 'sulit';

/** What a top does right now. `stopped` and `out` are final for the round. */
export type TopPhase = 'held' | 'flying' | 'spinning' | 'stopped' | 'out';

/** Why a top's round ended. */
export type EndReason = 'jatuh' | 'keluar';

export interface TopState {
  side: Side;
  phase: TopPhase;
  /** Centre position and velocity (arena units, units per second). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Flight: seconds flown so far and the flight's total duration (0 while not flying). */
  flightT: number;
  flightDur: number;
  /** Angular velocity in rad/s (signed; both sides spin the same way). */
  spin: number;
  /** Spin right after landing, for the HUD meter (0 before landing). */
  spinStart: number;
  /** Tilt: 0 = upright, 1 = touching the ground (falls). */
  tilt: number;
  /** Precession angle of the wobble (radians). */
  precession: number;
  /** Visual rotation angle (radians), accumulated from the spin. */
  angle: number;
  mass: number;
  radius: number;
  inertia: number;
  /** Seconds spent spinning on the ground (the Uri / Pangkah clock). Frozen once stopped or out. */
  spinTime: number;
  endReason: EndReason | null;
}

export interface World {
  /** Simulated seconds. */
  t: number;
  /** Fixed steps simulated. */
  steps: number;
  /** State of the seeded generator (mulberry32). */
  rng: number;
  tops: [TopState, TopState];
}

/** One throw, as produced by the throw model (pointer, keyboard, the AI or the test "human"). */
export interface Throw {
  /** World direction of the throw (radians, atan2 convention in world coordinates). */
  angle: number;
  /** 0..1: distance of the landing point and part of the spin. */
  power: number;
  /** 0..1: release quality (steadiness and winding); more spin, less tilt. */
  quality: number;
  /** Released inside the "perfect" window: small bonus. */
  perfect: boolean;
}

export type WorldEvent =
  | { type: 'throw'; side: Side }
  | { type: 'land'; side: Side; x: number; y: number; strength: number; direct: boolean }
  | { type: 'hit'; x: number; y: number; strength: number }
  | { type: 'stop'; side: Side; x: number; y: number }
  | { type: 'out'; side: Side; x: number; y: number };

/** A throw scheduled at a fixed step (headless simulation). */
export interface ScheduledThrow {
  atStep: number;
  side: Side;
  throw: Throw;
}

export type RoundWinner = Side | 'draw';

export type RoundReason = 'keluar' | 'lebih-lama';

export interface RoundResult {
  winner: RoundWinner;
  reason: RoundReason;
  /** Spin times (seconds) of both tops when the round was decided. */
  times: [number, number];
  /** How each top ended (null = still spinning when the round was decided). */
  ends: [EndReason | null, EndReason | null];
}
