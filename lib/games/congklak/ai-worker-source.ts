/**
 * Source text of the congklak AI Web Worker (Phase 17): the self-contained `congklakCore` function plus a
 * message handler. ai-client.ts turns it into a Blob URL. (A file-based `new Worker(new URL(...))` is not
 * bundled by this Next.js version's Turbopack; see core.ts.) Tested by running the text in isolation.
 *
 * Protocol (ai-protocol.ts): request `{ id, state, level, seed, rules, timeLimitMs? }`, answer
 * `{ id, hole, depth, ms }` or `{ id, error }`.
 */
import { SULIT_MAX_DEPTH, SULIT_TIME_LIMIT_MS } from './ai';
import { congklakCore } from './core';

export function aiWorkerSource(): string {
  return `"use strict";
const core = (${congklakCore.toString()})();
self.onmessage = function (e) {
  var d = e.data;
  var started = performance.now();
  try {
    var c = core.chooseAiMove(d.state, d.level, d.rules, {
      rng: core.createRng(d.seed),
      timeLimitMs: typeof d.timeLimitMs === 'number' ? d.timeLimitMs : ${SULIT_TIME_LIMIT_MS},
      maxDepth: ${SULIT_MAX_DEPTH},
      now: function () { return performance.now(); }
    });
    self.postMessage({ id: d.id, hole: c.hole, depth: c.depth, ms: performance.now() - started });
  } catch (err) {
    self.postMessage({ id: d.id, error: String((err && err.message) || err) });
  }
};
`;
}
