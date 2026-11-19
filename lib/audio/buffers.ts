/**
 * Rendered sounds as AudioBuffers (Phase 21). Each sound is rendered ONCE per page (by key) from the
 * self-contained synthesis core, in request order, so the first scene and the gong come first:
 *
 * - in a Web Worker started from a Blob URL (render-worker-source.ts), so rendering never blocks the
 *   film's frames; the main thread only wraps the arrays into AudioBuffers;
 * - without Blob workers (strict CSP, old browser) or after a worker error: on the main thread, one
 *   sound per task (setTimeout), so a frame is never blocked for long;
 * - `renderNow()` renders synchronously (the offline WAV render, tests).
 */
import { soundCore, type Channels, type SoundRef } from './core';
import { renderWorkerSource } from './render-worker-source';

const core = soundCore();

/** Base sample rate of the rendered sounds (Hz); dark sounds use half of it (core.rateFor). */
export const BASE_RATE = 24000;
/** Shared room reverb: impulse length and decay time constant (s). */
export const IMPULSE_SECONDS = 1.9;
export const IMPULSE_DECAY = 0.42;

export const soundKey = core.soundKey;

export interface RenderStats {
  /** Sounds rendered so far, and the summed render time they took (ms, where they were rendered). */
  rendered: number;
  renderMs: number;
  /** Wall time from the first request until the queue was empty (ms), null while busy. */
  wallMs: number | null;
  /** Where the sounds were rendered. */
  mode: 'worker' | 'main' | 'sync';
}

export interface BufferStore {
  get(ref: SoundRef): AudioBuffer | null;
  has(ref: SoundRef): boolean;
  /** Queues sounds for rendering in the given order (already rendered or queued ones are skipped). */
  request(refs: readonly SoundRef[]): void;
  /** Renders these sounds now, synchronously, on this thread. */
  renderNow(refs: readonly SoundRef[]): void;
  /** The reverb impulse response (null until rendered). */
  impulse(): AudioBuffer | null;
  /** Called with the key of every newly available buffer ('impulse' for the impulse response). */
  onReady(cb: (key: string) => void): () => void;
  readonly stats: RenderStats;
  dispose(): void;
}

interface WorkerAnswer {
  key?: string;
  impulse?: boolean;
  sr?: number;
  ch?: Float32Array[];
  ms?: number;
  error?: string;
}

/** Whether this context accepts buffers at half the base rate (old Safari only took 22.05 to 96 kHz). */
function halfRateSupported(ctx: BaseAudioContext): boolean {
  try {
    ctx.createBuffer(1, 1, BASE_RATE / 2);
    return true;
  } catch {
    return false;
  }
}

function toBuffer(ctx: BaseAudioContext, ch: Channels, sr: number): AudioBuffer {
  const buffer = ctx.createBuffer(ch.length, ch[0].length, sr);
  for (let i = 0; i < ch.length; i += 1) {
    if (typeof buffer.copyToChannel === 'function') buffer.copyToChannel(ch[i] as Float32Array<ArrayBuffer>, i);
    else buffer.getChannelData(i).set(ch[i]);
  }
  return buffer;
}

function spawnWorker(): { worker: Worker; url: string } | null {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null;
  }
  const url = URL.createObjectURL(new Blob([renderWorkerSource()], { type: 'text/javascript' }));
  try {
    return { worker: new Worker(url, { name: 'nl-sound-render' }), url };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

export function createBufferStore(ctx: BaseAudioContext, options: { worker?: boolean } = {}): BufferStore {
  const half = halfRateSupported(ctx);
  const buffers = new Map<string, AudioBuffer>();
  const queued = new Set<string>();
  const listeners = new Set<(key: string) => void>();
  let impulseBuffer: AudioBuffer | null = null;
  let impulseRequested = false;
  let disposed = false;
  let pending = 0;
  let firstRequestAt: number | null = null;
  const stats: RenderStats = { rendered: 0, renderMs: 0, wallMs: null, mode: 'sync' };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const emit = (key: string) => {
    for (const cb of listeners) cb(key);
  };
  const doneOne = () => {
    pending = Math.max(0, pending - 1);
    if (pending === 0 && firstRequestAt !== null) stats.wallMs = now() - firstRequestAt;
  };
  const store = (key: string, ch: Channels, sr: number, ms: number) => {
    if (disposed) return;
    buffers.set(key, toBuffer(ctx, ch, sr));
    stats.rendered += 1;
    stats.renderMs += ms;
    emit(key);
  };
  const renderHere = (ref: SoundRef) => {
    const key = soundKey(ref);
    if (buffers.has(key)) return;
    const t0 = now();
    const sr = half ? core.rateFor(ref.id, BASE_RATE) : BASE_RATE;
    store(key, core.renderSound(ref, sr), sr, now() - t0);
  };
  const renderImpulseHere = () => {
    if (impulseBuffer || disposed) return;
    impulseBuffer = toBuffer(ctx, core.renderImpulse(ctx.sampleRate, IMPULSE_SECONDS, IMPULSE_DECAY), ctx.sampleRate);
    emit('impulse');
  };

  // Main-thread fallback queue: one sound per task.
  const mainQueue: SoundRef[] = [];
  let mainTimer: ReturnType<typeof setTimeout> | null = null;
  const pumpMain = () => {
    mainTimer = null;
    if (disposed) return;
    if (impulseRequested && !impulseBuffer) {
      renderImpulseHere();
      doneOne();
    } else {
      const ref = mainQueue.shift();
      if (!ref) return;
      renderHere(ref);
      doneOne();
    }
    if (mainQueue.length > 0) mainTimer = setTimeout(pumpMain, 0);
  };
  const startMain = (refs: readonly SoundRef[]) => {
    stats.mode = 'main';
    mainQueue.push(...refs);
    if (mainTimer === null) mainTimer = setTimeout(pumpMain, 0);
  };

  const refByKey = new Map<string, SoundRef>();
  let spawned = options.worker === false ? null : spawnWorker();
  if (spawned) {
    stats.mode = 'worker';
    spawned.worker.onmessage = (e: MessageEvent<WorkerAnswer>) => {
      const d = e.data;
      if (d.impulse && d.ch && d.sr) {
        if (!disposed && !impulseBuffer) {
          impulseBuffer = toBuffer(ctx, d.ch, d.sr);
          emit('impulse');
        }
      } else if (d.key && d.ch && d.sr) {
        store(d.key, d.ch, d.sr, d.ms ?? 0);
      }
      // A sound that failed in the worker stays silent (its cues are skipped); never throw here.
      doneOne();
    };
    spawned.worker.onerror = () => {
      // Fall back to the main thread for everything not rendered yet.
      const rest: SoundRef[] = [];
      for (const key of queued) if (!buffers.has(key)) rest.push(refByKey.get(key)!);
      spawned?.worker.terminate();
      if (spawned) URL.revokeObjectURL(spawned.url);
      spawned = null;
      pending = rest.length + (impulseRequested && !impulseBuffer ? 1 : 0);
      startMain(rest);
    };
  }

  return {
    get: (ref) => buffers.get(soundKey(ref)) ?? null,
    has: (ref) => buffers.has(soundKey(ref)),
    request(refs) {
      if (disposed) return;
      const fresh: SoundRef[] = [];
      for (const ref of refs) {
        const key = soundKey(ref);
        if (queued.has(key) || buffers.has(key)) continue;
        queued.add(key);
        refByKey.set(key, ref);
        fresh.push(ref);
      }
      const wantImpulse = !impulseRequested;
      impulseRequested = true;
      if (fresh.length === 0 && !wantImpulse) return;
      firstRequestAt ??= now();
      stats.wallMs = null;
      pending += fresh.length + (wantImpulse ? 1 : 0);
      if (spawned) {
        spawned.worker.postMessage({
          refs: fresh,
          base: BASE_RATE,
          half,
          impulse: wantImpulse ? { sr: ctx.sampleRate, seconds: IMPULSE_SECONDS, decay: IMPULSE_DECAY } : undefined,
        });
      } else {
        startMain(fresh);
      }
    },
    renderNow(refs) {
      const t0 = now();
      renderImpulseHere();
      for (const ref of refs) {
        queued.add(soundKey(ref));
        renderHere(ref);
      }
      impulseRequested = true;
      if (stats.mode === 'sync') stats.wallMs = now() - t0;
    },
    impulse: () => impulseBuffer,
    onReady(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    stats,
    dispose() {
      disposed = true;
      listeners.clear();
      if (mainTimer !== null) clearTimeout(mainTimer);
      if (spawned) {
        spawned.worker.terminate();
        URL.revokeObjectURL(spawned.url);
        spawned = null;
      }
    },
  };
}
