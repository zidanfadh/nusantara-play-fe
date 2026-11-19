/**
 * Board geometry of the congklak page (Phase 17), in SVG user units. Pure, tested.
 *
 * - horizontal (landscape, desktop): player 1's holes on top (right to left), player 0's at the bottom (left
 *   to right), player 1's store on the left, player 0's store on the right.
 * - vertical (portrait phones): two columns of 7; player 0 on the right (bottom to top), player 1 on the
 *   left (top to bottom), player 0's store at the top, player 1's at the bottom.
 *
 * Both follow the ring order of state.ts, so sowing runs anticlockwise on screen.
 */
import { DEFAULT_RULES, type CongklakRules } from './rules';
import { holeIndex, storeIndex, type Player } from './state';

export type BoardOrientation = 'horizontal' | 'vertical';

export interface PitGeometry {
  pit: number;
  kind: 'hole' | 'store';
  owner: Player;
  /** Hole number within its side (0 .. n-1); -1 for a store. */
  hole: number;
  x: number;
  y: number;
  /** Hole radius, or the store's half axes. */
  rx: number;
  ry: number;
  /** Where the seed count is written (outside the hole, on the board edge side). */
  labelX: number;
  labelY: number;
}

export interface BoardGeometry {
  orientation: BoardOrientation;
  width: number;
  height: number;
  /** Indexed by ring index. */
  pits: PitGeometry[];
}

export const HOLE_RADIUS = { horizontal: 40, vertical: 46 } as const;

export function boardGeometry(orientation: BoardOrientation, rules: CongklakRules = DEFAULT_RULES): BoardGeometry {
  const n = rules.holesPerSide;
  const pits: PitGeometry[] = new Array(2 * n + 2);
  if (orientation === 'horizontal') {
    const R = HOLE_RADIUS.horizontal;
    const width = 1000;
    const height = 360;
    const x0 = 210;
    const step = (790 - x0) / Math.max(1, n - 1);
    for (let h = 0; h < n; h++) {
      const bottom = holeIndex(0, h, rules);
      pits[bottom] = { pit: bottom, kind: 'hole', owner: 0, hole: h, x: x0 + h * step, y: 250, rx: R, ry: R, labelX: x0 + h * step, labelY: 250 + R + 26 };
      const top = holeIndex(1, h, rules);
      const tx = x0 + (n - 1 - h) * step;
      pits[top] = { pit: top, kind: 'hole', owner: 1, hole: h, x: tx, y: 110, rx: R, ry: R, labelX: tx, labelY: 110 - R - 26 };
    }
    const s0 = storeIndex(0, rules);
    const s1 = storeIndex(1, rules);
    pits[s0] = { pit: s0, kind: 'store', owner: 0, hole: -1, x: 915, y: 180, rx: 58, ry: 120, labelX: 915, labelY: 180 };
    pits[s1] = { pit: s1, kind: 'store', owner: 1, hole: -1, x: 85, y: 180, rx: 58, ry: 120, labelX: 85, labelY: 180 };
    return { orientation, width, height, pits };
  }
  const R = HOLE_RADIUS.vertical;
  const width = 360;
  const height = 980;
  const y0 = 200;
  const step = (788 - y0) / Math.max(1, n - 1);
  for (let h = 0; h < n; h++) {
    const right = holeIndex(0, h, rules);
    const ry = y0 + (n - 1 - h) * step;
    pits[right] = { pit: right, kind: 'hole', owner: 0, hole: h, x: 255, y: ry, rx: R, ry: R, labelX: 255 + R + 22, labelY: ry };
    const left = holeIndex(1, h, rules);
    const ly = y0 + h * step;
    pits[left] = { pit: left, kind: 'hole', owner: 1, hole: h, x: 105, y: ly, rx: R, ry: R, labelX: 105 - R - 22, labelY: ly };
  }
  const s0 = storeIndex(0, rules);
  const s1 = storeIndex(1, rules);
  pits[s0] = { pit: s0, kind: 'store', owner: 0, hole: -1, x: 180, y: 80, rx: 125, ry: 58, labelX: 180, labelY: 80 };
  pits[s1] = { pit: s1, kind: 'store', owner: 1, hole: -1, x: 180, y: 908, rx: 125, ry: 58, labelX: 180, labelY: 908 };
  return { orientation, width, height, pits };
}

/** Seeds drawn per pit at most (the number is always written as well). */
export const MAX_DRAWN_SEEDS = { hole: 22, store: 48 } as const;
export const SEED_RADIUS = 5.2;
const SEED_SPACING = 7;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Offsets of the drawn seeds of a pit from its centre: a sunflower spiral, the same for every render. */
export function seedOffsets(count: number, kind: 'hole' | 'store'): { dx: number; dy: number }[] {
  const drawn = Math.min(count, MAX_DRAWN_SEEDS[kind]);
  const out: { dx: number; dy: number }[] = [];
  for (let k = 0; k < drawn; k++) {
    const r = drawn === 1 ? 0 : SEED_SPACING * Math.sqrt(k + 0.5);
    const a = k * GOLDEN_ANGLE + 0.6;
    out.push({ dx: r * Math.cos(a), dy: r * Math.sin(a) });
  }
  return out;
}
