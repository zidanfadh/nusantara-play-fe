/**
 * Congklak computer opponent (Phase 17). Pure; runs inside the Web Worker (ai.worker.ts) in the browser and
 * directly in the tests.
 *
 * - Mudah: a random legal move.
 * - Sedang: the best immediate result of one move (seeds gained in the store, an extra turn, a capture,
 *   winning the game); ties are broken randomly.
 * - Sulit: alpha-beta search with the real rules (an extra turn keeps the same side to move), iterative
 *   deepening until the time limit (300 ms by default), evaluated by the store difference.
 */
import { simulateMove } from './engine';
import { pick, type Rng } from './random';
import { DEFAULT_RULES, type CongklakRules } from './rules';
import { legalMoves, storeIndex, type CongklakState, type Player } from './state';

export type AiLevel = 'mudah' | 'sedang' | 'sulit';
export const AI_LEVELS: readonly AiLevel[] = ['mudah', 'sedang', 'sulit'];

/** Time limit of one Sulit move (owner target: 300 ms on a mid-range phone). */
export const SULIT_TIME_LIMIT_MS = 300;
/** Deepest search Sulit tries (it usually stops earlier on the time limit). */
export const SULIT_MAX_DEPTH = 12;

export interface AiOptions {
  rng: Rng;
  rules?: CongklakRules;
  /** Sulit only. Infinity = no time limit (deterministic tests). */
  timeLimitMs?: number;
  /** Sulit only. */
  maxDepth?: number;
  /** Clock in ms (tests and the worker pass performance.now). */
  now?: () => number;
}

export interface AiChoice {
  hole: number;
  /** Sulit: deepest fully searched depth (0 for the other levels). */
  depth: number;
}

const WIN = 10_000;

function storeDiff(state: CongklakState, me: Player, rules: CongklakRules): number {
  return state.pits[storeIndex(me, rules)] - state.pits[storeIndex(me === 0 ? 1 : 0, rules)];
}

function evaluate(state: CongklakState, me: Player, rules: CongklakRules): number {
  const diff = storeDiff(state, me, rules);
  if (state.over) {
    if (state.winner === 'draw') return 0;
    return state.winner === me ? WIN + diff : -WIN + diff;
  }
  return diff;
}

function chooseSedang(state: CongklakState, rules: CongklakRules, rng: Rng): number {
  const me = state.toMove;
  const before = state.pits[storeIndex(me, rules)];
  let best: number[] = [];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const hole of legalMoves(state, rules)) {
    const { state: next, summary } = simulateMove(state, hole, rules);
    let score = next.pits[storeIndex(me, rules)] - before;
    if (summary.extraTurn && !next.over) score += 3;
    if (summary.captured > 0) score += 1;
    if (next.over) score += next.winner === me ? 1000 : next.winner === 'draw' ? 0 : -1000;
    if (score > bestScore) {
      bestScore = score;
      best = [hole];
    } else if (score === bestScore) best.push(hole);
  }
  return pick(rng, best);
}

class Timeout extends Error {}

function chooseSulit(
  state: CongklakState,
  rules: CongklakRules,
  rng: Rng,
  timeLimitMs: number,
  maxDepth: number,
  now: () => number,
): AiChoice {
  const me = state.toMove;
  const moves = legalMoves(state, rules);
  if (moves.length === 1) return { hole: moves[0], depth: 0 };
  const deadline = Number.isFinite(timeLimitMs) ? now() + timeLimitMs : Number.POSITIVE_INFINITY;
  let nodes = 0;

  const search = (s: CongklakState, depth: number, alpha: number, beta: number): number => {
    if (s.over || depth === 0) return evaluate(s, me, rules);
    if ((++nodes & 255) === 0 && now() > deadline) throw new Timeout();
    const maximizing = s.toMove === me;
    let value = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    for (const hole of legalMoves(s, rules)) {
      const child = simulateMove(s, hole, rules).state;
      const v = search(child, depth - 1, alpha, beta);
      if (maximizing) {
        if (v > value) value = v;
        if (value > alpha) alpha = value;
      } else {
        if (v < value) value = v;
        if (value < beta) beta = value;
      }
      if (alpha >= beta) break;
    }
    return value;
  };

  // Random order among equals at the root (shuffled once), then the previous best first.
  let order = [...moves];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let bestHole = order[0];
  let bestDepth = 0;
  const children = new Map(order.map((h) => [h, simulateMove(state, h, rules).state]));

  for (let depth = 1; depth <= maxDepth; depth++) {
    try {
      let alpha = Number.NEGATIVE_INFINITY;
      let iterBest = order[0];
      for (const hole of order) {
        const v = search(children.get(hole) as CongklakState, depth - 1, alpha, Number.POSITIVE_INFINITY);
        if (v > alpha) {
          alpha = v;
          iterBest = hole;
        }
      }
      bestHole = iterBest;
      bestDepth = depth;
      order = [iterBest, ...order.filter((h) => h !== iterBest)];
      if (Math.abs(alpha) >= WIN / 2) break; // the result is decided
    } catch (e) {
      if (e instanceof Timeout) break;
      throw e;
    }
  }
  return { hole: bestHole, depth: bestDepth };
}

/** The computer's move for the player to move. Throws if the game is over (no legal move). */
export function chooseAiMove(state: CongklakState, level: AiLevel, options: AiOptions): AiChoice {
  const rules = options.rules ?? DEFAULT_RULES;
  const moves = legalMoves(state, rules);
  if (moves.length === 0) throw new Error('chooseAiMove: no legal move');
  if (level === 'mudah') return { hole: pick(options.rng, moves), depth: 0 };
  if (level === 'sedang') return { hole: chooseSedang(state, rules, options.rng), depth: 0 };
  return chooseSulit(
    state,
    rules,
    options.rng,
    options.timeLimitMs ?? SULIT_TIME_LIMIT_MS,
    options.maxDepth ?? SULIT_MAX_DEPTH,
    options.now ?? (() => Date.now()),
  );
}
