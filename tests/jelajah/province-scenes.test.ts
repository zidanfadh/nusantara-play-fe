/**
 * Phase 22: invariants every province scene must meet, plus the per-province specifics. New provinces are covered
 * by adding their scene to the registry.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { distanceToCollider, pavilionCollider, PLAYER_RADIUS, sceneColliders, standCollider, STAND_SIZE } from '@/lib/jelajah/engine/collision';
import { gameSoonCollider } from '@/lib/jelajah/engine/game-soon';
import { gamePavilion } from '@/lib/jelajah/engine/pavilion';
import { INTERACT_DISTANCE } from '@/lib/jelajah/engine/stands';
import { SCENES, findScene } from '@/lib/jelajah/scenes';
import type { SceneDefinition } from '@/lib/jelajah/scenes/types';
import { buildVillageGeometry, buildWaterGeometry } from '@/lib/jelajah/three/village-geometry';

const PILOT = 'sumatera-selatan';
const others = SCENES.filter((s) => s.slug !== PILOT);

/** Cells (0.25 m) the player can stand on, flood-filled from the spawn point. */
function reachable(scene: SceneDefinition) {
  const step = 0.25;
  const { minX, maxX, minZ, maxZ } = scene.walkable;
  const cols = sceneColliders(scene, true);
  const nx = Math.floor((maxX - minX) / step);
  const nz = Math.floor((maxZ - minZ) / step);
  const free = (i: number, j: number) => {
    const x = minX + i * step;
    const z = minZ + j * step;
    if (x < minX + PLAYER_RADIUS || x > maxX - PLAYER_RADIUS || z < minZ + PLAYER_RADIUS || z > maxZ - PLAYER_RADIUS) return false;
    return cols.every((c) => distanceToCollider(c, x, z) >= PLAYER_RADIUS);
  };
  const seen = new Set<number>();
  const start = [Math.round((scene.spawn.x - minX) / step), Math.round((scene.spawn.z - minZ) / step)];
  const queue = [start];
  seen.add(start[0] * 100000 + start[1]);
  const points: [number, number][] = [];
  while (queue.length) {
    const [i, j] = queue.pop()!;
    points.push([minX + i * step, minZ + j * step]);
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = i + di;
      const b = j + dj;
      const key = a * 100000 + b;
      if (a < 0 || b < 0 || a > nx || b > nz || seen.has(key) || !free(a, b)) continue;
      seen.add(key);
      queue.push([a, b]);
    }
  }
  return points;
}

describe.each(SCENES.map((s) => [s.slug, s] as const))('scene %s', (_slug, scene) => {
  it('uses the shared asset files only (no copies per province)', () => {
    expect(scene.assets).toEqual({ nature: '/jelajah/assets/v1/nature.glb', player: '/jelajah/assets/v1/player.glb' });
  });

  it('the scene file only uses `import type` (pnpm check:jelajah loads it with type stripping)', () => {
    const src = readFileSync(join(process.cwd(), 'lib', 'jelajah', 'scenes', `${scene.slug}.ts`), 'utf8');
    const imports = src.split('\n').filter((l) => /^import\b/.test(l));
    for (const line of imports) expect(line).toMatch(/^import type /);
  });

  it('the spawn point is walkable and clear of every collider', () => {
    const { spawn, walkable } = scene;
    expect(spawn.x).toBeGreaterThan(walkable.minX);
    expect(spawn.x).toBeLessThan(walkable.maxX);
    expect(spawn.z).toBeGreaterThan(walkable.minZ);
    expect(spawn.z).toBeLessThan(walkable.maxZ);
    for (const c of sceneColliders(scene)) expect(distanceToCollider(c, spawn.x, spawn.z)).toBeGreaterThan(0.5);
  });

  it('stands are inside the walkable area and do not overlap anything else', () => {
    const cols = sceneColliders(scene);
    for (const s of scene.stands) {
      expect(s.x).toBeGreaterThan(scene.walkable.minX + STAND_SIZE.width / 2);
      expect(s.x).toBeLessThan(scene.walkable.maxX - STAND_SIZE.width / 2);
      const own = standCollider(s);
      for (const c of cols.filter((c) => !(c.x === own.x && c.z === own.z))) {
        expect(distanceToCollider(c, s.x, s.z)).toBeGreaterThan(STAND_SIZE.width / 2);
      }
    }
  });

  it('every stand and the game pavilion can be reached on foot from the spawn point', () => {
    const points = reachable(scene);
    for (const s of scene.stands) {
      const col = standCollider(s);
      expect(points.some(([x, z]) => distanceToCollider(col, x, z) <= INTERACT_DISTANCE * 0.75)).toBe(true);
    }
    const pav = gamePavilion(scene);
    if (pav) {
      const col = pavilionCollider(pav);
      expect(points.some(([x, z]) => distanceToCollider(col, x, z) <= INTERACT_DISTANCE * 0.75)).toBe(true);
    }
  });

  it('the merged village mesh stays small (one draw call, well under the 100k triangle budget)', () => {
    const triangles = buildVillageGeometry(scene).getAttribute('position').count / 3;
    const water = buildWaterGeometry(scene, true);
    expect(triangles).toBeLessThan(20000);
    expect((water?.getAttribute('position').count ?? 0) / 3).toBeLessThan(200);
  });
});

describe.each(others.map((s) => [s.slug, s] as const))('new province %s', (_slug, scene) => {
  it('has 3 stands; stand 1 (the first PROT) is the one nearest to the spawn point', () => {
    expect(scene.stands).toHaveLength(3);
    const d = scene.stands.map((s) => Math.hypot(s.x - scene.spawn.x, s.z - scene.spawn.z));
    expect(d[0]).toBe(Math.min(...d));
  });

  it('a game pavilion, or the "Game segera hadir" sign close to stand 1 and clear of it', () => {
    if (gamePavilion(scene)) {
      expect(scene.gameSoon).toBeUndefined();
      return;
    }
    const g = scene.gameSoon!;
    const s = scene.stands[0];
    expect(distanceToCollider(standCollider(s), g.x, g.z)).toBeGreaterThan(0.6);
    expect(distanceToCollider(standCollider(s), g.x, g.z)).toBeLessThan(3);
    for (const c of sceneColliders(scene).filter((c) => !(c.x === g.x && c.z === g.z))) {
      expect(distanceToCollider(c, g.x, g.z)).toBeGreaterThan(gameSoonCollider(g).r);
    }
  });

  it('houses standing in the water are north of the shore; the others are on land', () => {
    for (const h of scene.houses) {
      if (h.stiltDepth) {
        expect(scene.waterStyle).toBe('sea');
        expect(h.z + h.depth / 2).toBeLessThan(scene.river.south);
        expect(h.stairs).toBe(false);
      } else if (scene.waterStyle !== 'none') {
        expect(h.z - h.depth / 2).toBeGreaterThan(scene.river.south + scene.river.bank / 2);
      }
    }
  });
});

describe('Kepulauan Riau', () => {
  const scene = findScene('kepulauan-riau')!;

  it('a coastal kampung: sea, jetties from the beach, stilt houses in the water, sampans', () => {
    expect(scene.provinsiKode).toBe('21');
    expect(scene.waterStyle).toBe('sea');
    const jetties = (scene.structures ?? []).filter((s) => s.kind === 'jetty');
    expect(jetties.length).toBeGreaterThanOrEqual(2);
    const main = jetties[0];
    expect(main.kind === 'jetty' && main.from[1]).toBeGreaterThanOrEqual(scene.river.south);
    expect(scene.houses.filter((h) => h.stiltDepth).length).toBeGreaterThanOrEqual(3);
    expect(scene.houses.every((h) => h.style === 'malay')).toBe(true);
    expect(scene.decor.filter((d) => d.model === 'canoe').length).toBeGreaterThanOrEqual(3);
  });

  it('the plaza centrepiece is the gasing arena and opens Gasing', () => {
    expect(scene.centrepiece).toMatchObject({ style: 'arena', game: 'gasing' });
    expect(gamePavilion(scene)?.game).toBe('gasing');
    // The arena's collider also covers its shade shelter (north of the ring).
    const col = pavilionCollider(scene.centrepiece!);
    expect(col.halfD).toBeGreaterThan(col.halfW);
    expect(col.z).toBeLessThan(scene.centrepiece!.z);
  });
});

describe('Aceh', () => {
  const scene = findScene('aceh')!;

  it('a dry-season village: no water, long timber stilt houses with steep decorated gables, many palms', () => {
    expect(scene.provinsiKode).toBe('11');
    expect(scene.waterStyle).toBe('none');
    expect(buildWaterGeometry(scene, true)).toBeNull();
    expect(scene.houses.every((h) => h.style === 'aceh' && h.floorHeight >= 2 && h.width > h.depth)).toBe(true);
    expect(scene.decor.filter((d) => d.model.startsWith('tree_palm') && d.collide).length).toBeGreaterThanOrEqual(8);
  });

  it('the raised open hall is the centrepiece, without a game; its collider covers the front steps', () => {
    expect(scene.centrepiece).toMatchObject({ style: 'meunasah' });
    expect(scene.centrepiece?.game).toBeUndefined();
    const col = pavilionCollider(scene.centrepiece!);
    expect(col.z).toBeGreaterThan(scene.centrepiece!.z);
    expect(col.halfD).toBeGreaterThan(col.halfW);
  });

  it('shows the "Game segera hadir" sign', () => {
    expect(scene.gameSoon).toBeDefined();
  });
});
