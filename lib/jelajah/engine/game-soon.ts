/**
 * The "Game segera hadir" sign (Phase 22): a small board on a post next to the PROT stand of a province that has no
 * playable game yet. It is only a sign (no prompt, no button). Pure, unit-tested.
 */
import type { CircleCollider } from './collision';
import type { GameSoonDef } from '@/lib/jelajah/scenes/types';

/**
 * Board size and the height of its centre, metres; `tilt` leans the board back (radians) so it reads well from the
 * fixed 40° camera, like a lectern. The text plane has the board's size and tilt.
 */
export const GAME_SOON_BOARD = { width: 2.4, height: 1.0, centerY: 1.85, tilt: -0.35 } as const;

/** Canvas of the text texture (same aspect ratio as the board). */
export const GAME_SOON_CANVAS = { width: 480, height: 200 } as const;

/** The post blocks the player like a small tree. */
export function gameSoonCollider(g: GameSoonDef): CircleCollider {
  return { kind: 'circle', x: g.x, z: g.z, r: 0.3 };
}
