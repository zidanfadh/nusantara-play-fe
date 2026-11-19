import { describe, expect, it } from 'vitest';
import { boardGeometry, type BoardOrientation } from '@/lib/games/congklak/layout';
import { storeIndex } from '@/lib/games/congklak/state';
import {
  storeLabelPlacement,
  storeLabelWidth,
  storeSeedReach,
  type StoreLabelBox,
} from '@/components/games/congklak/store-label';

/** Shortest distance from the store centre to the pill rectangle. */
function distanceToBox(cx: number, cy: number, b: StoreLabelBox): number {
  const dx = Math.max(Math.abs(cx - b.x) - b.width / 2, 0);
  const dy = Math.max(Math.abs(cy - b.y) - b.height / 2, 0);
  return Math.hypot(dx, dy);
}

describe('congklak store label (Phase 18)', () => {
  const orientations: BoardOrientation[] = ['horizontal', 'vertical'];

  it.each(orientations)('never overlaps the seeds and stays on the board (%s)', (orientation) => {
    const geometry = boardGeometry(orientation);
    for (const owner of [0, 1] as const) {
      const g = geometry.pits[storeIndex(owner)];
      // Every count a store can hold with the default rules (98 seeds), the widest pill included.
      for (const count of [0, 7, 11, 26, 49, 98]) {
        const { count: pill } = storeLabelPlacement(g, orientation, count);
        expect(distanceToBox(g.x, g.y, pill)).toBeGreaterThan(storeSeedReach());
        expect(pill.x - pill.width / 2).toBeGreaterThanOrEqual(0);
        expect(pill.x + pill.width / 2).toBeLessThanOrEqual(geometry.width);
        expect(pill.y - pill.height / 2).toBeGreaterThanOrEqual(0);
        expect(pill.y + pill.height / 2).toBeLessThanOrEqual(geometry.height);
      }
    }
  });

  it.each(orientations)('puts the owner name on the other end, clear of the seeds (%s)', (orientation) => {
    const geometry = boardGeometry(orientation);
    const g = geometry.pits[storeIndex(0)];
    const { count: pill, name } = storeLabelPlacement(g, orientation, 26);
    expect(Math.hypot(name.x - g.x, name.y - g.y)).toBeGreaterThan(storeSeedReach());
    // opposite sides of the centre
    if (orientation === 'horizontal') expect(Math.sign(pill.y - g.y)).toBe(-Math.sign(name.y - g.y));
    else expect(Math.sign(pill.x - g.x)).toBe(-Math.sign(name.x - g.x));
  });

  it('widens the pill for two digits', () => {
    expect(storeLabelWidth(26)).toBeGreaterThan(storeLabelWidth(7));
  });
});
