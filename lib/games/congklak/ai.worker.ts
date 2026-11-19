/// <reference lib="webworker" />
/**
 * Web Worker of the congklak computer opponent (Phase 17): the search runs here, so the page never freezes.
 * Created only by ai-client.ts. Receives one request at a time and answers with the chosen hole.
 */
import { chooseAiMove } from './ai';
import { createRng } from './random';
import type { AiRequest, AiResponse } from './ai-protocol';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, state, level, seed, rules, timeLimitMs } = e.data;
  const started = performance.now();
  try {
    const choice = chooseAiMove(state, level, {
      rng: createRng(seed),
      rules,
      timeLimitMs,
      now: () => performance.now(),
    });
    const res: AiResponse = { id, hole: choice.hole, depth: choice.depth, ms: performance.now() - started };
    ctx.postMessage(res);
  } catch (err) {
    const res: AiResponse = { id, error: err instanceof Error ? err.message : String(err) };
    ctx.postMessage(res);
  }
};
