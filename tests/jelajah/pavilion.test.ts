import { describe, expect, it } from 'vitest';
import { GAME_LINK_PROVINCES } from '@/lib/games/congklak/from-link';
import { pavilionCollider, sceneColliders } from '@/lib/jelajah/engine/collision';
import { gamePavilion, nearestTarget } from '@/lib/jelajah/engine/pavilion';
import { findScene, SCENES } from '@/lib/jelajah/scenes';
import { SUMATERA_SELATAN_SCENE as scene } from '@/lib/jelajah/scenes/sumatera-selatan';

const c = scene.centrepiece!;
const edge = c.size / 2 + 0.2; // collider half size

describe('game pavilion (Phase 17)', () => {
  it('the Sumatera Selatan centrepiece opens congklak', () => {
    expect(gamePavilion(scene)).toBe(c);
    expect(c.game).toBe('congklak');
  });

  it('the scenes that link to the game are exactly those with a game pavilion', () => {
    expect(SCENES.filter((s) => gamePavilion(s)).map((s) => s.slug)).toEqual([...GAME_LINK_PROVINCES]);
    for (const slug of GAME_LINK_PROVINCES) expect(findScene(slug)?.centrepiece?.game).toBe('congklak');
  });

  it('within 2 m of the pavilion: the pavilion is the target', () => {
    expect(nearestTarget([c.x, c.z + edge + 1.9], scene)).toEqual({ stand: null, pavilion: true });
    expect(nearestTarget([c.x + edge + 0.5, c.z], scene)).toEqual({ stand: null, pavilion: true });
  });

  it('beyond 2 m: no pavilion', () => {
    expect(nearestTarget([c.x, c.z + edge + 2.1], scene).pavilion).toBe(false);
    expect(nearestTarget([scene.spawn.x, scene.spawn.z], scene)).toEqual({ stand: null, pavilion: false });
  });

  it('next to a stand: the stand, not the pavilion', () => {
    const s = scene.stands[2];
    const t = nearestTarget([s.x + (c.x - s.x) * 0.2, s.z + (c.z - s.z) * 0.2], scene);
    expect(t).toEqual({ stand: 2, pavilion: false });
  });

  it('a centrepiece without a game is not a target, and the collider did not change', () => {
    const plain = { ...scene, centrepiece: { ...c, game: undefined } };
    expect(nearestTarget([c.x, c.z + edge + 1], plain).pavilion).toBe(false);
    expect(sceneColliders(scene, true)).toContainEqual(pavilionCollider(c));
    expect(pavilionCollider(c)).toEqual({ kind: 'box', x: c.x, z: c.z, halfW: edge, halfD: edge, rotation: c.rotation });
  });
});
