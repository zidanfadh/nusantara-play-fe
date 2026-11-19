/**
 * Congklak computer opponent (Phase 17). Pure; runs inside the Web Worker (ai-worker-source.ts) in the browser and
 * directly in the tests.
 *
 * - Mudah: a random legal move.
 * - Sedang: the best immediate result of one move (seeds gained in the store, an extra turn, a capture,
 *   winning the game); ties are broken randomly.
 * - Sulit: alpha-beta search with the real rules (an extra turn keeps the same side to move), iterative
 *   deepening until the time limit (300 ms by default), evaluated by the store difference.
 *
 * The code is `chooseAiMove` in core.ts (it runs inside the worker as well).
 */
import { core } from './core';
import type { Rng } from './random';
import { DEFAULT_RULES, type CongklakRules } from './rules';
import type { CongklakState } from './state';

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

/** The computer's move for the player to move. Throws if the game is over (no legal move). */
export function chooseAiMove(state: CongklakState, level: AiLevel, options: AiOptions): AiChoice {
  return core.chooseAiMove(state, level, options.rules ?? DEFAULT_RULES, {
    rng: options.rng,
    timeLimitMs: options.timeLimitMs ?? SULIT_TIME_LIMIT_MS,
    maxDepth: options.maxDepth ?? SULIT_MAX_DEPTH,
    now: options.now,
  });
}
