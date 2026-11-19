/**
 * Phase 22: the engine was generalised for more provinces, and the Sumatera Selatan pilot must stay exactly
 * as it was (it is also the scene of the concept film). These fingerprints were recorded on `main` BEFORE
 * the Phase 22 changes: the merged village mesh, the water (both tiers), the colliders, the camera framing
 * points and the scene data itself must produce the very same numbers.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three';
import { spawnFramePoints } from '@/lib/jelajah/engine/camera';
import { sceneColliders } from '@/lib/jelajah/engine/collision';
import { SUMATERA_SELATAN_SCENE as scene } from '@/lib/jelajah/scenes/sumatera-selatan';
import { buildVillageGeometry, buildWaterGeometry } from '@/lib/jelajah/three/village-geometry';

function hashGeometry(g: BufferGeometry): string {
  const h = createHash('sha256');
  for (const name of ['position', 'normal', 'color']) {
    const attr = g.getAttribute(name);
    h.update(name);
    h.update(Buffer.from((attr.array as Float32Array).buffer));
  }
  return h.digest('hex').slice(0, 16);
}

const hashJson = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);

/** Recorded on main (6df8fe7) before Phase 22. */
const BEFORE = {
  village: 'fad84d04cb1373ea',
  waterFull: 'ecbca695b3e606ed',
  waterLite: 'f3bfeb6b01f4562c',
  colliders: '90c0c7cb8d6ac4d1',
  framePoints: 'c549b095e848f274',
  scene: '32ac731e448e94a7',
};

describe('Sumatera Selatan is unchanged by the Phase 22 engine changes', () => {
  const now = {
    village: hashGeometry(buildVillageGeometry(scene)),
    waterFull: hashGeometry(buildWaterGeometry(scene, true)!),
    waterLite: hashGeometry(buildWaterGeometry(scene, false)!),
    colliders: hashJson(sceneColliders(scene, true)),
    framePoints: hashJson(spawnFramePoints(scene)),
    scene: hashJson(scene),
  };

  it('same merged village mesh, water, colliders, camera framing and scene data', () => {
    expect(now).toEqual(BEFORE);
  });
});
