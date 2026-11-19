/**
 * Cue scheduler (Phase 21): plays a cue sheet in sync with a player's OWN clock (the concept film's
 * clock, not wall time). Framework-free; tested with a fake AudioContext in tests/audio/scheduler.test.ts.
 *
 * - `update(clockMs)` is called every frame with the film time. Cues whose time falls within the
 *   lookahead (200 ms, or 1.5 frames when frames are slower) are scheduled on the AudioContext at
 *   `anchorCtx + (cue − anchorClock)`, minus the output latency (`leadSec`), so each sound is heard on
 *   its frame.
 * - A jump of the clock (seek: test hook, reduced motion's "Lanjut", a long stall) cancels the group's
 *   voices and restarts from the new time: long sounds marked `resumable` (beds, pads, drones, the gong)
 *   continue part-way through, short ones in the past are skipped. Nothing fires twice.
 * - Drift between the film clock and the audio clock (the film clock slows down on frames longer than
 *   250 ms; the context runs on its own) beyond `driftMs` re-anchors: voices not started yet are
 *   cancelled and scheduled again from the new mapping.
 * - Pause / hidden tab: the player suspends the context (its time stops with the film's), so nothing
 *   needs rescheduling.
 * - A cue whose sound is not rendered yet waits; when it arrives late it is skipped (short) or resumed
 *   part-way (resumable).
 * - Automation (music lowpass, pitch bend, voice-over duck) is a list of ramps on the same clock; after
 *   a seek the parameters jump to their value at the new time.
 * - `scheduleAll()` schedules the whole sheet at once on an OfflineAudioContext (the WAV render).
 */
import type { SoundRef } from './core';
import { CUTOFF_OPEN, type Bus, type Engine } from './engine';

export interface Cue {
  /** Unique within the sheet. */
  id: string;
  /** Clock time, ms. */
  at: number;
  ref: SoundRef;
  bus: Bus;
  gain: number;
  pan?: number;
  panTo?: number;
  rate?: number;
  rateTo?: number;
  /** Length, ms (with `release`); otherwise the whole sound. */
  dur?: number;
  fadeIn?: number;
  release?: number;
  wet?: number;
  /** A long sound that continues part-way through after a seek or a late start. */
  resumable?: boolean;
  /** The scene the cue belongs to, and what it is synced to (sync log, tests). */
  scene: string;
  beat: string;
  /** Reduced motion: part of the music bed or the scene's key hits (documentation only). */
  key?: boolean;
}

export type AutoParam = 'cutoff' | 'bend' | 'duck';

export interface Automation {
  param: AutoParam;
  from: number;
  to: number;
  v0: number;
  v1: number;
  curve?: 'linear' | 'exp';
  scene: string;
}

export const PARAM_DEFAULTS: Record<AutoParam, number> = { cutoff: CUTOFF_OPEN, bend: 0, duck: 1 };

/** Value of a parameter at clock time `t` from its ramps (the default before the first one). */
export function automationValueAt(list: readonly Automation[], param: AutoParam, t: number): number {
  let value = PARAM_DEFAULTS[param];
  for (const a of list) {
    if (a.param !== param || a.from > t) continue;
    if (t >= a.to) value = a.v1;
    else {
      const k = a.to > a.from ? (t - a.from) / (a.to - a.from) : 1;
      value = a.curve === 'exp' && a.v0 > 0 && a.v1 > 0 ? a.v0 * (a.v1 / a.v0) ** k : a.v0 + (a.v1 - a.v0) * k;
    }
  }
  return value;
}

export interface SyncEntry {
  id: string;
  beat: string;
  /** The cue's clock time (the visual beat). */
  at: number;
  /** Film clock and context time when it was scheduled, and its context start time. */
  clockMs: number;
  ctxNow: number;
  when: number;
  /** When it will be heard on the film clock minus `at`, ms (+ = late). */
  offsetMs: number;
}

export interface SchedulerOptions {
  engine: Engine;
  cues: readonly Cue[];
  automation?: readonly Automation[];
  group: string;
  lookaheadMs?: number;
  /** A cue this late (ms) still plays; later ones are skipped or resumed. */
  lateMs?: number;
  /** A clock step larger than this (ms) is a seek. */
  jumpMs?: number;
  /** Re-anchor when the audio clock and the film clock drift apart by more than this (ms). */
  driftMs?: number;
  /** Output latency compensation (s): sounds are scheduled this much earlier. */
  leadSec?: number;
  /** Most entries kept in the sync log. */
  logLimit?: number;
}

export interface Scheduler {
  update(clockMs: number, frameGapMs?: number): void;
  seek(clockMs: number): void;
  /** Re-anchors at the current clock time (after the context resumed, or the sound was turned on). */
  resync(clockMs: number): void;
  stop(fadeMs: number): void;
  scheduleAll(startSec?: number): void;
  readonly log: readonly SyncEntry[];
  /** How often each cue started a voice (tests: never more than once per pass). */
  readonly fired: ReadonlyMap<string, number>;
  readonly stopped: boolean;
}

const IDLE = 0;
const FIRED = 1;
const SKIPPED = 2;

type Param = AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };

export function createScheduler(options: SchedulerOptions): Scheduler {
  const { engine, group } = options;
  const ctx = engine.ctx;
  const cues = [...options.cues].sort((a, b) => a.at - b.at);
  const automation = [...(options.automation ?? [])].sort((a, b) => a.from - b.from);
  const lookahead = options.lookaheadMs ?? 200;
  const lateOk = options.lateMs ?? 60;
  const jump = options.jumpMs ?? 400;
  const driftLimit = (options.driftMs ?? 60) / 1000;
  let lead = options.leadSec ?? 0;
  const logLimit = options.logLimit ?? 2000;

  const status = new Uint8Array(cues.length);
  const autoDone = new Uint8Array(automation.length);
  const fired = new Map<string, number>();
  const log: SyncEntry[] = [];
  let lo = 0;
  let anchorClock: number | null = null;
  let anchorCtx = 0;
  let last = 0;
  let stopped = false;

  const toCtx = (ms: number) => anchorCtx + (ms - (anchorClock ?? 0)) / 1000 - lead;
  const paramOf = (p: AutoParam): Param | null => engine.params[p] as Param | null;
  const usedParams = [...new Set(automation.map((a) => a.param))];

  const anchor = (clockMs: number) => {
    anchorClock = clockMs;
    anchorCtx = ctx.currentTime;
    last = clockMs;
  };

  /** Parameters jump to their value at `clockMs`; ramps in progress continue from there. */
  const applyAutomationAt = (clockMs: number) => {
    const now = ctx.currentTime;
    for (const name of usedParams) {
      const p = paramOf(name);
      if (!p) continue;
      if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(now);
      else p.cancelScheduledValues(now);
      p.setValueAtTime(automationValueAt(automation, name, clockMs), now);
    }
    automation.forEach((a, i) => {
      autoDone[i] = 0;
      if (a.to <= clockMs) autoDone[i] = 1;
      else if (a.from <= clockMs) {
        const p = paramOf(a.param);
        if (p) ramp(p, a, Math.max(now + 0.005, toCtx(a.to)));
        autoDone[i] = 1;
      }
    });
  };

  const ramp = (p: Param, a: Automation, at: number) => {
    if (a.curve === 'exp' && a.v1 > 0) p.exponentialRampToValueAtTime(a.v1, at);
    else p.linearRampToValueAtTime(a.v1, at);
  };

  const scheduleAutomation = (horizon: number) => {
    const now = ctx.currentTime;
    automation.forEach((a, i) => {
      if (autoDone[i] || a.from > horizon) return;
      autoDone[i] = 1;
      const p = paramOf(a.param);
      if (!p) return;
      const from = Math.max(now, toCtx(a.from));
      p.setValueAtTime(a.v0, from);
      ramp(p, a, Math.max(from + 0.005, toCtx(a.to)));
    });
  };

  const count = (cue: Cue) => fired.set(cue.id, (fired.get(cue.id) ?? 0) + 1);

  const tryFire = (i: number, clockMs: number) => {
    const cue = cues[i];
    const late = clockMs - cue.at;
    const buffer = engine.store.get(cue.ref);
    const rate = cue.rate ?? 1;
    if (!buffer) {
      // Not rendered yet: wait, unless it can no longer play.
      const maxLen = cue.dur ?? 8000;
      if (late > lateOk && (!cue.resumable || late > maxLen - 150)) status[i] = SKIPPED;
      return;
    }
    const len = cue.dur ?? (buffer.duration * 1000) / rate;
    const common = {
      ref: cue.ref,
      bus: cue.bus,
      group,
      gain: cue.gain,
      rate,
      rateTo: cue.rateTo,
      wet: cue.wet,
      release: cue.release !== undefined ? cue.release / 1000 : undefined,
      tag: String(i),
    };
    if (late > lateOk) {
      if (cue.resumable && late < len - 150) {
        const k = late / len;
        const pan = cue.pan !== undefined && cue.panTo !== undefined ? cue.pan + (cue.panTo - cue.pan) * k : cue.pan;
        engine.play({
          ...common,
          when: ctx.currentTime,
          offset: (late / 1000) * rate,
          pan,
          panTo: cue.panTo,
          dur: cue.dur !== undefined ? (cue.dur - late) / 1000 : undefined,
          fadeIn: 0.04,
        });
        status[i] = FIRED;
        count(cue);
      } else {
        status[i] = SKIPPED;
      }
      return;
    }
    const now = ctx.currentTime;
    const when = Math.max(now, toCtx(cue.at));
    const voice = engine.play({
      ...common,
      when,
      pan: cue.pan,
      panTo: cue.panTo,
      dur: cue.dur !== undefined ? cue.dur / 1000 : undefined,
      fadeIn: cue.fadeIn !== undefined ? cue.fadeIn / 1000 : undefined,
    });
    status[i] = voice ? FIRED : SKIPPED;
    if (!voice) return;
    count(cue);
    if (log.length < logLimit) {
      const offsetMs = (when + lead - now) * 1000 + clockMs - cue.at;
      log.push({ id: cue.id, beat: cue.beat, at: cue.at, clockMs, ctxNow: now, when, offsetMs });
    }
  };

  const pump = (clockMs: number, gapMs: number) => {
    const horizon = clockMs + Math.max(lookahead, gapMs * 1.5);
    while (lo < cues.length && status[lo] !== IDLE) lo += 1;
    for (let i = lo; i < cues.length && cues[i].at <= horizon; i += 1) {
      if (status[i] === IDLE) tryFire(i, clockMs);
    }
    scheduleAutomation(horizon);
  };

  const scheduler: Scheduler = {
    update(clockMs, frameGapMs = 16) {
      if (stopped) return;
      if (anchorClock === null) {
        anchor(clockMs);
        applyAutomationAt(clockMs);
      } else if (clockMs < last - 1 || clockMs - last > jump) {
        scheduler.seek(clockMs);
        return;
      } else {
        const predicted = anchorCtx + (clockMs - anchorClock) / 1000;
        if (Math.abs(ctx.currentTime - predicted) > driftLimit) scheduler.resync(clockMs);
      }
      last = clockMs;
      pump(clockMs, frameGapMs);
    },
    seek(clockMs) {
      if (stopped) return;
      engine.fadeGroup(group, 25);
      status.fill(IDLE);
      lo = 0;
      anchor(clockMs);
      applyAutomationAt(clockMs);
      pump(clockMs, 16);
    },
    resync(clockMs) {
      if (stopped) return;
      for (const tag of engine.cancelPending(group)) {
        const i = Number(tag);
        if (status[i] === FIRED) {
          status[i] = IDLE;
          fired.set(cues[i].id, (fired.get(cues[i].id) ?? 1) - 1);
          if (i < lo) lo = i;
        }
      }
      anchor(clockMs);
      applyAutomationAt(clockMs);
    },
    stop(fadeMs) {
      if (stopped) return;
      stopped = true;
      engine.fadeGroup(group, fadeMs);
      // Leave the shared parameters as they were before the film once the fade is over.
      const at = ctx.currentTime + fadeMs / 1000 + 0.05;
      for (const name of usedParams) paramOf(name)?.setValueAtTime(PARAM_DEFAULTS[name], at);
    },
    scheduleAll(startSec = 0) {
      lead = 0;
      anchorClock = 0;
      anchorCtx = startSec;
      for (const name of usedParams) paramOf(name)?.setValueAtTime(automationValueAt(automation, name, 0), startSec);
      for (let i = 0; i < cues.length; i += 1) tryFire(i, cues[i].at);
      scheduleAutomation(Infinity);
    },
    get log() {
      return log;
    },
    get fired() {
      return fired;
    },
    get stopped() {
      return stopped;
    },
  };
  return scheduler;
}
