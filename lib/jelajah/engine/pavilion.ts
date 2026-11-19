/**
 * Interaction targets near the player (Phase 17): a PROT stand or the game pavilion (the plaza centrepiece
 * when its scene data sets `game`). Within INTERACT_DISTANCE of both, the closer one wins. Pure, unit-tested.
 */
import { distanceToCollider, pavilionCollider, standCollider } from './collision';
import { INTERACT_DISTANCE } from './stands';
import type { SceneDefinition, Vec2 } from '@/lib/jelajah/scenes/types';

export interface NearTarget {
  /** Index of the nearest stand in range, or null. */
  stand: number | null;
  /** True when the game pavilion is the nearest target in range. */
  pavilion: boolean;
}

export const NO_TARGET: NearTarget = { stand: null, pavilion: false };

/** The scene's game pavilion (the centrepiece with a `game`), or null. */
export function gamePavilion(scene: Pick<SceneDefinition, 'centrepiece'>) {
  return scene.centrepiece?.game ? scene.centrepiece : null;
}

export function nearestTarget(
  point: Vec2,
  scene: Pick<SceneDefinition, 'stands' | 'centrepiece'>,
  maxDistance = INTERACT_DISTANCE,
): NearTarget {
  let stand: number | null = null;
  let best = Number.POSITIVE_INFINITY;
  scene.stands.forEach((s, i) => {
    const d = distanceToCollider(standCollider(s), point[0], point[1]);
    if (d <= maxDistance && d < best) {
      stand = i;
      best = d;
    }
  });
  const pav = gamePavilion(scene);
  if (pav) {
    const d = distanceToCollider(pavilionCollider(pav), point[0], point[1]);
    if (d <= maxDistance && d < best) return { stand: null, pavilion: true };
  }
  return { stand, pavilion: false };
}
