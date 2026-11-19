/**
 * Pure timing helpers of the concept video (Phase 19): which scene is on screen at a time, which scenes
 * are mounted around a cross-fade, and the reduced-motion mapping. Tested in tests/jelajah/concept-clock.test.ts.
 */
import { CONCEPT_SCENES, CONCEPT_TOTAL_MS, FINAL_HOLD_MS, REDUCED_STEP_MS } from './script';
import type { ConceptScene } from './types';

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** 0 before `a`, 1 after `b`, linear in between. */
export const seg = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a)));
export const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
export const easeInCubic = (x: number) => x ** 3;
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Index of the scene on screen at film time `t` (ms); clamped to the first and last scene. */
export function sceneIndexAt(t: number, scenes: readonly ConceptScene[] = CONCEPT_SCENES): number {
  let index = 0;
  for (let i = 0; i < scenes.length; i += 1) if (t >= scenes[i].start) index = i;
  return index;
}

/** Time window in which scene `i` is mounted: half its fade-in before it starts to half the next fade-in after it. */
export function sceneWindow(i: number, scenes: readonly ConceptScene[] = CONCEPT_SCENES): [number, number] {
  const s = scenes[i];
  const next = scenes[i + 1];
  const from = i === 0 ? -Infinity : s.start - s.fadeIn / 2;
  const to = next ? s.start + s.duration + next.fadeIn / 2 : Infinity;
  return [from, to];
}

/** Scenes to render at time `t` (one, or two during a cross-fade), in paint order. */
export function mountedScenes(t: number, scenes: readonly ConceptScene[] = CONCEPT_SCENES): number[] {
  const out: number[] = [];
  for (let i = 0; i < scenes.length; i += 1) {
    const [from, to] = sceneWindow(i, scenes);
    if (t >= from && t < to) out.push(i);
  }
  return out.length > 0 ? out : [sceneIndexAt(t, scenes)];
}

/**
 * Opacity of scene `i` at time `t`: the incoming scene fades in ON TOP of the outgoing one (which stays
 * opaque until it is unmounted), so a cross-fade never dips to black.
 */
export function sceneOpacity(i: number, t: number, scenes: readonly ConceptScene[] = CONCEPT_SCENES): number {
  const s = scenes[i];
  if (i === 0 || s.fadeIn <= 0) return 1;
  return easeInOutCubic(seg(t, s.start - s.fadeIn / 2, s.start + s.fadeIn / 2));
}

/** The film clock runs to the end of the last scene plus the final hold, then continues to the map. */
export const CONCEPT_END_MS = CONCEPT_TOTAL_MS + FINAL_HOLD_MS;

/** Reduced motion: one still per REDUCED_STEP_MS, then the same final hold. */
export const REDUCED_TOTAL_MS = CONCEPT_SCENES.length * REDUCED_STEP_MS;
export const REDUCED_END_MS = REDUCED_TOTAL_MS + FINAL_HOLD_MS;

export function reducedIndexAt(t: number, count: number = CONCEPT_SCENES.length): number {
  return Math.max(0, Math.min(count - 1, Math.floor(t / REDUCED_STEP_MS)));
}

/** Film time of the still frame of scene `i` (its `still` progress). */
export function stillTime(i: number, scenes: readonly ConceptScene[] = CONCEPT_SCENES): number {
  const s = scenes[i];
  return s.start + s.still * s.duration;
}

/** Midpoint of scene `i` (screenshots). */
export function midTime(i: number, scenes: readonly ConceptScene[] = CONCEPT_SCENES): number {
  const s = scenes[i];
  return s.start + s.duration / 2;
}
