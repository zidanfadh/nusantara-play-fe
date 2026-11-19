/**
 * The ONE shared AudioContext of the page (Phase 21), created lazily on first use, with its buffer store
 * and engine. The concept film and the intro bumper share it (one context, one set of rendered sounds).
 * Without Web Audio (old browser, tests) everything here returns null / false and the players stay silent.
 */
import { createBufferStore } from './buffers';
import { createEngine, type Engine } from './engine';

import { audioContextCtor } from './support';

export { audioContextCtor };

let shared: Engine | null = null;

/** The shared engine, created on first call; null without Web Audio or when creation fails. */
export function getSharedEngine(): Engine | null {
  if (shared) return shared;
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  try {
    const ctx = new Ctor();
    shared = createEngine(ctx, createBufferStore(ctx));
    return shared;
  } catch {
    return null;
  }
}

/** Tests only. */
export function resetSharedEngine(): void {
  shared = null;
}

function live(engine: Engine): AudioContext | null {
  const ctx = engine.ctx as AudioContext;
  return typeof ctx.resume === 'function' ? ctx : null;
}

/**
 * Tries to start the context without a gesture (autoplay). Resolves true when it runs. Browsers keep a
 * resume() without user activation pending, so it gives up after `timeoutMs`.
 */
export async function tryStart(engine: Engine, timeoutMs = 400): Promise<boolean> {
  const ctx = live(engine);
  if (!ctx) return false;
  if (ctx.state === 'running') return true;
  try {
    await Promise.race([ctx.resume(), new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
  } catch {
    return false;
  }
  return (ctx.state as string) === 'running';
}

/**
 * Starts the context inside a user gesture (a tap on "Nyalakan suara" or the sound toggle). Also plays a
 * one-sample silent buffer, which older iOS needs to unlock audio output.
 */
export function unlockInGesture(engine: Engine): Promise<boolean> {
  const ctx = live(engine);
  if (!ctx) return Promise.resolve(false);
  try {
    const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = silent;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // not needed on current browsers
  }
  return ctx
    .resume()
    .then(() => (ctx.state as string) === 'running')
    .catch(() => false);
}

/**
 * Output latency compensation (s): sounds are scheduled this much earlier so they are heard on their
 * frame. The display itself lags about one frame, so that much is subtracted; at most 80 ms.
 */
export function outputLead(ctx: BaseAudioContext): number {
  const c = ctx as Partial<AudioContext>;
  const latency = (c.outputLatency || 0) || (c.baseLatency || 0);
  return Math.min(0.08, Math.max(0, latency - 1 / 60));
}

/**
 * The context time that will be heard when the frame being drawn now reaches the screen (about one frame
 * from now), from AudioContext.getOutputTimestamp(); null where the browser has none yet (then the
 * scheduler falls back to currentTime and `outputLead`).
 */
export function heardAtNextFrame(ctx: BaseAudioContext): () => number | null {
  const c = ctx as AudioContext;
  return () => {
    if (typeof c.getOutputTimestamp !== 'function') return null;
    const ts = c.getOutputTimestamp();
    if (!ts.performanceTime || ts.contextTime === undefined) return null;
    return ts.contextTime + (performance.now() + 1000 / 60 - ts.performanceTime) / 1000;
  };
}

export function suspendContext(engine: Engine): void {
  const ctx = live(engine);
  if (ctx && ctx.state === 'running') void ctx.suspend().catch(() => {});
}

export function resumeContext(engine: Engine): void {
  const ctx = live(engine);
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

/**
 * iOS/iPadOS (Safari 17+, `navigator.audioSession`): type 'playback' makes Web Audio audible even with the
 * ring/silent switch on silent, like a video. Set while the visitor has sound on, back to 'auto' when the
 * sound is muted or the film closes. Elsewhere this does nothing.
 */
export function setPlaybackSession(on: boolean): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && 'type' in session) session.type = on ? 'playback' : 'auto';
  } catch {
    // not supported
  }
}
