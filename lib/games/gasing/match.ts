/**
 * The gasing match controller (Phase 20): rounds, whose throw it is, the computer's throws and the score.
 * Pure TypeScript, no DOM; the page's frame loop and the calibration tests drive the same code.
 * `matchStep` and `playerThrow` MUTATE the match they are given (the frame loop owns it); everything else
 * returns values.
 *
 * Round order ("Aturan dasar"):
 * - Uri: both throw once per round; the player throws first in odd rounds, the computer in even ones.
 * - Pangkah: the target throws first, then the striker throws at it. Round 1 the computer's
 *   top is the target, round 2 the player's, and so on.
 * The next throw comes when the previous top has landed plus a short pause (the computer also waits a
 * moment so its throw is readable). The world keeps running while the player aims.
 */
import { chooseAiThrow, type ThrowRole } from './ai';
import { decideRound } from './outcome';
import { DT, applyThrow, createWorld, step } from './physics';
import { mulberry32Step, type Rng } from './random';
import { DEFAULT_RULES, type GasingRules } from './rules';
import type { AiLevel, GameMode, RoundResult, RoundWinner, Side, Throw, World, WorldEvent } from './types';

export interface PlannedThrow {
  side: Side;
  role: ThrowRole;
}

export type Stage = 'aim' | 'wait' | 'running' | 'round-over' | 'match-over';

export interface MatchState {
  mode: GameMode;
  level: AiLevel;
  rules: GasingRules;
  /** 1-based. */
  round: number;
  wins: [number, number];
  results: RoundResult[];
  world: World;
  order: PlannedThrow[];
  /** Index into `order` of the next throw. */
  next: number;
  stage: Stage;
  /** Steps left before the next throw may happen (stage 'wait'). */
  waitSteps: number;
  /** Seed of the next round's world, and the AI generator's state. */
  seed: number;
  aiState: number;
  winner: RoundWinner | null;
}

/** Pause after a top lands before the next throw (s), and the computer's extra "thinking" time (s). */
export const NEXT_THROW_DELAY = 0.5;
export const AI_THINK = 0.6;

export function roundOrder(mode: GameMode, round: number): PlannedThrow[] {
  const odd = round % 2 === 1;
  if (mode === 'uri') {
    const first: Side = odd ? 0 : 1;
    return [
      { side: first, role: 'uri' },
      { side: first === 0 ? 1 : 0, role: 'uri' },
    ];
  }
  const target: Side = odd ? 1 : 0;
  return [
    { side: target, role: 'target' },
    { side: target === 0 ? 1 : 0, role: 'striker' },
  ];
}

function nextSeed(seed: number): number {
  return mulberry32Step(seed)[1] ^ 0x5bd1e995;
}

function aiRng(m: MatchState): Rng {
  return () => {
    const [v, next] = mulberry32Step(m.aiState);
    m.aiState = next;
    return v;
  };
}

function enterNextThrow(m: MatchState, delaySeconds: number): void {
  const p = m.order[m.next];
  if (!p) {
    m.stage = 'running';
    return;
  }
  m.waitSteps = Math.round((delaySeconds + (p.side === 1 ? AI_THINK : 0)) / DT);
  m.stage = m.waitSteps <= 0 && p.side === 0 ? 'aim' : 'wait';
}

function startRound(m: MatchState): void {
  m.world = createWorld(m.seed);
  m.seed = nextSeed(m.seed);
  m.order = roundOrder(m.mode, m.round);
  m.next = 0;
  enterNextThrow(m, 0);
}

export function createMatch(mode: GameMode, level: AiLevel, seed: number, rules: GasingRules = DEFAULT_RULES): MatchState {
  const m: MatchState = {
    mode,
    level,
    rules,
    round: 1,
    wins: [0, 0],
    results: [],
    world: createWorld(seed),
    order: [],
    next: 0,
    stage: 'wait',
    waitSteps: 0,
    seed: seed | 0,
    aiState: (seed ^ 0x9e3779b9) | 0,
    winner: null,
  };
  startRound(m);
  return m;
}

/** The throw that comes next in this round, or null when both have been thrown. */
export function currentThrow(m: MatchState): PlannedThrow | null {
  return m.order[m.next] ?? null;
}

function doThrow(m: MatchState, t: Throw, events?: WorldEvent[]): void {
  const p = m.order[m.next];
  applyThrow(m.world, p.side, t, events, m.rules);
  m.next += 1;
  m.stage = m.next < m.order.length ? 'wait' : 'running';
  m.waitSteps = Number.POSITIVE_INFINITY; // until the thrown top has landed (see matchStep)
}

/** The player's throw; ignored unless it is the player's turn to aim. Returns true when it was taken. */
export function playerThrow(m: MatchState, t: Throw, events?: WorldEvent[]): boolean {
  const p = currentThrow(m);
  if (m.stage !== 'aim' || !p || p.side !== 0) return false;
  doThrow(m, t, events);
  return true;
}

function finishRound(m: MatchState, r: RoundResult): void {
  m.results.push(r);
  if (r.winner !== 'draw') m.wins[r.winner] += 1;
  const need = m.rules.roundsToWin;
  if (m.wins[0] >= need || m.wins[1] >= need) {
    m.winner = m.wins[0] >= need ? 0 : 1;
    m.stage = 'match-over';
  } else if (m.round >= m.rules.maxRounds) {
    m.winner = m.wins[0] === m.wins[1] ? 'draw' : m.wins[0] > m.wins[1] ? 0 : 1;
    m.stage = 'match-over';
  } else {
    m.stage = 'round-over';
  }
}

/** The result of the round that just ended. */
export function lastResult(m: MatchState): RoundResult | null {
  return m.results[m.results.length - 1] ?? null;
}

/** One fixed step of the match (mutates): the world, the computer's throw, the round decision. */
export function matchStep(m: MatchState, events?: WorldEvent[]): void {
  step(m.world, events, m.rules);
  if (m.stage === 'round-over' || m.stage === 'match-over') return;

  // After a throw: wait until that top has landed, then the pause before the next throw.
  if (m.stage === 'wait' && m.waitSteps === Number.POSITIVE_INFINITY) {
    const thrown = m.order[m.next - 1];
    if (!thrown || m.world.tops[thrown.side].phase !== 'flying') enterNextThrow(m, NEXT_THROW_DELAY);
  } else if (m.stage === 'wait') {
    m.waitSteps -= 1;
    if (m.waitSteps <= 0) {
      const p = m.order[m.next];
      if (p.side === 0) m.stage = 'aim';
      else doThrow(m, chooseAiThrow(m.world, 1, p.role, m.level, aiRng(m), m.rules), events);
    }
  }

  const r = decideRound(m.world, m.next >= m.order.length, m.rules);
  if (r) finishRound(m, r);
}

/** Starts the next round after 'round-over' (no-op otherwise). */
export function nextRound(m: MatchState): void {
  if (m.stage !== 'round-over') return;
  m.round += 1;
  startRound(m);
}

/** The player's role in the current round (for the banner). */
export function playerRole(m: MatchState): ThrowRole {
  return m.order.find((p) => p.side === 0)?.role ?? 'uri';
}

/** Runs a whole match headlessly with `player` deciding the player's throws (tests, calibration). */
export function playMatch(
  mode: GameMode,
  level: AiLevel,
  seed: number,
  player: (world: World, role: ThrowRole) => Throw,
  rules: GasingRules = DEFAULT_RULES,
): MatchState {
  const m = createMatch(mode, level, seed, rules);
  let guard = 0;
  while (m.stage !== 'match-over' && guard++ < 200_000) {
    if (m.stage === 'aim') {
      const p = currentThrow(m);
      if (p) playerThrow(m, player(m.world, p.role));
    } else if (m.stage === 'round-over') nextRound(m);
    else matchStep(m);
  }
  return m;
}
