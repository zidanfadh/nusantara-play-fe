/**
 * Player input of the egrang race (Phase 23). Phone taps (left / right half of the play area) and the
 * keyboard (← / →, A / L) both become a foot and go through ONE function, `queueStep`, with the moment
 * they happened in simulation time. The page drains the queue per fixed step (`takeInputs`), so a step is
 * judged at the 1/120 s step in which it really happened, whatever the frame rate. Pure: no DOM.
 * tests/games/egrang-input.test.ts checks that taps and keys give identical races.
 */
import { DT } from './engine';
import type { Foot } from './types';

/** ← / A = left foot, → / L = right foot; anything else (and key repeat, handled by the page) = null. */
export function footFromKey(key: string): Foot | null {
  switch (key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'L';
    case 'ArrowRight':
    case 'l':
    case 'L':
      return 'R';
    default:
      return null;
  }
}

/** A tap or click at `clientX` in a play area starting at `left` with `width`: left half = left foot. */
export function footFromPointer(clientX: number, left: number, width: number): Foot {
  return clientX - left < width / 2 ? 'L' : 'R';
}

export interface QueuedStep {
  foot: Foot;
  /** Simulation time (world.t, s) when the step happened. */
  at: number;
}

export interface InputQueue {
  items: QueuedStep[];
}

export function createInputQueue(): InputQueue {
  return { items: [] };
}

/**
 * THE input function: a step with `foot` at simulation time `at`. A step stamped before the step that is
 * about to run (`now`, the world's current time) counts at that next step; it is never lost.
 */
export function queueStep(q: InputQueue, foot: Foot, at: number, now: number): void {
  const t = Math.max(at, now);
  // Keep the queue ordered by time (events can arrive out of order across sources).
  let i = q.items.length;
  while (i > 0 && q.items[i - 1].at > t) i -= 1;
  q.items.splice(i, 0, { foot, at: t });
}

/** The steps that belong to the fixed step ending at world time `stepEnd` (removed from the queue). */
export function takeInputs(q: InputQueue, stepEnd: number): Foot[] {
  const out: Foot[] = [];
  while (q.items.length && q.items[0].at <= stepEnd + 1e-9) out.push(q.items.shift()!.foot);
  return out;
}

export function clearInputs(q: InputQueue): void {
  q.items.length = 0;
}

/**
 * Maps the page's clock (ms, performance.now / event.timeStamp) to simulation time, with pauses (hidden
 * tab, tutorial, dialogs) taken out. `simAt(ms)` is where the simulation should be at that moment.
 */
export interface SimClock {
  /** Real ms at simulation time 0, shifted forward by every pause. */
  origin: number;
  pausedAt: number | null;
}

export function createSimClock(nowMs: number): SimClock {
  return { origin: nowMs, pausedAt: null };
}

export function simAt(c: SimClock, ms: number): number {
  return ((c.pausedAt ?? ms) - c.origin) / 1000;
}

export function pauseClock(c: SimClock, nowMs: number): void {
  if (c.pausedAt === null) c.pausedAt = nowMs;
}

export function resumeClock(c: SimClock, nowMs: number): void {
  if (c.pausedAt === null) return;
  c.origin += nowMs - c.pausedAt;
  c.pausedAt = null;
}

/** Simulation can fall at most this far behind real time (a long stall is skipped, not replayed). */
export const MAX_LAG_SECONDS = 12 * DT;
