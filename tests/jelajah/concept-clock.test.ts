import { afterEach, describe, expect, it } from 'vitest';
import { createConceptClock, type FrameApi } from '@/lib/jelajah/concept/clock';
import { layoutFor } from '@/lib/jelajah/concept/layout';
import { makeParticleSeeds, outlinePoints, PARTICLE_LIMITS, particleBudget } from '@/lib/jelajah/concept/particles';
import { CONCEPT_SCENES, CONCEPT_TOTAL_MS, FINAL_HOLD_MS, REDUCED_STEP_MS } from '@/lib/jelajah/concept/script';
import { CONCEPT_SEEN_KEY, hasSeenConcept, markConceptSeen, resetConceptMemoryForTests } from '@/lib/jelajah/concept/seen';
import {
  CONCEPT_END_MS,
  REDUCED_END_MS,
  REDUCED_TOTAL_MS,
  mountedScenes,
  reducedIndexAt,
  sceneIndexAt,
  sceneOpacity,
  stillTime,
} from '@/lib/jelajah/concept/timeline';
import type { ConceptEndReason } from '@/lib/jelajah/concept/types';
import { CONCEPT_PROVINCE_PATHS } from '@/lib/jelajah/concept/indonesia-paths';

/** Fake requestAnimationFrame: `step(ms)` runs one frame `ms` after the previous one. */
function fakeFrames() {
  let now = 1000;
  let pending: ((t: number) => void) | null = null;
  let nextId = 1;
  const api: FrameApi = {
    request: (cb) => {
      pending = cb;
      return nextId++;
    },
    cancel: () => {
      pending = null;
    },
    now: () => now,
  };
  return {
    api,
    step(ms: number) {
      now += ms;
      const cb = pending;
      pending = null;
      cb?.(now);
    },
    run(totalMs: number, frameMs = 16) {
      for (let t = 0; t < totalMs; t += frameMs) this.step(frameMs);
    },
    get pending() {
      return pending !== null;
    },
  };
}

function setup(endMs = CONCEPT_END_MS, holdAtMs = CONCEPT_TOTAL_MS) {
  const frames = fakeFrames();
  const times: number[] = [];
  const ends: ConceptEndReason[] = [];
  const clock = createConceptClock({ endMs, holdAtMs, frames: frames.api, onTime: (t) => times.push(t), onEnd: (r) => ends.push(r) });
  return { frames, times, ends, clock };
}

describe('concept clock (Phase 19)', () => {
  it('advances with the frames and ends by itself after the last scene plus the hold', () => {
    const { frames, clock, ends } = setup();
    clock.start();
    frames.run(10000);
    expect(clock.time).toBeGreaterThan(9900);
    expect(clock.time).toBeLessThanOrEqual(10000);
    frames.run(CONCEPT_END_MS);
    expect(ends).toEqual(['finished']);
    expect(clock.time).toBe(CONCEPT_END_MS);
    expect(CONCEPT_END_MS).toBe(CONCEPT_TOTAL_MS + FINAL_HOLD_MS);
  });

  it('caps a long stall (no scene is jumped over)', () => {
    const { frames, clock } = setup();
    clock.start();
    frames.step(16);
    frames.step(5000);
    expect(clock.time).toBeLessThanOrEqual(16 + 250);
  });

  it('pauses while the tab is hidden and resumes where it was', () => {
    const { frames, clock } = setup();
    clock.start();
    frames.run(2000);
    const at = clock.time;
    clock.setHidden(true);
    expect(clock.running).toBe(false);
    frames.run(5000);
    expect(clock.time).toBe(at);
    clock.setHidden(false);
    frames.step(16);
    expect(clock.time).toBeCloseTo(at + 16, 5);
  });

  it('skip ends at once with "skipped"; later calls are no-ops', () => {
    const { frames, clock, ends } = setup();
    clock.start();
    frames.run(500);
    clock.skip();
    clock.skip();
    clock.finish();
    clock.seek(20000);
    frames.run(1000);
    expect(ends).toEqual(['skipped']);
    expect(clock.ended).toBe(true);
  });

  it('finish (Mulai Menjelajah / Enter on the last scene) ends with "continued"', () => {
    const { clock, ends } = setup();
    clock.start();
    clock.seek(CONCEPT_TOTAL_MS - 100);
    clock.finish();
    expect(ends).toEqual(['continued']);
  });

  it('a touched last scene holds instead of continuing by itself', () => {
    const { frames, clock, ends } = setup();
    clock.start();
    clock.seek(CONCEPT_TOTAL_MS - 500);
    clock.hold();
    frames.run(10000);
    expect(ends).toEqual([]);
    expect(clock.time).toBe(CONCEPT_TOTAL_MS);
    expect(clock.running).toBe(false);
    clock.finish();
    expect(ends).toEqual(['continued']);
  });

  it('seek is deterministic and reports the time; seeking to the end finishes', () => {
    const { clock, times, ends } = setup();
    clock.start();
    clock.seek(21500);
    expect(times[times.length - 1]).toBe(21500);
    clock.seek(-50);
    expect(clock.time).toBe(0);
    clock.seek(CONCEPT_END_MS + 1);
    expect(ends).toEqual(['finished']);
  });

  it('manual pause (test hook) stops the frames', () => {
    const { frames, clock } = setup();
    clock.start();
    frames.run(300);
    clock.pause();
    const at = clock.time;
    frames.run(3000);
    expect(clock.time).toBe(at);
    clock.resume();
    frames.step(20);
    expect(clock.time).toBeCloseTo(at + 20, 5);
  });

  it('reduced motion: one still per 5 s, the same final hold', () => {
    const { frames, clock, ends } = setup(REDUCED_END_MS, REDUCED_TOTAL_MS);
    clock.start();
    frames.run(REDUCED_STEP_MS + 100);
    expect(reducedIndexAt(clock.time)).toBe(1);
    // "Lanjut" seeks to the next still.
    clock.seek(3 * REDUCED_STEP_MS);
    expect(reducedIndexAt(clock.time)).toBe(3);
    frames.run(REDUCED_END_MS);
    expect(ends).toEqual(['finished']);
    expect(REDUCED_TOTAL_MS).toBe(CONCEPT_SCENES.length * REDUCED_STEP_MS);
    expect(reducedIndexAt(REDUCED_END_MS)).toBe(CONCEPT_SCENES.length - 1);
  });
});

describe('concept timeline (Phase 19)', () => {
  it('scene index at each boundary', () => {
    for (let i = 0; i < CONCEPT_SCENES.length; i += 1) {
      expect(sceneIndexAt(CONCEPT_SCENES[i].start)).toBe(i);
      expect(sceneIndexAt(CONCEPT_SCENES[i].start - 1)).toBe(Math.max(0, i - 1));
    }
    expect(sceneIndexAt(-5)).toBe(0);
    expect(sceneIndexAt(99999)).toBe(CONCEPT_SCENES.length - 1);
  });

  it('cross-fades mount two scenes around a boundary, the new one fading in on top', () => {
    const b = CONCEPT_SCENES[1].start;
    expect(mountedScenes(b)).toEqual([0, 1]);
    expect(sceneOpacity(1, b - CONCEPT_SCENES[1].fadeIn / 2)).toBe(0);
    expect(sceneOpacity(1, b)).toBeCloseTo(0.5, 5);
    expect(sceneOpacity(1, b + CONCEPT_SCENES[1].fadeIn / 2)).toBe(1);
    expect(sceneOpacity(0, b + 400)).toBe(1); // the outgoing scene stays opaque underneath
    expect(mountedScenes(CONCEPT_SCENES[3].start + 2000)).toEqual([3]);
    expect(mountedScenes(CONCEPT_TOTAL_MS + 2000)).toEqual([CONCEPT_SCENES.length - 1]);
  });

  it('every still frame lies inside its scene', () => {
    CONCEPT_SCENES.forEach((s, i) => {
      expect(stillTime(i)).toBeGreaterThan(s.start);
      expect(stillTime(i)).toBeLessThanOrEqual(s.start + s.duration);
    });
  });
});

describe('concept seen flag (Phase 19)', () => {
  afterEach(() => resetConceptMemoryForTests());

  const memoryStore = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
  };
  const throwing = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };

  it('unseen at first; seen after marking (localStorage np_concept_seen_v1)', () => {
    const local = memoryStore();
    expect(hasSeenConcept({ local, session: null })).toBe(false);
    markConceptSeen({ local, session: null });
    expect(local.data.get(CONCEPT_SEEN_KEY)).toBe('1');
    resetConceptMemoryForTests();
    expect(hasSeenConcept({ local, session: null })).toBe(true);
    expect(CONCEPT_SEEN_KEY).toBe('np_concept_seen_v1');
  });

  it('localStorage throwing: falls back to sessionStorage (seen after one play in this tab)', () => {
    const session = memoryStore();
    expect(hasSeenConcept({ local: throwing, session })).toBe(false);
    markConceptSeen({ local: throwing, session });
    expect(session.data.get(CONCEPT_SEEN_KEY)).toBe('1');
    resetConceptMemoryForTests();
    expect(hasSeenConcept({ local: throwing, session })).toBe(true);
  });

  it('both storages throwing (or missing): the in-memory flag still counts for this page load', () => {
    expect(() => markConceptSeen({ local: throwing, session: throwing })).not.toThrow();
    expect(hasSeenConcept({ local: throwing, session: throwing })).toBe(true);
    resetConceptMemoryForTests();
    expect(hasSeenConcept({ local: throwing, session: throwing })).toBe(false);
    markConceptSeen({ local: null, session: null });
    expect(hasSeenConcept({ local: null, session: null })).toBe(true);
  });
});

describe('concept particles and layout (Phase 19)', () => {
  it('respects the tier limits; none on 2d, with reduced motion or after a low frame rate', () => {
    expect(PARTICLE_LIMITS).toEqual({ full: 300, lite: 120, '2d': 0 });
    expect(particleBudget('full', { reduced: false, lowFps: false })).toBe(300);
    expect(particleBudget('lite', { reduced: false, lowFps: false })).toBe(120);
    expect(particleBudget('2d', { reduced: false, lowFps: false })).toBe(0);
    expect(particleBudget(null, { reduced: false, lowFps: false })).toBe(0);
    expect(particleBudget('full', { reduced: true, lowFps: false })).toBe(0);
    expect(particleBudget('full', { reduced: false, lowFps: true })).toBe(0);
  });

  it('seeds are deterministic; outline points come from the generated paths', () => {
    expect(makeParticleSeeds(5)).toEqual(makeParticleSeeds(5));
    const pts = outlinePoints(CONCEPT_PROVINCE_PATHS);
    expect(pts.length).toBeGreaterThan(500);
    for (const [x, y] of pts.slice(0, 50)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
    }
  });

  it('layouts: portrait, landscape phone, desktop', () => {
    expect(layoutFor(390, 844)).toBe('portrait');
    expect(layoutFor(360, 740)).toBe('portrait');
    expect(layoutFor(844, 390)).toBe('landscape');
    expect(layoutFor(1440, 900)).toBe('desktop');
    expect(layoutFor(1920, 1080)).toBe('desktop');
    expect(layoutFor(1080, 1920)).toBe('portrait');
  });
});
