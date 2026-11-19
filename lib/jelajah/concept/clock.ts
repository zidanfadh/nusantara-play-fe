/**
 * The ONE clock of the concept video (Phase 19). Framework-free, driven by requestAnimationFrame (or a
 * fake frame source in tests), so pause, resume, skip and seeking are deterministic. Tested in
 * tests/jelajah/concept-clock.test.ts.
 *
 * - Film time advances by the real frame interval, capped at `maxStepMs` per frame (a long stall slows
 *   the film down instead of jumping over a scene).
 * - At `endMs` the film ends by itself ('finished'). `hold()` (the viewer touched the last scene) stops
 *   the clock at `holdAtMs` instead, so the last scene stays until "Mulai Menjelajah".
 * - `setHidden(true)` (tab hidden) and `pause()` stop the frames and keep the time; resuming continues
 *   exactly there.
 * - `skip()` ends with 'skipped', `finish()` (Mulai Menjelajah, Enter/Space on the last scene) with
 *   'continued'. Once ended, every method is a no-op.
 */
import type { ConceptEndReason } from './types';

export interface FrameApi {
  request: (cb: (now: number) => void) => unknown;
  cancel: (id: unknown) => void;
  now: () => number;
}

export interface ConceptClockOptions {
  endMs: number;
  /** Where a held clock stops (the end of the last scene). */
  holdAtMs: number;
  onTime: (t: number) => void;
  onEnd: (reason: ConceptEndReason) => void;
  frames?: FrameApi;
  maxStepMs?: number;
}

export interface ConceptClock {
  start(): void;
  pause(): void;
  resume(): void;
  setHidden(hidden: boolean): void;
  seek(ms: number): void;
  hold(): void;
  skip(): void;
  finish(): void;
  dispose(): void;
  readonly time: number;
  readonly running: boolean;
  readonly ended: boolean;
  readonly held: boolean;
}

export const DEFAULT_MAX_STEP_MS = 250;

const browserFrames: FrameApi = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id as number),
  now: () => performance.now(),
};

export function createConceptClock(options: ConceptClockOptions): ConceptClock {
  const { endMs, holdAtMs, onTime, onEnd } = options;
  const frames = options.frames ?? browserFrames;
  const maxStep = options.maxStepMs ?? DEFAULT_MAX_STEP_MS;

  let time = 0;
  let started = false;
  let ended = false;
  let hidden = false;
  let paused = false;
  let held = false;
  let frameId: unknown = null;
  let last = 0;

  const stopFrames = () => {
    if (frameId === null) return;
    frames.cancel(frameId);
    frameId = null;
  };

  const end = (reason: ConceptEndReason) => {
    if (ended) return;
    stopFrames();
    ended = true;
    onEnd(reason);
  };

  const atHold = () => held && time >= holdAtMs;
  const shouldRun = () => started && !ended && !hidden && !paused && !atHold();

  const tick = (now: number) => {
    frameId = null;
    if (!shouldRun()) return;
    const dt = Math.min(maxStep, Math.max(0, now - last));
    last = now;
    time += dt;
    if (held && time >= holdAtMs) {
      time = holdAtMs;
      onTime(time);
      return; // stays on the last scene; no more frames until the viewer continues
    }
    if (time >= endMs) {
      time = endMs;
      onTime(time);
      end('finished');
      return;
    }
    onTime(time);
    frameId = frames.request(tick);
  };

  const schedule = () => {
    if (!shouldRun() || frameId !== null) return;
    last = frames.now();
    frameId = frames.request(tick);
  };

  return {
    start() {
      if (started || ended) return;
      started = true;
      onTime(time);
      schedule();
    },
    pause() {
      if (ended) return;
      paused = true;
      stopFrames();
    },
    resume() {
      if (ended) return;
      paused = false;
      schedule();
    },
    setHidden(value) {
      if (ended || value === hidden) return;
      hidden = value;
      if (hidden) stopFrames();
      else schedule();
    },
    seek(ms) {
      if (ended) return;
      time = Math.max(0, Math.min(ms, endMs));
      if (held && time < holdAtMs) held = false;
      onTime(time);
      if (time >= endMs) {
        end('finished');
        return;
      }
      stopFrames();
      schedule();
    },
    hold() {
      if (ended || held) return;
      held = true;
      if (time >= holdAtMs) {
        time = Math.min(time, endMs);
        stopFrames();
      }
    },
    skip: () => end('skipped'),
    finish: () => end('continued'),
    dispose() {
      stopFrames();
      ended = true;
    },
    get time() {
      return time;
    },
    get running() {
      return frameId !== null;
    },
    get ended() {
      return ended;
    },
    get held() {
      return held;
    },
  };
}
