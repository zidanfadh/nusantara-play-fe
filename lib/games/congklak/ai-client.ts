/**
 * Browser side of the congklak computer opponent (Phase 17). Every level runs in ONE Web Worker
 * (ai.worker.ts), so the Sulit search never blocks the page. Without Worker support (very old browsers)
 * the move is computed on the main thread with a short time limit instead.
 */
import { chooseAiMove, type AiLevel } from './ai';
import type { AiRequest, AiResponse } from './ai-protocol';
import { createRng, randomSeed } from './random';
import { DEFAULT_RULES, type CongklakRules } from './rules';
import type { CongklakState } from './state';

/** Main-thread fallback limit: keeps any blocking short when no worker is available. */
const FALLBACK_TIME_LIMIT_MS = 40;

export interface AiClient {
  chooseMove(state: CongklakState, level: AiLevel): Promise<number>;
  dispose(): void;
}

export function createAiClient(rules: CongklakRules = DEFAULT_RULES): AiClient {
  let worker: Worker | null = null;
  try {
    if (typeof Worker !== 'undefined') {
      worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module', name: 'congklak-ai' });
    }
  } catch {
    worker = null;
  }
  let nextId = 1;
  const pending = new Map<number, { resolve: (hole: number) => void; reject: (e: Error) => void }>();

  const fallback = (state: CongklakState, level: AiLevel) =>
    chooseAiMove(state, level, { rng: createRng(randomSeed()), rules, timeLimitMs: FALLBACK_TIME_LIMIT_MS }).hole;

  if (worker) {
    worker.onmessage = (e: MessageEvent<AiResponse>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.error !== undefined) p.reject(new Error(e.data.error));
      else p.resolve(e.data.hole);
    };
    worker.onerror = () => {
      // A broken worker: answer everything still waiting on the main thread from now on.
      worker?.terminate();
      worker = null;
      for (const [, p] of pending) p.reject(new Error('congklak AI worker failed'));
      pending.clear();
    };
  }

  return {
    chooseMove(state, level) {
      if (!worker) {
        try {
          return Promise.resolve(fallback(state, level));
        } catch (e) {
          return Promise.reject(e);
        }
      }
      const id = nextId++;
      const req: AiRequest = { id, state, level, seed: randomSeed(), rules };
      return new Promise<number>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker?.postMessage(req);
      }).catch(() => fallback(state, level));
    },
    dispose() {
      worker?.terminate();
      worker = null;
      pending.clear();
    },
  };
}
