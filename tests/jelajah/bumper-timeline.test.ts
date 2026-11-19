import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBumperTimeline, type BumperEndReason } from '@/lib/jelajah/bumper/timeline';
import { BUMPER_DURATIONS, BUMPER_SCENES } from '@/lib/jelajah/bumper/scene-data';

function setup(durations: readonly number[] = [1000, 2000, 3000], autoAdvance = true) {
  const scenes: number[] = [];
  const ends: BumperEndReason[] = [];
  const t = createBumperTimeline({
    durations,
    autoAdvance,
    onScene: (i) => scenes.push(i),
    onEnd: (r) => ends.push(r),
  });
  return { t, scenes, ends };
}

describe('bumper timeline (Phase 16)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('storyboard: six scenes, 15 to 20 s in total, each about 3 s', () => {
    expect(BUMPER_SCENES.map((s) => s.id)).toEqual(['brand', 'prot', 'peta', 'game', 'komunitas', 'mulai']);
    const total = BUMPER_DURATIONS.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(15000);
    expect(total).toBeLessThanOrEqual(20000);
    for (const d of BUMPER_DURATIONS) expect(d).toBeGreaterThanOrEqual(2500);
  });

  it('advances on time and finishes after the last scene', () => {
    const { t, scenes, ends } = setup();
    t.start();
    vi.advanceTimersByTime(999);
    expect(t.index).toBe(0);
    vi.advanceTimersByTime(1);
    expect(scenes).toEqual([1]);
    vi.advanceTimersByTime(2000);
    expect(scenes).toEqual([1, 2]);
    vi.advanceTimersByTime(2999);
    expect(ends).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(ends).toEqual(['finished']);
    expect(t.ended).toBe(true);
  });

  it('does nothing before start()', () => {
    const { t, scenes } = setup();
    t.next();
    vi.advanceTimersByTime(10000);
    expect(scenes).toEqual([]);
  });

  it('next() jumps at once and restarts the timer for the new scene', () => {
    const { t, scenes } = setup();
    t.start();
    vi.advanceTimersByTime(900);
    t.next();
    expect(scenes).toEqual([1]);
    vi.advanceTimersByTime(1999);
    expect(t.index).toBe(1);
    vi.advanceTimersByTime(1);
    expect(t.index).toBe(2);
  });

  it('next() on the last scene finishes', () => {
    const { t, ends } = setup([1000, 1000]);
    t.start();
    t.next();
    t.next();
    expect(ends).toEqual(['finished']);
  });

  it('skip() ends once, and every later call is a no-op', () => {
    const { t, scenes, ends } = setup();
    t.start();
    t.skip();
    t.skip();
    t.next();
    vi.advanceTimersByTime(10000);
    expect(ends).toEqual(['skipped']);
    expect(scenes).toEqual([]);
  });

  it('pauses while the tab is hidden and resumes with the remaining time', () => {
    const { t, scenes } = setup();
    t.start();
    vi.advanceTimersByTime(600);
    t.setHidden(true);
    expect(t.paused).toBe(true);
    vi.advanceTimersByTime(60000);
    expect(scenes).toEqual([]);
    t.setHidden(false);
    expect(t.paused).toBe(false);
    vi.advanceTimersByTime(399);
    expect(scenes).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(scenes).toEqual([1]);
  });

  it('a bumper started in a hidden tab waits until it is visible', () => {
    const { t, scenes } = setup();
    t.setHidden(true);
    t.start();
    vi.advanceTimersByTime(5000);
    expect(scenes).toEqual([]);
    t.setHidden(false);
    vi.advanceTimersByTime(1000);
    expect(scenes).toEqual([1]);
  });

  it('reduced motion: no auto-advance, the user advances manually', () => {
    const { t, scenes, ends } = setup([1000, 1000], false);
    t.start();
    vi.advanceTimersByTime(60000);
    expect(scenes).toEqual([]);
    expect(t.paused).toBe(false);
    t.next();
    expect(scenes).toEqual([1]);
    vi.advanceTimersByTime(60000);
    expect(ends).toEqual([]);
    t.next();
    expect(ends).toEqual(['finished']);
  });

  it('switching auto-advance off mid-scene stops the timer; on again resumes the rest', () => {
    const { t, scenes } = setup();
    t.start();
    vi.advanceTimersByTime(700);
    t.setAutoAdvance(false);
    vi.advanceTimersByTime(5000);
    expect(scenes).toEqual([]);
    t.setAutoAdvance(true);
    vi.advanceTimersByTime(300);
    expect(scenes).toEqual([1]);
  });

  it('dispose() stops everything without calling onEnd', () => {
    const { t, scenes, ends } = setup();
    t.start();
    t.dispose();
    vi.advanceTimersByTime(10000);
    expect(scenes).toEqual([]);
    expect(ends).toEqual([]);
  });

  it('needs at least one scene', () => {
    expect(() => createBumperTimeline({ durations: [], autoAdvance: true })).toThrow();
  });
});
