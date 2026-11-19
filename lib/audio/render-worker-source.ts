/**
 * Source text of the buffer-rendering Web Worker (Phase 21): the self-contained `soundCore` plus a
 * message handler; `buffers.ts` starts it from a Blob URL (the congklak AI pattern, see core.ts).
 * Tested by running the text in isolation (tests/audio/sound-core.test.ts).
 *
 * Request: `{ refs: SoundRef[], base: number, half: boolean, impulse?: { sr, seconds, decay } }`.
 * Answers, one message per sound in request order (so the first sounds are usable at once):
 * `{ key, sr, ch: Float32Array[], ms }`, `{ impulse: true, sr, ch, ms }`, or `{ key, error }`.
 * The channel arrays are transferred, not copied.
 */
import { soundCore } from './core';

export function renderWorkerSource(): string {
  return `"use strict";
var core = (${soundCore.toString()})();
self.onmessage = function (e) {
  var d = e.data;
  if (d.impulse) {
    var t0 = performance.now();
    var ir = core.renderImpulse(d.impulse.sr, d.impulse.seconds, d.impulse.decay);
    self.postMessage({ impulse: true, sr: d.impulse.sr, ch: ir, ms: performance.now() - t0 }, ir.map(function (c) { return c.buffer; }));
  }
  for (var i = 0; i < d.refs.length; i += 1) {
    var ref = d.refs[i];
    var key = core.soundKey(ref);
    try {
      var started = performance.now();
      var sr = d.half ? core.rateFor(ref.id, d.base) : d.base;
      var ch = core.renderSound(ref, sr);
      self.postMessage({ key: key, sr: sr, ch: ch, ms: performance.now() - started }, ch.map(function (c) { return c.buffer; }));
    } catch (err) {
      self.postMessage({ key: key, error: String((err && err.message) || err) });
    }
  }
};
`;
}
