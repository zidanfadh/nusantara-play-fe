import { describe, expect, it } from 'vitest';
import {
  FALLBACK_RULES,
  fallbackMessage,
  fallbackStep,
  FpsWindow,
  INITIAL_FALLBACK_STATE,
  isDebugSearch,
  type FallbackInput,
  type FallbackState,
} from '@/lib/jelajah/perf';

/** Pushes frames at a fixed rate from `start` to `end` (ms). */
function feed(w: FpsWindow, fps: number, start: number, end: number) {
  for (let t = start; t <= end; t += 1000 / fps) w.push(t);
}

describe('FpsWindow (2 s average)', () => {
  it('is null until a full 2 s window was observed', () => {
    const w = new FpsWindow();
    feed(w, 60, 0, 1990);
    expect(w.fps(1990)).toBeNull();
    feed(w, 60, 2000, 2100);
    expect(w.fps(2100)).not.toBeNull();
  });

  it('averages the last 2 s only', () => {
    const w = new FpsWindow();
    feed(w, 60, 0, 3000);
    expect(w.fps(3000)).toBeCloseTo(60, 0);
    feed(w, 20, 3050, 6000); // the old 60 fps frames leave the window
    expect(w.fps(6000)).toBeCloseTo(20, 0);
  });

  it('a stall counts as missing frames', () => {
    const w = new FpsWindow();
    feed(w, 60, 0, 2000);
    expect(w.fps(3000)!).toBeLessThan(31); // no frames for the last second
  });

  it('reset starts over (tab hidden, new canvas)', () => {
    const w = new FpsWindow();
    feed(w, 60, 0, 3000);
    w.reset();
    expect(w.fps(3000)).toBeNull();
  });

  it('high refresh rates beyond the buffer still give the right average', () => {
    const w = new FpsWindow(2000, 128);
    feed(w, 240, 0, 3000);
    expect(w.fps(3000)).toBeCloseTo(240, -1);
  });
});

/** Runs the decision every 250 ms with a constant fps; returns when (ms) and to what it switched. */
function run(input: Omit<FallbackInput, 'now'>, untilMs: number, start = 0) {
  let state: FallbackState = INITIAL_FALLBACK_STATE;
  for (let now = start; now <= untilMs; now += 250) {
    const r = fallbackStep(state, { ...input, now });
    state = r.state;
    if (r.switchTo) return { at: now - start, to: r.switchTo };
  }
  return null;
}

describe('fallbackStep (automatic tier fallback)', () => {
  it('thresholds: full below 24 fps, lite below 20 fps, both for 5 s', () => {
    expect(FALLBACK_RULES.full).toEqual({ belowFps: 24, forMs: 5000, to: 'lite' });
    expect(FALLBACK_RULES.lite).toEqual({ belowFps: 20, forMs: 5000, to: '2d' });
  });

  it('full → lite after 5 s below 24 fps', () => {
    expect(run({ tier: 'full', manual: false, hidden: false, fps: 23.9 }, 20000)).toEqual({ at: 5000, to: 'lite' });
  });

  it('exactly 24 fps on full, or 20 fps on lite, is fine', () => {
    expect(run({ tier: 'full', manual: false, hidden: false, fps: 24 }, 20000)).toBeNull();
    expect(run({ tier: 'lite', manual: false, hidden: false, fps: 20 }, 20000)).toBeNull();
  });

  it('lite → 2d after another 5 s below 20 fps; 22 fps on lite stays lite', () => {
    expect(run({ tier: 'lite', manual: false, hidden: false, fps: 15 }, 20000)).toEqual({ at: 5000, to: '2d' });
    expect(run({ tier: 'lite', manual: false, hidden: false, fps: 22 }, 20000)).toBeNull();
  });

  it('timing: 4.75 s below is not enough; one good sample restarts the timer', () => {
    let state: FallbackState = INITIAL_FALLBACK_STATE;
    const step = (now: number, fps: number) => {
      const r = fallbackStep(state, { tier: 'full', manual: false, hidden: false, fps, now });
      state = r.state;
      return r.switchTo;
    };
    for (let now = 0; now < 5000; now += 250) expect(step(now, 18)).toBeNull();
    expect(step(5000, 30)).toBeNull(); // recovered just in time
    for (let now = 5250; now < 10250; now += 250) expect(step(now, 18)).toBeNull();
    expect(step(10250, 18)).toBe('lite');
  });

  it('a hidden tab pauses the measurement and restarts the timer', () => {
    let state: FallbackState = INITIAL_FALLBACK_STATE;
    const step = (now: number, hidden: boolean) => {
      const r = fallbackStep(state, { tier: 'full', manual: false, hidden, fps: 5, now });
      state = r.state;
      return r.switchTo;
    };
    for (let now = 0; now <= 4000; now += 250) expect(step(now, false)).toBeNull();
    for (let now = 4250; now <= 60000; now += 250) expect(step(now, true)).toBeNull(); // hidden for a minute
    expect(state.lowSince).toBeNull();
    for (let now = 60250; now < 65250; now += 250) expect(step(now, false)).toBeNull();
    expect(step(65250, false)).toBe('lite');
  });

  it('no average yet (warm-up, intro): no decision', () => {
    expect(run({ tier: 'full', manual: false, hidden: false, fps: null }, 20000)).toBeNull();
  });

  it('a manually chosen tier is never overridden', () => {
    expect(run({ tier: 'full', manual: true, hidden: false, fps: 3 }, 60000)).toBeNull();
    expect(run({ tier: 'lite', manual: true, hidden: false, fps: 3 }, 60000)).toBeNull();
  });

  it('2d is the last step', () => {
    expect(run({ tier: '2d', manual: false, hidden: false, fps: 1 }, 60000)).toBeNull();
  });

  it('keeps the same state object while nothing changes (no allocation per frame)', () => {
    const a = fallbackStep(INITIAL_FALLBACK_STATE, { tier: 'full', manual: false, hidden: false, fps: 10, now: 100 });
    const b = fallbackStep(a.state, { tier: 'full', manual: false, hidden: false, fps: 10, now: 350 });
    expect(b.state).toBe(a.state);
    expect(fallbackStep(INITIAL_FALLBACK_STATE, { tier: 'full', manual: false, hidden: false, fps: 60, now: 0 }).state).toBe(
      INITIAL_FALLBACK_STATE,
    );
  });

  it('toast texts', () => {
    expect(fallbackMessage('lite')).toBe('Beralih ke mode Ringan agar lebih lancar');
    expect(fallbackMessage('2d')).toBe('Beralih ke Peta 2D agar lebih lancar');
  });
});

describe('isDebugSearch', () => {
  it('only ?debug=1 turns the overlay on', () => {
    expect(isDebugSearch('?debug=1')).toBe(true);
    expect(isDebugSearch('?x=2&debug=1')).toBe(true);
    for (const s of ['', '?debug', '?debug=0', '?debug=true', '?Debug=1', '?debug=11']) expect(isDebugSearch(s)).toBe(false);
  });
});
