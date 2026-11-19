/**
 * Controller of the Jelajah intro bumper (Phase 16). Framework-free, so it is unit-tested with fake timers
 * (`tests/jelajah/bumper-timeline.test.ts`); `use-bumper-timeline.ts` wraps it for React.
 *
 * - Auto-advance: each scene stays `durations[i]` ms, then the next one starts; after the last scene the
 *   bumper ends ('finished').
 * - `next()` (tap, click, Enter) jumps to the next scene at once (or ends after the last one).
 * - `skip()` (Lewati, Esc) ends at once ('skipped').
 * - `setHidden(true)` (tab hidden) pauses the running scene and keeps its remaining time; `setHidden(false)`
 *   resumes it.
 * - `setAutoAdvance(false)` (reduced motion) stops the timer: the user advances manually.
 * Once ended, every method is a no-op.
 */

export type BumperEndReason = 'finished' | 'skipped';

export interface TimerApi {
  set: (fn: () => void, ms: number) => unknown;
  clear: (id: unknown) => void;
  now: () => number;
}

export interface BumperTimelineOptions {
  /** Milliseconds per scene; the length is the number of scenes (at least 1). */
  durations: readonly number[];
  autoAdvance: boolean;
  onScene?: (index: number) => void;
  onEnd?: (reason: BumperEndReason) => void;
  timers?: TimerApi;
}

export interface BumperTimeline {
  start(): void;
  next(): void;
  skip(): void;
  setHidden(hidden: boolean): void;
  setAutoAdvance(auto: boolean): void;
  dispose(): void;
  readonly index: number;
  readonly ended: boolean;
  /** True while the scene timer is not running although auto-advance is on (tab hidden). */
  readonly paused: boolean;
}

const defaultTimers: TimerApi = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
};

export function createBumperTimeline(options: BumperTimelineOptions): BumperTimeline {
  const { durations, onScene, onEnd } = options;
  const timers = options.timers ?? defaultTimers;
  if (durations.length === 0) throw new Error('A bumper needs at least one scene');

  let index = 0;
  let started = false;
  let ended = false;
  let hidden = false;
  let auto = options.autoAdvance;
  let timer: unknown = null;
  /** Time left of the current scene, and when the running timer was started. */
  let remaining = durations[0];
  let runningSince = 0;

  const stopTimer = () => {
    if (timer === null) return;
    timers.clear(timer);
    timer = null;
    remaining = Math.max(0, remaining - (timers.now() - runningSince));
  };

  const schedule = () => {
    if (!started || ended || hidden || !auto || timer !== null) return;
    runningSince = timers.now();
    timer = timers.set(() => {
      timer = null;
      advance();
    }, remaining);
  };

  const finish = (reason: BumperEndReason) => {
    if (ended) return;
    stopTimer();
    ended = true;
    onEnd?.(reason);
  };

  function advance() {
    if (ended) return;
    stopTimer();
    if (index >= durations.length - 1) {
      finish('finished');
      return;
    }
    index += 1;
    remaining = durations[index];
    onScene?.(index);
    schedule();
  }

  return {
    start() {
      if (started || ended) return;
      started = true;
      schedule();
    },
    next: () => {
      if (started) advance();
    },
    skip: () => finish('skipped'),
    setHidden(value) {
      if (value === hidden) return;
      hidden = value;
      if (hidden) stopTimer();
      else schedule();
    },
    setAutoAdvance(value) {
      if (value === auto) return;
      auto = value;
      if (auto) schedule();
      else stopTimer();
    },
    dispose() {
      stopTimer();
      ended = true;
    },
    get index() {
      return index;
    },
    get ended() {
      return ended;
    },
    get paused() {
      return auto && hidden && !ended;
    },
  };
}
