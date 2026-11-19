/**
 * Phase 22 engine options (all optional, default = the Phase 11 behaviour): water style, house stilts in the water,
 * houses without stairs, the "Game segera hadir" sign, per-scene fog, the 2d illustration look.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three';
import { distanceToCollider, sceneColliders } from '@/lib/jelajah/engine/collision';
import { GAME_SOON_BOARD, gameSoonCollider } from '@/lib/jelajah/engine/game-soon';
import { illustrationLook } from '@/lib/jelajah/engine/illustration';
import { SUMATERA_SELATAN_SCENE as base } from '@/lib/jelajah/scenes/sumatera-selatan';
import type { SceneDefinition } from '@/lib/jelajah/scenes/types';
import { buildVillageGeometry, buildWaterGeometry, WATER_Y } from '@/lib/jelajah/three/village-geometry';

const vertices = (g: BufferGeometry) => g.getAttribute('position').count;
function minY(g: BufferGeometry): number {
  const p = g.getAttribute('position');
  let m = Infinity;
  for (let i = 0; i < p.count; i += 1) m = Math.min(m, p.getY(i));
  return m;
}
function zRange(g: BufferGeometry): [number, number] {
  const p = g.getAttribute('position');
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < p.count; i += 1) {
    lo = Math.min(lo, p.getZ(i));
    hi = Math.max(hi, p.getZ(i));
  }
  return [lo, hi];
}

const variant = (patch: Partial<SceneDefinition>): SceneDefinition => ({ ...base, ...patch });

describe('water style', () => {
  it('river is the default and equals an explicit "river"', () => {
    const explicit = variant({ waterStyle: 'river' });
    expect(vertices(buildVillageGeometry(explicit))).toBe(vertices(buildVillageGeometry(base)));
    expect(vertices(buildWaterGeometry(explicit, true)!)).toBe(vertices(buildWaterGeometry(base, true)!));
  });

  it('none: no water mesh and one flat ground', () => {
    const dry = variant({ waterStyle: 'none' });
    expect(buildWaterGeometry(dry, true)).toBeNull();
    expect(buildWaterGeometry(dry, false)).toBeNull();
    expect(vertices(buildVillageGeometry(dry))).toBeLessThan(vertices(buildVillageGeometry(base)));
  });

  it('sea: water from the shore to the north edge of the ground, at the water height', () => {
    const coast = variant({ waterStyle: 'sea', river: { north: -40, south: -9, bank: 4 } });
    const sea = buildWaterGeometry(coast, true)!;
    const [lo, hi] = zRange(sea);
    expect(lo).toBeCloseTo(-coast.ground.depth / 2, 5);
    expect(hi).toBeCloseTo(-9, 5);
    expect(minY(sea)).toBeCloseTo(WATER_Y, 5);
    // Lite has no streaks.
    expect(vertices(buildWaterGeometry(coast, false)!)).toBeLessThan(vertices(sea));
  });
});

describe('houses', () => {
  const house = base.houses[0];

  it('stiltDepth lets the posts reach below the ground', () => {
    const wet = variant({ houses: [{ ...house, stiltDepth: 1.2 }] });
    const dry = variant({ houses: [house] });
    expect(minY(buildVillageGeometry(dry))).toBeGreaterThan(-0.7);
    expect(minY(buildVillageGeometry(wet))).toBeCloseTo(-1.2, 5);
  });

  it('stairs: false leaves the stairs out', () => {
    const withStairs = vertices(buildVillageGeometry(variant({ houses: [house] })));
    const without = vertices(buildVillageGeometry(variant({ houses: [{ ...house, stairs: false }] })));
    expect(without).toBe(withStairs - 8 * 36); // 6 steps + 2 stringers, 36 vertices per box
  });
});

describe('"Game segera hadir" sign', () => {
  const sign = { x: 4, z: 12, rotation: 0 };
  const scene = variant({ gameSoon: sign, centrepiece: { ...base.centrepiece!, game: undefined } });

  it('adds the post and the board to the merged mesh (3 boxes)', () => {
    const plain = variant({ centrepiece: scene.centrepiece });
    expect(vertices(buildVillageGeometry(scene))).toBe(vertices(buildVillageGeometry(plain)) + 3 * 36);
  });

  it('its post blocks the player; the collider is appended after the Phase 11 ones', () => {
    const cols = sceneColliders(scene);
    expect(cols[cols.length - 1]).toEqual(gameSoonCollider(sign));
    expect(distanceToCollider(gameSoonCollider(sign), sign.x, sign.z + 0.2)).toBe(0);
  });

  it('the board is readable at eye height and as wide as a stand is deep', () => {
    expect(GAME_SOON_BOARD.centerY - GAME_SOON_BOARD.height / 2).toBeGreaterThan(1);
    expect(GAME_SOON_BOARD.width).toBeLessThan(2.8);
  });
});

describe('2d illustration look', () => {
  it('Sumatera Selatan: river, limas roofs, palms, the open pavilion, no landmarks', () => {
    expect(illustrationLook(base)).toEqual({ water: 'river', roof: 'limas', plants: 'palm', centre: 'pavilion', landmarks: [] });
  });

  it('follows the scene data', () => {
    const look = illustrationLook(
      variant({
        waterStyle: 'none',
        centrepiece: undefined,
        decor: [
          { model: 'crops_bambooStageA', x: 0, z: 0 },
          { model: 'crops_bambooStageA', x: 1, z: 0 },
          { model: 'tree_palmTall', x: 2, z: 0 },
        ],
      }),
    );
    expect(look).toMatchObject({ water: 'none', plants: 'bamboo', centre: null });
  });
});
