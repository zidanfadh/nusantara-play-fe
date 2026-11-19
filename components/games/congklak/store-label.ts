/**
 * Where a store's seed total and owner name sit (Phase 18). Before, the total was written at the store's
 * centre, on top of the seeds, and was hard to read. Now the total is a solid pill at one end of the store
 * and the name at the other end, both outside the seed cluster in both board orientations. Pure, tested.
 */
import { SEED_RADIUS, seedOffsets, MAX_DRAWN_SEEDS, type BoardOrientation, type PitGeometry } from '@/lib/games/congklak/layout';

export interface StoreLabelBox {
  /** Pill centre. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StoreLabelPlacement {
  count: StoreLabelBox;
  /** Baseline position of the owner name (text-anchor middle). */
  name: { x: number; y: number };
}

export const STORE_LABEL_HEIGHT = 38;
export const STORE_LABEL_FONT_SIZE = 26;

/** Pill width for a number (stores hold at most 98 seeds with the default rules; 3 digits still fit). */
export function storeLabelWidth(count: number): number {
  const digits = String(Math.max(0, Math.floor(count))).length;
  return 26 + digits * 16;
}

/** The farthest any drawn seed reaches from the store centre (seed edge included). */
export function storeSeedReach(): number {
  const offsets = seedOffsets(MAX_DRAWN_SEEDS.store, 'store');
  return Math.max(...offsets.map((o) => Math.hypot(o.dx, o.dy))) + SEED_RADIUS;
}

export function storeLabelPlacement(
  g: PitGeometry,
  orientation: BoardOrientation,
  count: number,
): StoreLabelPlacement {
  const width = storeLabelWidth(count);
  const height = STORE_LABEL_HEIGHT;
  if (orientation === 'horizontal') {
    // Tall store: total at the top end, name at the bottom end.
    return {
      count: { x: g.x, y: g.y - g.ry + 30, width, height },
      name: { x: g.x, y: g.y + g.ry - 16 },
    };
  }
  // Wide store (portrait phones): total at the left end, name at the right end.
  return {
    count: { x: g.x - g.rx + 36, y: g.y, width, height },
    name: { x: g.x + g.rx - 36, y: g.y + 5 },
  };
}
