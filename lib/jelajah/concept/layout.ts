/**
 * Composition of the concept video per screen shape (Phase 19): the scenes re-compose for portrait phones,
 * landscape phones and desktops instead of scaling one picture. Pure; tested in concept-clock.test.ts.
 */
export type ConceptLayout = 'portrait' | 'landscape' | 'desktop';

/** Portrait when taller than wide; landscape phone when wide but short; otherwise desktop. */
export function layoutFor(width: number, height: number): ConceptLayout {
  if (height > width) return 'portrait';
  if (height < 560) return 'landscape';
  return 'desktop';
}

/** Art boards (SVG viewBox) of the full-screen scenes, one per layout; drawn with `meet`, backgrounds bleed. */
export const STAGE: Readonly<Record<ConceptLayout, { w: number; h: number }>> = {
  portrait: { w: 400, h: 820 },
  landscape: { w: 900, h: 420 },
  desktop: { w: 1600, h: 1000 },
};
