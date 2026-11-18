/**
 * Which PROT goes on which stand (Phase 11). Pure, unit-tested.
 *
 * PROT are assigned to the stands in order. With at most N PROT (N = number of stands) every PROT gets
 * its own stand and the remaining stands are empty ("Segera hadir"). With more than N, the first N - 1
 * stands get a PROT and the last stand becomes a notice board that lists all the others.
 */
import { distanceToCollider, standCollider } from './collision';
import type { StandDef, Vec2 } from '@/lib/jelajah/scenes/types';

export type StandContent<P> =
  | { kind: 'prot'; prot: P }
  | { kind: 'empty' }
  | { kind: 'board'; prots: P[] };

export function assignStands<P>(prots: readonly P[], standCount: number): StandContent<P>[] {
  if (standCount <= 0) return [];
  if (prots.length > standCount) {
    const direct = prots.slice(0, standCount - 1).map((prot) => ({ kind: 'prot' as const, prot }));
    return [...direct, { kind: 'board', prots: prots.slice(standCount - 1) }];
  }
  return Array.from({ length: standCount }, (_, i) =>
    i < prots.length ? { kind: 'prot' as const, prot: prots[i] } : { kind: 'empty' as const },
  );
}

/** The player may interact with a stand within this distance (metres) of the stand's footprint. */
export const INTERACT_DISTANCE = 2;

/** Index of the closest stand whose footprint is within `maxDistance` of the point, or null. */
export function nearestStand(
  point: Vec2,
  stands: readonly StandDef[],
  maxDistance = INTERACT_DISTANCE,
): number | null {
  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  stands.forEach((stand, i) => {
    const d = distanceToCollider(standCollider(stand), point[0], point[1]);
    if (d <= maxDistance && d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}
