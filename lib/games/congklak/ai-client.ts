/**
 * Browser side of the congklak computer opponent (Phase 17). Every level runs in ONE Web Worker, started
 * from a Blob URL of the self-contained core (ai-worker-source.ts), so the Sulit search never blocks the
 * page. Without Blob worker support (very old browsers, a strict CSP) or after a worker error, the move is
 * computed on the main thread with a short time limit instead.
 */
import { chooseAiMove, type AiLevel } from './ai';
import type { AiRequest, AiResponse } from './ai-protocol';
import { aiWorkerSource } from './ai-worker-source';
import { createRng, randomSeed } from './random';
import { DEFAULT_RULES, type CongklakRules } from './rules';
import type { CongklakState } from './state';

/** Main-thread fallback limit: keeps any blocking short when no worker is available. */
const FALLBACK_TIME_LIMIT_MS = 40;

export interface AiClient {
  chooseMove(state: CongklakState, level: AiLevel): Promise<number>;
  dispose(): void;
}

/** Starts the worker from a Blob URL of the self-contained AI source (see ai-worker-source.ts). */
function spawnWorker(): { worker: Worker; url: string } {
  const url = URL.createObjectURL(new Blob([aiWorkerSource()], { type: 'text/javascript' }));
  try {
    return { worker: new Worker(url, { name: 'congklak-ai' }), url };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

export function createAiClient(rules: CongklakRules = DEFAULT_RULES): AiClient {
  let worker: Worker | null = null;
  let blobUrl: string | null = null;
  try {
    if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const spawned = spawnWorker();
      worker = spawned.worker;
      blobUrl = spawned.url;
    }
  } catch {
    // CSP or browser without Blob workers: compute on the main thread instead
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
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = null;
      pending.clear();
    },
  };
}
